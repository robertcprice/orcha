'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useWebSocket, WebSocketEvent } from '@/lib/useWebSocket';
import AgentNode from './AgentNode';
import BranchingConnector from './BranchingConnector';
import { LogEntry } from '@/app/page';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'spawning' | 'planning' | 'active' | 'complete' | 'idle' | 'error';
  parentId?: string;
  x: number;
  y: number;
  children: string[];
  depth?: number; // ✅ FIX 3: Tree depth for z-index management
  layer?: 'planning' | 'orchestrator' | 'agent'; // Layer type for positioning
  metadata?: {
    thoughts?: string;
    code?: string;
    output?: string;
    content?: string;
  };
}

interface OrchestratorCanvasProps {
  onNodeClick: (agentId: string) => void;
  onActiveNodesChange?: (nodes: Array<{ x: number; y: number }>) => void;
  onTaskComplete?: () => void;
  onLogEvent?: (agentId: string, logEntry: LogEntry) => void;
  onHasSavedState?: (hasSaved: boolean) => void; // Notify parent if saved state exists
  shouldRestore?: boolean; // Parent controls whether to restore
  onNodeMetadataChange?: (metadata: Record<string, {
    thoughts?: string;
    code?: string;
    output?: string;
    content?: string;
  }>) => void; // Notify parent about node metadata changes
  onRegisterLoadTree?: (loadFn: (taskId: string) => Promise<void>) => void; // ✅ PHASE 3: Register load tree function with parent
  onRegisterStartSequence?: (startFn: () => void) => void; // ✅ FIX: Register sequential planning start function
}

