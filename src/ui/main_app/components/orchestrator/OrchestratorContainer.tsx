'use client';

import { useState, useCallback } from 'react';
import OrchestratorCanvas from './OrchestratorCanvas';

interface OrchestratorContainerProps {
  onNodeClick: (agentId: string) => void;
  onActiveNodesChange?: (nodes: Array<{ x: number; y: number }>) => void;
  onTaskComplete?: () => void;
  onLogEvent?: (agentId: string, logEntry: any) => void;
  onHasSavedState?: (hasSaved: boolean) => void;
  shouldRestore?: boolean;
  onNodeMetadataChange?: (metadata: Record<string, any>) => void;
  onRegisterLoadTree?: (loadFn: (taskId: string) => Promise<void>) => void; // ✅ FIX: Forward to parent
  onRegisterStartSequence?: (startFn: () => void) => void; // ✅ FIX: Forward sequential start to parent
}

/**
 * OrchestratorContainer
 *
 * Manages the orchestrator canvas and task history integration.
 * Handles loading saved task trees from the history dropdown.
 */
export default function OrchestratorContainer({
  onNodeClick,
  onActiveNodesChange,
  onTaskComplete,
  onLogEvent,
  onHasSavedState,
  shouldRestore,
  onNodeMetadataChange,
  onRegisterLoadTree, // ✅ FIX: Accept from parent (page.tsx)
  onRegisterStartSequence, // ✅ FIX: Accept from parent (page.tsx)
}: OrchestratorContainerProps) {
  // ✅ PHASE 3: Store reference to loadTreeFromFile function from canvas
  const [loadTreeFn, setLoadTreeFn] = useState<((taskId: string) => Promise<void>) | null>(null);

  // ✅ PHASE 3 + FIX: Register the loadTreeFromFile function when canvas mounts and forward to parent
  const handleRegisterLoadTree = useCallback((loadFn: (taskId: string) => Promise<void>) => {
    setLoadTreeFn(() => loadFn);
    // ✅ FIX: Also forward to parent (page.tsx) so it can use it in handleResumeTask
    if (onRegisterLoadTree) {
      onRegisterLoadTree(loadFn);
    }
  }, [onRegisterLoadTree]);

  // ✅ PHASE 3: Handle task history click - load saved tree visualization
  const handleTaskHistoryClick = useCallback((taskId: string) => {
    if (loadTreeFn) {
      console.log('📂 Loading task tree:', taskId);
      loadTreeFn(taskId);
    } else {
      console.warn('⚠️ loadTreeFromFile not yet registered');
    }
  }, [loadTreeFn]);

  return (
    <div className="relative w-full h-full">
      {/* Orchestrator Canvas */}
      <OrchestratorCanvas
        onNodeClick={onNodeClick}
        onActiveNodesChange={onActiveNodesChange}
        onTaskComplete={onTaskComplete}
        onLogEvent={onLogEvent}
        onHasSavedState={onHasSavedState}
        shouldRestore={shouldRestore}
        onNodeMetadataChange={onNodeMetadataChange}
        onRegisterLoadTree={handleRegisterLoadTree}
        onRegisterStartSequence={onRegisterStartSequence}
      />
    </div>
  );
}
