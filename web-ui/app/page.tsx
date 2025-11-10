'use client';

import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import MinimalistTopBar from '@/components/orchestrator/MinimalistTopBar';
import OrchestratorContainer from '@/components/orchestrator/OrchestratorContainer';
import SplitViewTerminal from '@/components/orchestrator/SplitViewTerminal';
import CodePanel from '@/components/orchestrator/CodePanel';
import BrowserPreview from '@/components/orchestrator/BrowserPreview';
import ParticleBackground from '@/components/orchestrator/ParticleBackground';

// Log entry interface
export interface LogEntry {
  timestamp: string;
  role: string;
  message: string;
  metadata?: any;
}

// Memoized Terminal Layer - only re-renders when selectedAgent or logs change
const TerminalLayer = memo(({
  selectedAgent,
  logs,
  onClose,
  nodeMetadata
}: {
  selectedAgent: string | null;
  logs: LogEntry[];
  onClose: () => void;
  nodeMetadata?: {
    thoughts?: string;
    code?: string;
    output?: string;
    content?: string;
  };
}) => {
  if (!selectedAgent) return null;

  return (
    <SplitViewTerminal
      agentId={selectedAgent}
      logs={logs}
      onClose={onClose}
      nodeMetadata={nodeMetadata}
    />
  );
});
TerminalLayer.displayName = 'TerminalLayer';