export default function OrchestratorCanvas({ onNodeClick, onActiveNodesChange, onTaskComplete, onLogEvent, onHasSavedState, shouldRestore, onNodeMetadataChange, onRegisterLoadTree, onRegisterStartSequence }: OrchestratorCanvasProps) {
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const canvasRef = useRef<HTMLDivElement>(null);
  const prevActiveNodesRef = useRef<string>('');
  const taskCompletedRef = useRef(true); // ✅ FIX: Start as true to prevent firing on initial idle state
  const onActiveNodesChangeRef = useRef(onActiveNodesChange);
  const onTaskCompleteRef = useRef(onTaskComplete);
  const onHasSavedStateRef = useRef(onHasSavedState);
  const onNodeMetadataChangeRef = useRef(onNodeMetadataChange);
  const onRegisterLoadTreeRef = useRef(onRegisterLoadTree);
  const isRestoringRef = useRef(false); // Prevent save during initial restore
  const isInitialMountRef = useRef(true); // ✅ FIX: Prevent completion callback on initial mount
  const lastNodeCountRef = useRef(0); // Track node count for auto-scroll
  const lastScrollTimeRef = useRef(0); // Debounce scrolling

  // Track the session we're monitoring (only listen to current task)
  const activeSessionIdRef = useRef<string | null>(null);
  const activePlanIdRef = useRef<string | null>(null); // ✅ FIX: Track active plan_id for enrichment events

  // ✅ REMOVED: Fake setTimeout planning animations - now using REAL WebSocket events
  // const startPlanningSequence = useCallback(() => {
  //   const sequence = [
  //     'planning-claude',
  //     'planning-chatgpt',
  //     'planning-deepseek',
  //     'planning-grok',
  //     'planning-gemini',
  //     'orchestrator-root'
  //   ];
  //
  //   console.log('🎯 Starting sequential planning activation');
  //
  //   sequence.forEach((nodeId, index) => {
  //     setTimeout(() => {
  //       setAgents(prev => {
  //         if (!prev[nodeId]) return prev;
  //         return {
  //           ...prev,
  //           [nodeId]: {
  //             ...prev[nodeId],
  //             status: 'planning'
  //           }
  //         };
  //       });
  //
  //       // After 1.5 seconds, mark as complete
  //       setTimeout(() => {
  //         setAgents(prev => {
  //           if (!prev[nodeId]) return prev;
  //           return {
  //             ...prev,
  //             [nodeId]: {
  //               ...prev[nodeId],
  //               status: 'complete'
  //             }
  //           };
  //         });
  //       }, 1500);
  //
  //       console.log(`✨ Activated: ${nodeId}`);
  //     }, index * 1000); // 1 second delay between each activation
  //   });
  // }, []);

  // ✅ REMOVED: Registration of fake planning sequence - now driven by real events
  // useEffect(() => {
  //   if (onRegisterStartSequence) {
  //     onRegisterStartSequence(startPlanningSequence);
  //   }
  // }, [startPlanningSequence, onRegisterStartSequence]);

  // WebSocket connection for real-time agent updates
  // ✅ FIXED: Wrapped in useCallback with empty deps to prevent recreation
  const handleWebSocketMessage = useCallback((event: WebSocketEvent) => {
    // ✅ FIX: Unwrap WebSocket event structure {type: "event", data: {...}}
    const eventData = (event as any).data || event;
    const { hook_event_type, payload, source_app, session_id } = eventData;

    // ✅ FIX: Filter out old events - only process events from active session
    // Don't auto-process events when no session is active (prevents replay of old events on page load)
    const isManagerEvent = hook_event_type?.includes('manager');
    const isEnrichmentEvent = hook_event_type?.includes('enrichment');
    const isEnrichmentPipelineStarted = hook_event_type === 'enrichment_pipeline_started';
    const hasActiveSession = activeSessionIdRef.current !== null;
    const isCurrentSession = session_id === activeSessionIdRef.current;

    // ✅ FIX: For enrichment events, check if it matches the active plan_id (not task_id)
    const planId = payload?.plan_id || session_id;
    const isCurrentPlan = planId === activePlanIdRef.current;

    // Only process if: 1) manager event OR 2) enrichment_pipeline_started OR 3) enrichment event from current plan OR 4) event matches active session
    if (!isManagerEvent && !isEnrichmentPipelineStarted && !hasActiveSession) {
      // No active session - only allow manager events and enrichment_pipeline_started
      return;
    }

    if (!isManagerEvent && !isEnrichmentPipelineStarted && !isCurrentSession && !(isEnrichmentEvent && isCurrentPlan)) {
      // Different session - ignore (allow manager events, enrichment_pipeline_started, and enrichment events from current plan)
      console.log(`🚫 Ignoring event from different session: ${session_id} (active: ${activeSessionIdRef.current}, plan: ${activePlanIdRef.current})`);
      return;
    }

    // Process WebSocket events for the active session

    // Handle orchestrator (manager) started
    if (hook_event_type === 'manager_started') {
      // Set this as the active session to monitor
      activeSessionIdRef.current = session_id;

      // Update the orchestrator-root status (no need to create duplicate node)
      setAgents(prev => ({
        ...prev,
        'orchestrator-root': {
          ...prev['orchestrator-root'],
          status: 'active',
        },
      }));
      return;
    }

    // ✅ FIX: Handle enrichment pipeline started - track plan_id for session filtering
    if (hook_event_type === 'enrichment_pipeline_started') {
      const planId = payload?.plan_id || session_id;
      activePlanIdRef.current = planId;
      console.log('📋 Enrichment pipeline started, tracking plan_id:', planId);

      // Transition orchestrator to planning status
      setAgents(prev => ({
        ...prev,
        'orchestrator-root': {
          ...prev['orchestrator-root'],
          status: 'planning',
        },
      }));
      return;
    }

    // ✅ FIX: Handle planning complete - transition orchestrator from planning to active
    if (hook_event_type === 'planning_complete') {
      console.log('✅ Planning complete, transitioning orchestrator to active');
      setAgents(prev => ({
        ...prev,
        'orchestrator-root': {
          ...prev['orchestrator-root'],
          status: 'active',
        },
      }));
      return;
    }

    // Handle AI enrichment request events (planning phase)
    const isEnrichmentRequest = hook_event_type === 'ai_enrichment_request' || 
                                 (event as any).type === 'ai_enrichment_request' ||
                                 payload?.type === 'ai_enrichment_request';
    
    if (isEnrichmentRequest) {
      const aiName = payload?.ai_name || payload?.aiName || payload?.ai || 'Unknown';
      const planningNodeId = `planning-${aiName?.toLowerCase()}`;
      const requestData = payload?.request_data || payload?.requestData; // ✅ Capture input data

      // AI position mapping for sequential layout
      const aiPositions: Record<string, number> = {
        'planning-claude': 10,
        'planning-chatgpt': 30,
        'planning-deepseek': 50,
        'planning-grok': 70,
        'planning-gemini': 90,
      };

      setAgents(prev => {
        // ✅ FIX: Create the planning node if it doesn't exist (dynamic creation)
        if (!prev[planningNodeId]) {
          console.log(`📝 Creating planning node: ${planningNodeId}`);
          return {
            ...prev,
            [planningNodeId]: {
              id: planningNodeId,
              name: aiName,
              type: 'planning',
              status: 'planning',
              x: aiPositions[planningNodeId] || 50,
              y: 15,
              children: [],
              depth: 0,
              layer: 'planning',
              metadata: {
                input_data: requestData,
              },
            },
          };
        }

        // Node already exists, just update status
        return {
          ...prev,
          [planningNodeId]: {
            ...prev[planningNodeId],
            status: 'planning',
            metadata: {
              ...prev[planningNodeId].metadata,
              input_data: requestData, // ✅ Store input data for "Input" tab
            },
          },
        };
      });
      return;
    }

    // Handle AI enrichment response events (planning phase)
    const isEnrichmentResponse = hook_event_type === 'ai_enrichment_response' ||
                                  (event as any).type === 'ai_enrichment_response' ||
                                  payload?.type === 'ai_enrichment_response';

    if (isEnrichmentResponse) {
      const aiName = payload?.ai_name || payload?.aiName || payload?.ai || 'Unknown';
      const planningNodeId = `planning-${aiName?.toLowerCase()}`;
      const responseData = payload?.response_data || payload?.responseData || payload?.content || payload?.message;

      if (planningNodeId && planningNodeId.startsWith('planning-')) {
        setAgents(prev => {
          if (!prev[planningNodeId]) {
            console.warn('Planning node not found:', planningNodeId);
            return prev;
          }

          // Update metadata with thoughts/content
          const metadata = {
            ...prev[planningNodeId].metadata,
            thoughts: responseData || prev[planningNodeId].metadata?.thoughts,
            content: responseData || prev[planningNodeId].metadata?.content,
          };

          return {
            ...prev,
            [planningNodeId]: {
              ...prev[planningNodeId],
              status: payload?.success !== false ? 'complete' : 'error',  // ✅ FIX: Set to 'complete' instead of 'active'
              metadata,
            },
          };
        });

        // Emit log event for planning nodes
        if (responseData && onLogEvent) {
          setTimeout(() => {
            onLogEvent(planningNodeId, {
              timestamp: new Date().toISOString(),
              role: aiName || 'Planning',
              message: typeof responseData === 'string' ? responseData : JSON.stringify(responseData, null, 2),
              metadata: payload,
            });
          }, 0);
        }
      }
      return;
    }

    // Handle orchestrator (manager) completed
    if (hook_event_type === 'manager_complete' || hook_event_type === 'manager_completed') {
      setAgents(prev => ({
        ...prev,
        'orchestrator-root': {
          ...prev['orchestrator-root'],
          status: 'complete',
        },
      }));
      return;
    }

    // Handle agent spawn events - FIXED: Listen for 'agent_spawned' from backend
    if (hook_event_type === 'agent_spawned' || hook_event_type === 'agent_started') {
      const agentId = payload.agent_id || payload.session_id || source_app;
      const parentId = payload.parent_agent_id || payload.parent_id || 'orchestrator-root';
      const agentType = payload.agent || payload.agent_type || payload.type || source_app;

      console.log('🔥 AGENT SPAWN DETECTED:', {
        agentId,
        parentId,
        agentType,
        hook_event_type
      });

      // ✅ FIXED: Use functional setState to avoid dependency on external agents variable
      setAgents(prev => {
        console.log('🔥 Current agents in state:', Object.keys(prev));

        // Use orchestrator-root as parent if session-specific orchestrator is referenced
        let updatedAgents = { ...prev };
        let actualParentId = parentId;

        if (parentId.startsWith('orchestrator:')) {
          // Redirect to orchestrator-root instead of creating duplicate
          actualParentId = 'orchestrator-root';

          // Set this as the active session
          const sessionId = parentId.replace('orchestrator:', '');
          activeSessionIdRef.current = sessionId;

          // Update the root orchestrator status
          if (updatedAgents['orchestrator-root']) {
            updatedAgents['orchestrator-root'] = {
              ...updatedAgents['orchestrator-root'],
              status: 'active',
            };
          }
        }

        const parent = updatedAgents[actualParentId];
        if (!parent) {
          console.warn('❌ Parent agent not found:', actualParentId, 'Available agents:', Object.keys(updatedAgents));
          return prev;
        }

        console.log('✅ Parent found, creating new agent node');

        // ✅ FIX 2 & 3: Calculate position with improved spacing algorithm
        const childIndex = parent.children.length;
        const siblingCount = parent.children.length;

        // ✅ IMPROVED: Adaptive horizontal spacing that works with 1-2 nodes
        let baseHorizontalSpacing: number;
        if (siblingCount === 0) {
          baseHorizontalSpacing = 0; // First child: directly below parent
        } else if (siblingCount === 1) {
          baseHorizontalSpacing = 12; // Second child: 12% offset
        } else if (siblingCount <= 3) {
          baseHorizontalSpacing = 10; // 2-3 children: 10% spacing
        } else {
          baseHorizontalSpacing = Math.min(20, 60 / siblingCount); // Many children: tighter spacing
        }

        const horizontalJitter = baseHorizontalSpacing;

        // Dynamic vertical spacing (tighter for deep trees)
        const verticalSpacing = 12;

        // STACK children vertically with fan-out horizontal distribution
        // Agent nodes start at y: 65% (below orchestrator at 40%)
        const baseY = parent.layer === 'orchestrator' ? 65 : parent.y + 15;

        // Alternate left/right: 0 -> center, 1 -> right, 2 -> left, 3 -> right...
        const jitter = childIndex === 0 ? 0 :
                       (childIndex % 2 === 1 ? 1 : -1) * Math.ceil(childIndex / 2) * horizontalJitter;

        let newX = parent.x + jitter;
        let newY = baseY + (childIndex * verticalSpacing);

        // ✅ FIX 2: Bounds checking - clamp positions to viewport
        newX = Math.max(5, Math.min(95, newX)); // Keep x between 5% and 95%
        newY = Math.max(65, Math.min(90, newY)); // Agent nodes start at 65%

        // ✅ FIX 3: Calculate tree depth for z-index
        const parentDepth = parent.depth || 0;
        const nodeDepth = parentDepth + 1;

        const newAgent: Agent = {
          id: agentId,
          name: agentType,
          type: agentType,
          status: 'spawning',
          parentId: actualParentId,
          x: newX,
          y: newY,
          children: [],
          depth: nodeDepth,
          layer: 'agent',
          metadata: {},
        };

        return {
          ...updatedAgents,
          [agentId]: newAgent,
          [actualParentId]: {
            ...updatedAgents[actualParentId],
            children: [...updatedAgents[actualParentId].children, agentId],
          },
        };
      });

      setTimeout(() => {
        setAgents(prev => {
          if (!prev[agentId]) return prev;
          return {
            ...prev,
            [agentId]: { ...prev[agentId], status: 'planning' },
          };
        });
      }, 400);
    }

    // Handle agent status updates - FIXED: Listen for 'agent_output' from backend
    if (hook_event_type === 'agent_started' || hook_event_type === 'agent_output' || hook_event_type === 'agent_active' || hook_event_type === 'agent_working') {
      const agentId = payload.agent_id || payload.session_id || source_app;

      // Emit log event if there's a message in the payload
      // ✅ FIX: Defer onLogEvent call to avoid "Cannot update component while rendering" error
      const message = payload.message || payload.output || payload.content;
      if (message && onLogEvent) {
        setTimeout(() => {
          onLogEvent(agentId, {
            timestamp: new Date().toISOString(),
            role: payload.agent || payload.agent_type || source_app,
            message: message,
            metadata: payload.meta || payload.metadata || payload
          });
        }, 0);
      }

      // Update agent metadata with output/code
      setAgents(prev => {
        if (!prev[agentId]) return prev;
        
        const currentMetadata = prev[agentId].metadata || {};
        const newMetadata = { ...currentMetadata };
        
        // Extract code if present
        if (payload.files_created || payload.code || message?.includes('```')) {
          newMetadata.code = payload.code || message || currentMetadata.code;
        }
        
        // Extract output if present
        if (payload.output || payload.result) {
          newMetadata.output = payload.output || payload.result || currentMetadata.output;
        }
        
        return {
          ...prev,
          [agentId]: { 
            ...prev[agentId], 
            status: 'active',
            metadata: newMetadata
          },
        };
      });
    }

    // Handle agent completion - FIXED: Listen for 'agent_completed' from backend
    if (hook_event_type === 'agent_completed' || hook_event_type === 'agent_complete' || hook_event_type === 'agent_finished') {
      const agentId = payload.agent_id || payload.session_id || source_app;
      setAgents(prev => {
        if (!prev[agentId]) return prev;
        return {
          ...prev,
          [agentId]: { ...prev[agentId], status: 'complete' },
        };
      });
    }
  }, []);  // ✅ FIXED: Empty dependencies - function is stable across renders

  // ✅ PHASE 3: Load tree structure from file (MOVED HERE to fix hoisting error)
  const loadTreeFromFile = useCallback(async (taskId: string) => {
    try {
      // ✅ FIX: Set restoring flag to prevent completion popup from firing
      isRestoringRef.current = true;
      taskCompletedRef.current = true; // Mark as already completed to prevent re-firing

      // Fetch task details including tree structure
      const response = await fetch(`/api/tasks/detail/${taskId}`);
      const result = await response.json();

      if (!result.ok || !result.task?.tree_structure) {
        console.warn('⚠️ No tree structure found for task:', taskId);
        isRestoringRef.current = false;
        return;
      }

      const { tree_structure } = result.task;

      // Convert TaskTreeSnapshot format back to agents
      const restoredAgents: Record<string, Agent> = {};
      Object.values(tree_structure.nodes as Record<string, any>).forEach((node: any) => {
        restoredAgents[node.id] = {
          id: node.id,
          name: node.name,
          type: node.type,
          status: node.status,
          parentId: node.parentId,
          x: node.x,
          y: node.y,
          children: node.children || [],
          depth: node.depth,
          layer: node.layer,
          metadata: node.metadata || {},
        };
      });

      // Restore agents state
      setAgents(restoredAgents);
      activeSessionIdRef.current = taskId;

      console.log('✅ Tree structure loaded:', taskId);

      // ✅ FIX: Clear restoring flag after a delay to ensure effects have run
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 1000);
    } catch (error) {
      console.error('❌ Error loading tree structure:', error);
      isRestoringRef.current = false;
    }
  }, []);

  // ✅ PHASE 3: Save tree structure to file (MOVED HERE to fix hoisting error)
  const saveTreeToFile = useCallback(async (taskId?: string, taskTitle?: string) => {
    // ✅ NEW: Try to get task info from localStorage if not provided
    const finalTaskId = taskId || localStorage.getItem('current-task-id') || activeSessionIdRef.current;
    const finalTaskTitle = taskTitle || localStorage.getItem('current-task-goal') || 'Orchestration Task';

    if (!finalTaskId) {
      console.warn('⚠️ No task ID available to save');
      return;
    }

    console.log('💾 Saving tree structure:', { taskId: finalTaskId, title: finalTaskTitle });

    try {
      // Convert agents to TaskTreeSnapshot format
      const nodes: Record<string, any> = {};
      const edges: Array<{ from: string; to: string }> = [];

      Object.values(agents).forEach(agent => {
        nodes[agent.id] = {
          id: agent.id,
          name: agent.name,
          type: agent.type,
          status: agent.status,
          parentId: agent.parentId,
          x: agent.x,
          y: agent.y,
          children: agent.children,
          depth: agent.depth,
          layer: agent.layer,
          metadata: agent.metadata || {},
        };

        // Create edges from parent-child relationships
        if (agent.parentId) {
          edges.push({
            from: agent.parentId,
            to: agent.id,
          });
        }
      });

      const treeStructure = {
        nodes,
        edges,
        layout: {
          width: 1200,
          height: 800,
        },
        capturedAt: new Date().toISOString(),
        title: finalTaskTitle,
      };

      // Save to API
      const response = await fetch('/api/tasks/save-tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: finalTaskId,
          tree_structure: treeStructure,
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log('✅ Tree structure saved:', result.path);
      } else {
        console.error('❌ Failed to save tree structure:', result.error);
      }
    } catch (error) {
      console.error('❌ Error saving tree structure:', error);
    }
  }, [agents]);

  useWebSocket({ onMessage: handleWebSocketMessage });

  // Update refs when callbacks change
  useEffect(() => {
    onActiveNodesChangeRef.current = onActiveNodesChange;
    onTaskCompleteRef.current = onTaskComplete;
    onHasSavedStateRef.current = onHasSavedState;
    onNodeMetadataChangeRef.current = onNodeMetadataChange;
    onRegisterLoadTreeRef.current = onRegisterLoadTree;
  }, [onActiveNodesChange, onTaskComplete, onHasSavedState, onNodeMetadataChange, onRegisterLoadTree]);

  // ✅ PHASE 3: Register loadTreeFromFile with parent so it can be called externally
  useEffect(() => {
    if (onRegisterLoadTreeRef.current) {
      onRegisterLoadTreeRef.current(loadTreeFromFile);
    }
  }, [loadTreeFromFile]);

  // Notify parent about metadata changes
  useEffect(() => {
    if (onNodeMetadataChangeRef.current) {
      const metadata: Record<string, {
        thoughts?: string;
        code?: string;
        output?: string;
        content?: string;
      }> = {};
      
      Object.values(agents).forEach(agent => {
        if (agent.metadata) {
          metadata[agent.id] = agent.metadata;
        }
      });
      
      onNodeMetadataChangeRef.current(metadata);
    }
  }, [agents]);

  // Track and report active nodes
  useEffect(() => {
    const activeAgents = Object.values(agents).filter(
      agent => agent.status === 'planning' || agent.status === 'active'
    );

    // Only update if active nodes actually changed
    const activeNodesKey = activeAgents.map(a => `${a.id}-${a.x}-${a.y}`).join(',');
    if (onActiveNodesChangeRef.current && activeNodesKey !== prevActiveNodesRef.current) {
      prevActiveNodesRef.current = activeNodesKey;
      onActiveNodesChangeRef.current(activeAgents.map(agent => ({ x: agent.x, y: agent.y })));
    }

    // Check if all tasks are complete (only fire once)
    const hasActiveAgents = activeAgents.length > 0;
    const hasAnyAgents = Object.keys(agents).length > 1; // More than just orchestrator

    // ✅ CRITICAL FIX: Only allow completion if we have task ID in localStorage (meaning a real task was submitted)
    const hasTaskData = !!localStorage.getItem('current-task-id');

    // ✅ FIX: Don't fire completion callback if we're restoring from saved state OR on initial mount OR no task data exists
    if (!hasActiveAgents && hasAnyAgents && hasTaskData && onTaskCompleteRef.current && !taskCompletedRef.current && !isRestoringRef.current && !isInitialMountRef.current) {
      taskCompletedRef.current = true;
      setTimeout(() => {
        // ✅ PHASE 3: Save tree structure to file when task completes
        const taskId = localStorage.getItem('current-task-id');
        const taskGoal = localStorage.getItem('current-task-goal');

        // Save tree structure with task info
        saveTreeToFile(taskId || undefined, taskGoal || undefined);

        // Call completion callback with task goal for banner display
        if (onTaskCompleteRef.current) {
          onTaskCompleteRef.current(taskGoal || undefined);
        }
      }, 2000);
    } else if (hasActiveAgents) {
      taskCompletedRef.current = false; // Reset for next task
    }
  }, [agents, saveTreeToFile]);

  // ✅ FIXED: Check for saved state on mount and notify parent
  useEffect(() => {
    // ✅ CRITICAL FIX: Clear all old task data FIRST to prevent auto-loading completed tasks
    localStorage.removeItem('orchestrator-agents');
    localStorage.removeItem('orchestrator-session-id');
    localStorage.removeItem('current-task-id');
    localStorage.removeItem('current-task-goal');
    console.log('🧹 [OrchestratorCanvas] Cleared all saved state on mount');

    // Don't notify parent of saved state since we just cleared it
    if (onHasSavedStateRef.current) {
      setTimeout(() => {
        if (onHasSavedStateRef.current) {
          onHasSavedStateRef.current(false); // No saved state
        }
      }, 0);
    }
  }, []); // ✅ FIX: Empty deps - only run once on mount

  // ❌ DISABLED: Auto-restore was causing old tasks to load on every page refresh
  // The system was loading the oldest completed task (platformer game) automatically
  // Restore only happens now through explicit user action (Resume button or loadTreeFromFile)
  /*
  useEffect(() => {
    if (shouldRestore) {
      isRestoringRef.current = true;

      try {
        const savedAgents = localStorage.getItem('orchestrator-agents');
        const savedSessionId = localStorage.getItem('orchestrator-session-id');

        if (savedAgents) {
          const parsedAgents = JSON.parse(savedAgents);
          console.log('📦 Restoring state from localStorage:', Object.keys(parsedAgents).length, 'agents');
          setAgents(parsedAgents);

          if (savedSessionId) {
            activeSessionIdRef.current = savedSessionId;
          }
        }
      } catch (error) {
        console.error('Failed to restore state from localStorage:', error);
      } finally {
        // Delay to allow restore to complete before enabling saves
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 100);
      }
    }
  }, [shouldRestore]);
  */

  // ✅ FIX 1: Save state to localStorage whenever agents change
  useEffect(() => {
    // Don't save during initial restore
    if (isRestoringRef.current) return;

    // Don't save if we only have the root node and it's idle (initial state)
    const hasRealAgents = Object.keys(agents).length > 1 ||
                          (agents['orchestrator-root']?.status !== 'idle' && agents['orchestrator-root']?.status !== undefined);

    if (hasRealAgents) {
      try {
        localStorage.setItem('orchestrator-agents', JSON.stringify(agents));
        if (activeSessionIdRef.current) {
          localStorage.setItem('orchestrator-session-id', activeSessionIdRef.current);
        }
        console.log('💾 Saved state to localStorage:', Object.keys(agents).length, 'agents');
      } catch (error) {
        console.error('Failed to save state to localStorage:', error);
      }
    }
  }, [agents]);

  // ✅ FIX 1: Clear localStorage when task completes
  const clearPersistedState = useCallback(() => {
    localStorage.removeItem('orchestrator-agents');
    localStorage.removeItem('orchestrator-session-id');
    activeSessionIdRef.current = null;
    console.log('🧹 Cleared persisted state');
  }, []);

  // ✅ FIX 2: Auto-scroll to newly added nodes
  useEffect(() => {
    const nodeCount = Object.keys(agents).length;

    // Only scroll if nodes were added (not removed or restored from localStorage)
    if (nodeCount > lastNodeCountRef.current && !isRestoringRef.current) {
      // Debounce scrolling (max once per 500ms)
      const now = Date.now();
      if (now - lastScrollTimeRef.current < 500) return;

      lastScrollTimeRef.current = now;

      // Find the newest node (highest y position)
      const newestNode = Object.values(agents).reduce((newest, agent) =>
        agent.y > newest.y ? agent : newest
      , { y: 0 } as Agent);

      if (newestNode.id && canvasRef.current) {
        // Calculate scroll position (convert percentage to pixels)
        const canvasHeight = canvasRef.current.scrollHeight;
        const scrollTarget = (newestNode.y / 100) * canvasHeight - (canvasRef.current.clientHeight / 2);

        // Smooth scroll to the new node
        canvasRef.current.scrollTo({
          top: Math.max(0, scrollTarget),
          behavior: 'smooth'
        });

        console.log(`📍 Auto-scrolled to new node at ${newestNode.y}%`);
      }
    }

    lastNodeCountRef.current = nodeCount;
  }, [agents]);

  // Initialize with orchestrator node and planning layer (always create it, even if saved state exists)
  useEffect(() => {
    // ✅ FIX: Clear ALL orchestrator-related localStorage to prevent old task popups
    // This includes completion timestamps that trigger the "Task Completed" banner
    Object.keys(localStorage).forEach(key => {
      if (key.includes('orchestrator') || key.includes('completion') || key.includes('last-completion')) {
        localStorage.removeItem(key);
      }
    });
    console.log('🧹 Cleared ALL old orchestrator data from localStorage on mount');

    // ✅ FIX: Always initialize orchestrator-root to prevent "parent not found" errors
    // The restore useEffect will overwrite this if user chooses to resume

    // ✅ FIX: Don't create planning nodes upfront - create them dynamically when request events come in
    // This ensures sequential appearance

    // Create orchestrator node at middle layer (y: 40%)
    const orchestratorNode: Agent = {
      id: 'orchestrator-root',
      name: 'Hybrid Orchestrator',
      type: 'orchestrator',
      status: 'idle',
      x: 50, // Center horizontally (percentage)
      y: 40, // ✅ FIX: Positioned to align with connection line endpoint from planning nodes
      children: [],
      depth: 1,
      layer: 'orchestrator',
    };

    setAgents({ [orchestratorNode.id]: orchestratorNode });

    // Poll for agent updates
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/hybrid-orchestrator/active');
        if (response.ok) {
          const data = await response.json();
          if (data.active_tasks && data.active_tasks.length > 0) {
            // Update orchestrator status
            setAgents(prev => ({
              ...prev,
              'orchestrator-root': {
                ...prev['orchestrator-root'],
                status: 'active',
              },
            }));
          } else if (data.active_task) {
            // Single active task (backwards compatibility)
            setAgents(prev => ({
              ...prev,
              'orchestrator-root': {
                ...prev['orchestrator-root'],
                status: 'active',
              },
            }));
          } else {
            // No active tasks, reset to idle
            setAgents(prev => ({
              ...prev,
              'orchestrator-root': {
                ...prev['orchestrator-root'],
                status: 'idle',
              },
            }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch agent updates:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // ✅ FIX: Clear initial mount flag after initialization completes
  useEffect(() => {
    // Wait 5 seconds to ensure all initialization is complete
    const timer = setTimeout(() => {
      isInitialMountRef.current = false;
      console.log('✅ Initial mount complete - completion callback now enabled');
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full overflow-auto"
      style={{ minHeight: '600px', maxHeight: '100vh' }}
    >
      {/* Scrollable content container - extends beyond viewport when needed */}
      <div className="relative w-full" style={{ minHeight: '600px', height: 'max(600px, 100%)' }}>
        {/* SVG for connections */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          {/* ✅ FIX: Peer-to-peer collaboration connections between planning nodes */}
          {(() => {
            const planningNodes = Object.values(agents)
              .filter(a => a.layer === 'planning')
              .sort((a, b) => a.x - b.x); // Sort by x position (left to right)

            return planningNodes.map((node, i) => {
              if (i < planningNodes.length - 1) {
                const nextNode = planningNodes[i + 1];
                return (
                  <BranchingConnector
                    key={`collab-${node.id}-${nextNode.id}`}
                    fromX={node.x}
                    fromY={node.y}
                    toX={nextNode.x}
                    toY={nextNode.y}
                    active={node.status === 'planning' || nextNode.status === 'planning'}
                  />
                );
              }
              return null;
            });
          })()}

          {/* ✅ FIX: Single spawn connection from orchestrator to planning layer center */}
          {(() => {
            const orchestrator = agents['orchestrator-root'];
            const planningNodes = Object.values(agents).filter(a => a.layer === 'planning');
            if (orchestrator && planningNodes.length > 0) {
              // Connect orchestrator to the center planning node (DeepSeek at x=50)
              const centerNode = planningNodes.find(n => n.x === 50) || planningNodes[Math.floor(planningNodes.length / 2)];
              return (
                <BranchingConnector
                  key="spawn-orchestrator-planning"
                  fromX={orchestrator.x}
                  fromY={orchestrator.y}
                  toX={centerNode.x}
                  toY={centerNode.y}
                  active={orchestrator.status === 'active' || centerNode.status === 'active'}
                />
              );
            }
            return null;
          })()}

          {/* Agent nodes connect to their parent */}
          {Object.values(agents).map(agent => {
            if (agent.parentId && agents[agent.parentId]) {
              return (
                <BranchingConnector
                  key={`${agent.parentId}-${agent.id}`}
                  fromX={agents[agent.parentId].x}
                  fromY={agents[agent.parentId].y}
                  toX={agent.x}
                  toY={agent.y}
                  active={agent.status === 'spawning' || agent.status === 'active'}
                />
              );
            }
            return null;
          })}
        </svg>

        {/* Agent nodes */}
        <div className="relative w-full h-full" style={{ zIndex: 2 }}>
          {Object.values(agents).map(agent => (
            <AgentNode
              key={agent.id}
              id={agent.id}
              name={agent.name}
              type={agent.type}
              status={agent.status}
              x={agent.x}
              y={agent.y}
              depth={agent.depth || 0}
              onClick={() => onNodeClick(agent.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