export default function Home() {
  const { themeId } = useTheme();
  const [taskInput, setTaskInput] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTaskActive, setIsTaskActive] = useState(false);
  const [activeNodes, setActiveNodes] = useState<Array<{ x: number; y: number }>>([]);
  const [particleColor, setParticleColor] = useState<string>('');
  const [agentLogs, setAgentLogs] = useState<Record<string, LogEntry[]>>({});
  const [showCompletionBanner, setShowCompletionBanner] = useState(false); // ✅ FIX 4: Completion notification
  const [taskCompletedAt, setTaskCompletedAt] = useState<Date | null>(null); // ✅ FIX 4: Completion timestamp
  const [hasSavedTask, setHasSavedTask] = useState(false); // ✅ FIXED: Track if there's a saved task
  const [showResumeBanner, setShowResumeBanner] = useState(false); // ✅ FIXED: Show resume banner
  const [shouldRestore, setShouldRestore] = useState(false); // ✅ FIXED: Control restoration
  const [completionDismissed, setCompletionDismissed] = useState(false); // ✅ FIXED: Track dismissal
  
  // New state for code panel and browser preview
  const [showCodePanel, setShowCodePanel] = useState(false);
  const [showBrowserPreview, setShowBrowserPreview] = useState(false);
  const [nodeMetadata, setNodeMetadata] = useState<Record<string, {
    thoughts?: string;
    code?: string;
    output?: string;
    content?: string;
  }>>({});
  const [codeFiles, setCodeFiles] = useState<Array<{
    path: string;
    content: string;
    language?: string;
    lastModified?: string;
  }>>([]);
  const [selectedCodeFile, setSelectedCodeFile] = useState<string>('');
  const [loadTreeFn, setLoadTreeFn] = useState<((taskId: string) => Promise<void>) | null>(null); // ✅ FIX: Store loadTreeFromFile function
  const [startSequenceFn, setStartSequenceFn] = useState<(() => void) | null>(null); // ✅ FIX: Store startPlanningSequence function

  // ✅ NEW: Track current task for proper persistence and display
  const [currentTaskId, setCurrentTaskId] = useState<string>('');
  const [currentTaskGoal, setCurrentTaskGoal] = useState<string>('');
  const [completedTaskGoal, setCompletedTaskGoal] = useState<string>(''); // For completion banner

  // ✅ FIX: Redis health check state
  const [redisRunning, setRedisRunning] = useState<boolean>(true); // Assume running initially
  const [showRedisError, setShowRedisError] = useState(false);
  const [redisErrorMessage, setRedisErrorMessage] = useState('');

  // ✅ FIX: Callback to receive loadTreeFromFile function
  const handleRegisterLoadTree = useCallback((loadFn: (taskId: string) => Promise<void>) => {
    setLoadTreeFn(() => loadFn);
  }, []);

  // ✅ FIX: Callback to receive startPlanningSequence function
  const handleRegisterStartSequence = useCallback((startFn: () => void) => {
    setStartSequenceFn(() => startFn);
  }, []);

  // ✅ FIX: Callback to handle task click from dropdown
  const handleTaskClick = useCallback(async (taskId: string) => {
    console.log('Loading task from dropdown:', taskId);
    if (loadTreeFn) {
      await loadTreeFn(taskId);
    } else {
      console.warn('loadTreeFn not available yet');
    }
  }, [loadTreeFn]);

  // Stable callback for closing terminal
  const handleCloseTerminal = useCallback(() => {
    setSelectedAgent(null);
  }, []);

  // Handle node click - determine which panels to show
  const handleNodeClick = useCallback((agentId: string) => {
    setSelectedAgent(agentId);
    
    // Determine node type and show appropriate panels
    const isPlanningNode = agentId.startsWith('planning-');
    const isCodeAgent = agentId.includes('code') || agentId.includes('IM') || agentId.includes('CODEX') || agentId.includes('CLAUDE');
    const isWebProject = agentId.includes('web') || agentId.includes('html') || agentId.includes('frontend');
    
    // Show code panel for code-writing agents or if there are code files
    if (isCodeAgent || isPlanningNode || codeFiles.length > 0) {
      setShowCodePanel(true);
    }
    
    // Show browser preview for web projects
    if (isWebProject) {
      setShowBrowserPreview(true);
    }
  }, [codeFiles]);

  // Fetch code files when agent logs contain file information
  // ✅ CRITICAL FIX: Clear ALL old orchestrator data on page mount to prevent wrong task popups
  useEffect(() => {
    // Clear all orchestrator-related data
    localStorage.removeItem('orchestrator-agents');
    localStorage.removeItem('orchestrator-session-id');
    localStorage.removeItem('current-task-id');
    localStorage.removeItem('current-task-goal');

    // Clear any other completion-related data
    Object.keys(localStorage).forEach(key => {
      if (key.includes('completion') || key.includes('last-completion')) {
        localStorage.removeItem(key);
      }
    });
    console.log('🧹 Cleared all old orchestrator data from localStorage');
  }, []);

  useEffect(() => {
    const fetchCodeFiles = async () => {
      if (!selectedAgent) {
        setCodeFiles([]);
        return;
      }
      
      const logs = agentLogs[selectedAgent] || [];
      
      // Extract file paths from logs
      const filePaths = new Set<string>();
      logs.forEach(log => {
        // Look for file paths in messages - improved regex
        const message = log.message || '';
        
        // Pattern 1: "Created file: path/to/file.ext"
        const createdPattern = /(?:created|modified|saved to|written to|file:)\s+([^\s\n<>"']+\.(py|js|ts|tsx|jsx|html|css|json|md|txt|yml|yaml))/gi;
        let match;
        while ((match = createdPattern.exec(message)) !== null) {
          filePaths.add(match[1].trim());
        }
        
        // Pattern 2: File paths in code blocks
        const codeBlockPattern = /```[\s\S]*?```/g;
        const codeBlocks = message.match(codeBlockPattern);
        if (codeBlocks) {
          codeBlocks.forEach(block => {
            const pathMatch = block.match(/([^\s\n<>"']+\.(py|js|ts|tsx|jsx|html|css|json|md|txt|yml|yaml))/gi);
            if (pathMatch) {
              pathMatch.forEach(p => filePaths.add(p.trim()));
            }
          });
        }
        
        // Check metadata for file paths
        if (log.metadata?.file_path) {
          filePaths.add(log.metadata.file_path);
        }
        if (log.metadata?.files_created && Array.isArray(log.metadata.files_created)) {
          log.metadata.files_created.forEach((fp: string) => {
            if (typeof fp === 'string') filePaths.add(fp);
          });
        }
        if (log.metadata?.artifacts && Array.isArray(log.metadata.artifacts)) {
          log.metadata.artifacts.forEach((fp: string) => {
            if (typeof fp === 'string' && fp.match(/\.(py|js|ts|tsx|jsx|html|css|json|md|txt|yml|yaml)$/i)) {
              filePaths.add(fp);
            }
          });
        }
      });
      
      // Also check node metadata
      const nodeMeta = nodeMetadata[selectedAgent];
      if (nodeMeta?.code) {
        // Try to extract file paths from code content
        const codePathMatch = nodeMeta.code.match(/([^\s\n<>"']+\.(py|js|ts|tsx|jsx|html|css|json|md|txt|yml|yaml))/gi);
        if (codePathMatch) {
          codePathMatch.forEach(p => filePaths.add(p.trim()));
        }
      }
      
      // Fetch file contents
      if (filePaths.size > 0) {
        const files = await Promise.all(
          Array.from(filePaths).slice(0, 50).map(async (filePath) => { // Limit to 50 files
            try {
              const response = await fetch(`/api/projects/file?path=${encodeURIComponent(filePath)}`);
              if (response.ok) {
                const data = await response.json();
                return {
                  path: filePath,
                  content: data.content || '',
                  language: filePath.split('.').pop()?.toLowerCase() || 'text',
                  lastModified: data.lastModified || new Date().toISOString(),
                };
              } else if (response.status === 404) {
                // File doesn't exist yet, but we know about it - create placeholder
                return {
                  path: filePath,
                  content: `// File: ${filePath}\n// This file will be created during execution...`,
                  language: filePath.split('.').pop()?.toLowerCase() || 'text',
                  lastModified: new Date().toISOString(),
                };
              }
            } catch (error) {
              console.warn(`Failed to fetch file ${filePath}:`, error);
            }
            return null;
          })
        );
        
        const validFiles = files.filter(f => f !== null) as Array<{
          path: string;
          content: string;
          language?: string;
          lastModified?: string;
        }>;
        
        if (validFiles.length > 0) {
          setCodeFiles(validFiles);
          if (!selectedCodeFile && validFiles.length > 0) {
            // Auto-select first file
            setSelectedCodeFile(validFiles[0].path);
          }
        }
      } else {
        setCodeFiles([]);
      }
    };
    
    fetchCodeFiles();
  }, [selectedAgent, agentLogs, nodeMetadata]);

  // Stable callback for receiving log events from WebSocket
  const handleLogEvent = useCallback((agentId: string, logEntry: LogEntry) => {
    setAgentLogs(prev => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), logEntry]
    }));
  }, []);

  // ✅ FIXED: Handle saved state detection
  const handleHasSavedState = useCallback((hasSaved: boolean) => {
    setHasSavedTask(hasSaved);
    setShowResumeBanner(hasSaved);
    console.log('📦 Saved task detected:', hasSaved);
  }, []);

  // Track if this is initial page load (don't show completion popup on refresh)
  const isInitialLoadRef = useRef(true);

  // Clear the initial load flag after component mounts
  useEffect(() => {
    // ✅ FIX: Wait 5 seconds (longer than the 2s completion callback delay in OrchestratorCanvas)
    // This ensures we suppress popups for old completed tasks that are in localStorage
    const timer = setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // ✅ FIXED: Handle task completion - only show popup for tasks that complete during THIS session
  const handleTaskComplete = useCallback((taskGoal?: string) => {
    setIsTaskActive(false);

    // ✅ FIX: Only show completion popup if this task completed AFTER page loaded
    // This prevents showing popups for old tasks on page refresh
    if (isInitialLoadRef.current) {
      console.log('✅ Task completed (popup suppressed - task finished before page load)');
      return;
    }

    // ✅ NEW: Store the completed task goal for banner display
    if (taskGoal) {
      setCompletedTaskGoal(taskGoal);
    } else if (currentTaskGoal) {
      setCompletedTaskGoal(currentTaskGoal);
    }

    setShowCompletionBanner(true);
    setTaskCompletedAt(new Date());
    setCompletionDismissed(false);
    console.log('🎉 Task completed:', taskGoal || currentTaskGoal);

    // Auto-hide banner after 10 seconds
    setTimeout(() => {
      setShowCompletionBanner(false);
    }, 10000);
  }, [currentTaskGoal]);

  // ✅ FIXED: Dismiss completion banner with persistence
  const handleDismissCompletion = useCallback(() => {
    const sessionId = localStorage.getItem('orchestrator-session-id');
    if (sessionId) {
      // Store dismissal timestamp to prevent showing again
      localStorage.setItem(`last-completion-${sessionId}`, Date.now().toString());
    }
    setShowCompletionBanner(false);
    setCompletionDismissed(true);
  }, []);

  // ✅ FIXED: Resume last task
  const handleResumeTask = useCallback(async () => {
    setShowResumeBanner(false);

    // ✅ FIX: Load the most recent completed task from file instead of localStorage
    try {
      // Fetch list of completed tasks
      const response = await fetch('/api/tasks/list');
      const data = await response.json();

      if (data.ok && data.tasks && data.tasks.length > 0) {
        // Find most recent task (sort by created_at descending)
        const sortedTasks = [...data.tasks].sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA; // Most recent first
        });

        const mostRecentTask = sortedTasks[0];
        console.log('📂 Loading most recent task:', mostRecentTask.task_id);

        // Call loadTreeFromFile if available
        if (loadTreeFn) {
          await loadTreeFn(mostRecentTask.task_id);
        } else {
          console.warn('⚠️ loadTreeFromFile not available yet');
          // Fallback to localStorage restore
          setShouldRestore(true);
        }
      } else {
        console.warn('⚠️ No completed tasks found, restoring from localStorage');
        // Fallback to localStorage restore
        setShouldRestore(true);
      }
    } catch (error) {
      console.error('❌ Error loading recent task:', error);
      // Fallback to localStorage restore
      setShouldRestore(true);
    }
  }, [loadTreeFn]);

  // ✅ FIXED: Discard saved task
  const handleDiscardTask = useCallback(() => {
    localStorage.removeItem('orchestrator-agents');
    localStorage.removeItem('orchestrator-session-id');
    setShowResumeBanner(false);
    setHasSavedTask(false);
  }, []);

  // ✅ FIX 4: Clear completed task and reset state
  const handleClearTask = useCallback(() => {
    // Clear localStorage
    localStorage.removeItem('orchestrator-agents');
    localStorage.removeItem('orchestrator-session-id');

    // Clear all completion dismissal flags
    const sessionId = localStorage.getItem('orchestrator-session-id');
    if (sessionId) {
      localStorage.removeItem(`completion-dismissed-${sessionId}`);
    }

    // Reset local state
    setShowCompletionBanner(false);
    setTaskCompletedAt(null);
    setAgentLogs({});
    setSelectedAgent(null);
    setCompletionDismissed(false);
    setHasSavedTask(false);
    setShowResumeBanner(false);
    setShouldRestore(false);

    // Reload page to reset canvas
    window.location.reload();
  }, []);

  // Load custom particle color from localStorage or use theme default
  useEffect(() => {
    const useCustom = localStorage.getItem('particle-use-custom') === 'true';
    const customColor = localStorage.getItem('particle-custom-color');

    if (useCustom && customColor) {
      setParticleColor(customColor);
    } else {
      // Theme-based particle colors: black for light mode, white for dark mode
      setParticleColor(themeId === 'minimalist' ? '0,0,0' : '255,255,255');
    }
  }, [themeId]);

  // ✅ FIX: Check Redis health on mount - API will auto-start if needed
  useEffect(() => {
    const checkRedisHealth = async () => {
      try {
        const response = await fetch('/api/health/redis');
        const data = await response.json();

        if (data.isRunning) {
          // Redis is running (either already was or was auto-started)
          console.log('✅ Redis is running' + (data.autoStarted ? ' (auto-started)' : ''));
          setRedisRunning(true);
          setShowRedisError(false);
          setRedisErrorMessage('');
        } else {
          // Redis failed to start
          console.error('❌ Redis not running:', data.message);
          setRedisRunning(false);
          setRedisErrorMessage(data.message || 'Redis server could not be started');
          setShowRedisError(true);
        }
      } catch (error) {
        console.error('❌ Failed to check Redis health:', error);
        setRedisRunning(false);
        setRedisErrorMessage('Failed to connect to health check API');
        setShowRedisError(true);
      }
    };

    checkRedisHealth();
  }, []);

  // ✅ FIX: Check WebSocket health and auto-start server if needed
  useEffect(() => {
    const checkWebSocketHealth = async () => {
      try {
        // Check if WebSocket server is responding
        const response = await fetch('http://localhost:4000/events');
        if (!response.ok) {
          console.warn('⚠️ WebSocket server not responding, attempting to start...');

          // Try to start WebSocket server via API
          const startResponse = await fetch('/api/health/websocket/start', { method: 'POST' });
          if (startResponse.ok) {
            console.log('✅ WebSocket server started');
          } else {
            console.error('❌ Failed to start WebSocket server');
          }
        }
      } catch (error) {
        console.warn('⚠️ WebSocket server not reachable, attempting to start...');
        try {
          const startResponse = await fetch('/api/health/websocket/start', { method: 'POST' });
          if (startResponse.ok) {
            console.log('✅ WebSocket server started');
          }
        } catch (e) {
          console.error('❌ Failed to start WebSocket server:', e);
        }
      }
    };

    checkWebSocketHealth();

    // Re-check every 30 seconds
    const interval = setInterval(checkWebSocketHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) return;

    // ✅ FIX: Check if Redis is running before submitting, try to start if not
    if (!redisRunning) {
      console.log('⚠️ Redis not running, attempting to start before task submission...');
      try {
        const healthResponse = await fetch('/api/health/redis');
        const healthData = await healthResponse.json();

        if (!healthData.isRunning) {
          setRedisErrorMessage('Cannot submit task: Redis server could not be started. Please start it manually with: brew services start redis');
          setShowRedisError(true);
          return;
        }

        // Redis started successfully
        setRedisRunning(true);
        setShowRedisError(false);
      } catch (error) {
        setRedisErrorMessage('Cannot submit task: Failed to check Redis status');
        setShowRedisError(true);
        return;
      }
    }

    setIsSubmitting(true);
    setIsTaskActive(true);

    try {
      const response = await fetch('/api/hybrid-orchestrator/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: taskInput,
          context: {},
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Task submitted:', data);

        // ✅ NEW: Capture and store task information for persistence
        if (data.task_id) {
          setCurrentTaskId(data.task_id);
          setCurrentTaskGoal(taskInput);

          // Store in localStorage for saveTreeToFile to use
          localStorage.setItem('current-task-id', data.task_id);
          localStorage.setItem('current-task-goal', taskInput);

          console.log('📝 Task info stored:', { taskId: data.task_id, goal: taskInput });
        }

        setTaskInput('');

        // ✅ FIX: Start sequential planning activation
        if (startSequenceFn) {
          startSequenceFn();
        }
      } else {
        console.error('Task submission failed:', response.statusText);
        setIsTaskActive(false);

        // ✅ FIX: Show error if submission failed
        setRedisErrorMessage(`Task submission failed: ${response.statusText}`);
        setShowRedisError(true);
      }
    } catch (error) {
      console.error('Failed to submit task:', error);
      setIsTaskActive(false);

      // ✅ FIX: Show error if submission failed
      setRedisErrorMessage(`Failed to submit task: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowRedisError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Particle Background - Breathes and reacts to activity */}
      <ParticleBackground isActive={isTaskActive} activeNodes={activeNodes} particleColor={particleColor} />

      {/* Top Bar */}
      <MinimalistTopBar onTaskClick={handleTaskClick} />

      {/* Main Content Area */}
      <div 
        className="flex flex-col items-center justify-start pt-20 px-8 h-full relative z-10 transition-all duration-300"
        style={{
          marginLeft: showCodePanel ? '35%' : '0',
          marginRight: selectedAgent ? (showCodePanel ? '40%' : '40%') : '0',
        }}
      >
        {/* Task Input - Minimalist, blends into background */}
        <form onSubmit={handleTaskSubmit} className="w-full max-w-3xl mb-8">
          <input
            type="text"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            placeholder="Describe your task..."
            disabled={isSubmitting}
            className="w-full px-6 py-4 text-lg bg-transparent focus:outline-none transition-all duration-300"
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-primary)',
            }}
            autoFocus
          />
        </form>

        {/* Orchestrator Visualization - Full screen canvas */}
        <div className="flex-1 w-full relative">
          <OrchestratorContainer
            onNodeClick={handleNodeClick}
            onActiveNodesChange={setActiveNodes}
            onTaskComplete={handleTaskComplete}
            onLogEvent={handleLogEvent}
            onHasSavedState={handleHasSavedState}
            shouldRestore={shouldRestore}
            onNodeMetadataChange={setNodeMetadata}
            onRegisterLoadTree={handleRegisterLoadTree}
            onRegisterStartSequence={handleRegisterStartSequence}
          />
        </div>

        {/* ✅ FIXED: Resume Last Task Banner */}
        {showResumeBanner && !shouldRestore && (
          <div
            className="fixed top-24 left-1/2 transform -translate-x-1/2 px-8 py-4 rounded-lg shadow-2xl animate-[slide-down_0.3s_ease-out] z-50"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(37, 99, 235, 0.95))',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(59, 130, 246, 0.5)',
            }}
          >
            <div className="flex items-center gap-4">
              <div className="text-2xl">📋</div>
              <div>
                <div className="text-white font-bold text-lg">Previous Task Detected</div>
                <div className="text-white/80 text-sm">
                  You have an unfinished task from your last session
                </div>
              </div>
              <div className="ml-4 flex gap-2">
                <button
                  onClick={handleResumeTask}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded transition-colors font-medium"
                >
                  Resume Task
                </button>
                <button
                  onClick={handleDiscardTask}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                >
                  Start Fresh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ FIX 4: Completion Banner */}
        {showCompletionBanner && (
          <div
            className="fixed top-24 left-1/2 transform -translate-x-1/2 px-8 py-4 rounded-lg shadow-2xl animate-[slide-down_0.3s_ease-out] z-50"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(22, 163, 74, 0.95))',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(34, 197, 94, 0.5)',
            }}
          >
            <div className="flex items-center gap-4">
              <div className="text-2xl">🎉</div>
              <div>
                <div className="text-white font-bold text-lg">
                  {completedTaskGoal ? `"${completedTaskGoal}"` : 'Task'} Completed Successfully!
                </div>
                <div className="text-white/80 text-sm">
                  All agents have finished execution{taskCompletedAt && ` at ${taskCompletedAt.toLocaleTimeString()}`}
                </div>
              </div>
              <div className="ml-4 flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      // Try to detect and open created output
                      const response = await fetch('/api/projects/results');
                      if (response.ok) {
                        const result = await response.json();
                        if (result.url) {
                          // Open the result in a new window
                          window.open(result.url, '_blank');
                        } else {
                          // Fallback to showing orchestrator logs
                          setSelectedAgent('orchestrator-root');
                        }
                      } else {
                        // Fallback to showing orchestrator logs
                        setSelectedAgent('orchestrator-root');
                      }
                    } catch (error) {
                      // Fallback to showing orchestrator logs
                      console.error('Failed to open results:', error);
                      setSelectedAgent('orchestrator-root');
                    }
                  }}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded transition-colors"
                >
                  View Results
                </button>
                <button
                  onClick={handleClearTask}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded transition-colors"
                >
                  Clear & Start New
                </button>
                <button
                  onClick={handleDismissCompletion}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ FIX: Redis Error Banner */}
        {showRedisError && (
          <div
            className="fixed top-24 left-1/2 transform -translate-x-1/2 px-8 py-4 rounded-lg shadow-2xl animate-[slide-down_0.3s_ease-out] z-50"
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95))',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(239, 68, 68, 0.5)',
            }}
          >
            <div className="flex items-center gap-4">
              <div className="text-2xl">⚠️</div>
              <div>
                <div className="text-white font-bold text-lg">Redis Server Error</div>
                <div className="text-white/80 text-sm">
                  {redisErrorMessage}
                </div>
              </div>
              <div className="ml-4 flex gap-2">
                <button
                  onClick={async () => {
                    setShowRedisError(false);
                    // Retry Redis start
                    const response = await fetch('/api/health/redis/start', { method: 'POST' });
                    const data = await response.json();
                    if (data.success) {
                      setRedisRunning(true);
                      setShowRedisError(false);
                    } else {
                      setRedisErrorMessage(data.message || 'Failed to start Redis');
                      setShowRedisError(true);
                    }
                  }}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded transition-colors"
                >
                  Retry Start
                </button>
                <button
                  onClick={() => setShowRedisError(false)}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Terminal Layer - Separate from canvas, memoized to prevent render loop */}
      {selectedAgent && (
        <TerminalLayer
          selectedAgent={selectedAgent}
          logs={agentLogs[selectedAgent] || []}
          onClose={handleCloseTerminal}
          nodeMetadata={nodeMetadata[selectedAgent]}
        />
      )}

      {/* Code Panel */}
      {showCodePanel && (
        <CodePanel
          files={codeFiles}
          onClose={() => setShowCodePanel(false)}
          selectedFile={selectedCodeFile}
          onFileSelect={setSelectedCodeFile}
        />
      )}

      {/* Browser Preview */}
      {showBrowserPreview && (
        <BrowserPreview
          onClose={() => setShowBrowserPreview(false)}
          projectPath={selectedAgent ? `projects/${selectedAgent}` : undefined}
        />
      )}
    </div>
  );
}
