/**
 * TaskOrchestrationPanel - Unified Task Submission Component
 *
 * Consolidates:
 * - HybridOrchestratorPanel
 * - DirectClaudePanel
 * - TaskSubmissionForm
 *
 * Supports submitting tasks to different agents with the 6-phase orchestration workflow.
 */
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, CheckCircle2, XCircle, Clock, Sparkles, Loader2, Zap, Brain, Terminal } from 'lucide-react';
import { GlassPanel, GlassInput, BrutalistButton, PhaseIndicator, designTokens } from '@/components/design-system';
import type { OrchestrationPhase } from '@/components/design-system';

type AgentType = 'hybrid' | 'claude' | 'codex' | 'gemini' | 'chatgpt';

interface TaskStatus {
  task_id: string;
  title: string;
  task?: string;
  goal?: string;
  claude_plan?: string;
  agent: AgentType;
  status: 'pending' | 'planning' | 'executing' | 'reviewing' | 'completed' | 'failed';
  currentPhase?: OrchestrationPhase;
  completedPhases?: OrchestrationPhase[];
  created_at: string;
  updated_at: string;
  result?: any;
  error?: string;
  progress?: number;
}

interface TerminalLog {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface TaskOrchestrationPanelProps {
  defaultAgent?: AgentType;
  showTerminal?: boolean;
  showPhaseIndicator?: boolean;
  compactMode?: boolean;
  className?: string;
}

export const TaskOrchestrationPanel: React.FC<TaskOrchestrationPanelProps> = ({
  defaultAgent = 'hybrid',
  showTerminal = true,
  showPhaseIndicator = true,
  compactMode = false,
  className = '',
}) => {
  const [selectedAgent, setSelectedAgent] = useState<AgentType>(defaultAgent);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [claudePlan, setClaudePlan] = useState('');
  const [currentTask, setCurrentTask] = useState<TaskStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Agent configurations
  const agents = [
    {
      type: 'hybrid' as AgentType,
      name: 'Hybrid Orchestrator',
      icon: <Sparkles className="w-4 h-4" />,
      description: 'Auto-planning + Multi-AI workflow',
      color: designTokens.colors.accent.purple,
      requiresPlan: false,
    },
    {
      type: 'claude' as AgentType,
      name: 'Claude Code',
      icon: <Brain className="w-4 h-4" />,
      description: 'Direct Claude execution',
      color: designTokens.colors.accent.cyan,
      requiresPlan: false,
    },
    {
      type: 'codex' as AgentType,
      name: 'Codex (MCP)',
      icon: <Terminal className="w-4 h-4" />,
      description: 'Python code execution',
      color: designTokens.colors.semantic.success,
      requiresPlan: false,
    },
    {
      type: 'gemini' as AgentType,
      name: 'Gemini',
      icon: <Zap className="w-4 h-4" />,
      description: 'Documentation & review',
      color: designTokens.colors.accent.yellow,
      requiresPlan: false,
    },
    {
      type: 'chatgpt' as AgentType,
      name: 'ChatGPT',
      icon: <Bot className="w-4 h-4" />,
      description: 'Research & enrichment',
      color: designTokens.colors.accent.green,
      requiresPlan: false,
    },
  ];

  const selectedAgentConfig = agents.find(a => a.type === selectedAgent)!;

  // Check for active task on mount
  useEffect(() => {
    const checkForActiveTask = async () => {
      try {
        const endpoint = selectedAgent === 'hybrid'
          ? '/api/hybrid-orchestrator/active'
          : '/api/orchestrator/active';

        const response = await fetch(endpoint);
        if (response.ok) {
          const data = await response.json();
          if (data.active_task || data.task) {
            const task = data.active_task || data.task;
            setCurrentTask({
              task_id: task.task_id,
              title: task.title || task.goal || task.task || 'Unnamed Task',
              task: task.task,
              goal: task.goal,
              claude_plan: task.claude_plan,
              agent: selectedAgent,
              status: task.status,
              created_at: task.created_at,
              updated_at: task.updated_at,
              result: task.result || task.execution_result,
              error: task.error,
            });
          }
        }
      } catch (error) {
        console.error('Error checking for active task:', error);
      }
    };

    checkForActiveTask();
  }, [selectedAgent]);

  // Poll for task status
  useEffect(() => {
    if (!currentTask || currentTask.status === 'completed' || currentTask.status === 'failed') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const endpoint = selectedAgent === 'hybrid'
          ? `/api/hybrid-orchestrator/status/${currentTask.task_id}`
          : `/api/orchestrator/status/${currentTask.task_id}`;

        const response = await fetch(endpoint);
        if (response.ok) {
          const updatedTask = await response.json();
          setCurrentTask(prev => ({
            ...prev!,
            ...updatedTask,
            agent: selectedAgent,
            title: prev!.title,
          }));
        }
      } catch (error) {
        console.error('Error polling task status:', error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [currentTask, selectedAgent]);

  // Poll for terminal logs
  useEffect(() => {
    if (!currentTask || !showTerminal) {
      setTerminalLogs([]);
      return;
    }

    const fetchTerminalLogs = async () => {
      try {
        const response = await fetch(`/api/hybrid-orchestrator/terminal/${currentTask.task_id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.logs) {
            setTerminalLogs(data.logs);
          }
        }
      } catch (error) {
        // Terminal logs are optional, don't show error
      }
    };

    fetchTerminalLogs();
    const interval = setInterval(fetchTerminalLogs, 3000);
    return () => clearInterval(interval);
  }, [currentTask, showTerminal]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  // Handle task submission
  const handleSubmit = async () => {
    if (!taskTitle.trim() && !taskDescription.trim()) {
      setError('Please enter a task title or description');
      return;
    }

    // Claude plan is now optional - will be auto-generated if not provided

    setError(null);
    setIsSubmitting(true);

    try {
      let endpoint = '';
      let body = {};

      if (selectedAgent === 'hybrid') {
        endpoint = '/api/hybrid-orchestrator/submit';
        body = {
          goal: taskTitle.trim() || taskDescription.trim(),
          claude_plan: claudePlan.trim(),
        };
      } else {
        endpoint = '/api/orchestrator/submit';
        body = {
          task: taskDescription.trim() || taskTitle.trim(),
          agent: selectedAgent,
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const result = await response.json();

        setCurrentTask({
          task_id: result.task_id,
          title: taskTitle || taskDescription.substring(0, 50),
          task: taskDescription,
          goal: taskTitle,
          claude_plan: claudePlan,
          agent: selectedAgent,
          status: 'planning',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // Clear form
        setTaskTitle('');
        setTaskDescription('');
        if (selectedAgent !== 'hybrid') {
          setClaudePlan('');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to submit task');
      }
    } catch (error) {
      console.error('Error submitting task:', error);
      setError('Network error - failed to submit task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get status color
  const getStatusColor = (status: TaskStatus['status']) => {
    switch (status) {
      case 'planning': return designTokens.colors.accent.purple;
      case 'executing': return designTokens.colors.accent.cyan;
      case 'reviewing': return designTokens.colors.accent.yellow;
      case 'completed': return designTokens.colors.semantic.success;
      case 'failed': return designTokens.colors.semantic.error;
      default: return designTokens.colors.text.tertiary;
    }
  };

  // Get status icon
  const getStatusIcon = (status: TaskStatus['status']) => {
    switch (status) {
      case 'planning':
      case 'executing':
      case 'reviewing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Render agent selector
  const renderAgentSelector = () => (
    <div style={{ marginBottom: designTokens.spacing.lg }}>
      <div style={{
        color: designTokens.colors.text.secondary,
        fontSize: designTokens.typography.sizes.sm,
        fontFamily: designTokens.typography.fonts.mono,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: designTokens.spacing.sm,
      }}>
        Select Agent
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: compactMode ? '1fr 1fr' : 'repeat(auto-fit, minmax(150px, 1fr))', gap: designTokens.spacing.sm }}>
        {agents.map((agent) => (
          <div
            key={agent.type}
            onClick={() => setSelectedAgent(agent.type)}
            style={{
              padding: designTokens.spacing.md,
              border: `${designTokens.borders.width.medium} ${designTokens.borders.style} ${
                selectedAgent === agent.type ? agent.color : designTokens.colors.structure.border.tertiary
              }`,
              backgroundColor: selectedAgent === agent.type
                ? `${agent.color}10`
                : designTokens.colors.structure.bg.tertiary,
              cursor: 'pointer',
              transition: designTokens.transitions.normal,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.xs, marginBottom: designTokens.spacing.xs }}>
              <div style={{ color: agent.color }}>{agent.icon}</div>
              <div style={{
                color: selectedAgent === agent.type ? agent.color : designTokens.colors.text.primary,
                fontFamily: designTokens.typography.fonts.header,
                fontWeight: designTokens.typography.weights.semibold,
                fontSize: compactMode ? designTokens.typography.sizes.sm : designTokens.typography.sizes.base,
              }}>
                {agent.name}
              </div>
            </div>
            {!compactMode && (
              <div style={{
                color: designTokens.colors.text.tertiary,
                fontSize: designTokens.typography.sizes.xs,
                fontFamily: designTokens.typography.fonts.mono,
              }}>
                {agent.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // Render task form
  const renderTaskForm = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: designTokens.spacing.md }}>
      <GlassInput
        label="Task Title"
        value={taskTitle}
        onChange={(e) => setTaskTitle(e.target.value)}
        placeholder="e.g., Build a user authentication system"
        disabled={isSubmitting || !!currentTask}
        fullWidth
      />

      <div>
        <div style={{
          color: designTokens.colors.text.secondary,
          fontSize: designTokens.typography.sizes.sm,
          fontFamily: designTokens.typography.fonts.mono,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: designTokens.spacing.sm,
        }}>
          Task Description
        </div>
        <textarea
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
          placeholder={`Describe what you want ${selectedAgentConfig.name} to accomplish...`}
          disabled={isSubmitting || !!currentTask}
          rows={compactMode ? 3 : 4}
          style={{
            width: '100%',
            padding: designTokens.spacing.md,
            backgroundColor: designTokens.colors.glass.dark,
            backdropFilter: designTokens.glass.blur.md,
            WebkitBackdropFilter: designTokens.glass.blur.md,
            border: `${designTokens.borders.width.medium} ${designTokens.borders.style} ${designTokens.colors.structure.border.secondary}`,
            color: designTokens.colors.text.primary,
            fontFamily: designTokens.typography.fonts.mono,
            fontSize: designTokens.typography.sizes.sm,
            resize: 'vertical',
          }}
        />
      </div>

      {selectedAgentConfig.requiresPlan && (
        <div>
          <div style={{
            color: designTokens.colors.text.secondary,
            fontSize: designTokens.typography.sizes.sm,
            fontFamily: designTokens.typography.fonts.mono,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: designTokens.spacing.sm,
          }}>
            Claude Plan (Optional - Auto-generated if blank)
          </div>
          <textarea
            value={claudePlan}
            onChange={(e) => setClaudePlan(e.target.value)}
            placeholder="Leave blank to auto-generate plan via Claude CLI..."
            disabled={isSubmitting || !!currentTask}
            rows={compactMode ? 4 : 6}
            style={{
              width: '100%',
              padding: designTokens.spacing.md,
              backgroundColor: designTokens.colors.glass.dark,
              backdropFilter: designTokens.glass.blur.md,
              WebkitBackdropFilter: designTokens.glass.blur.md,
              border: `${designTokens.borders.width.medium} ${designTokens.borders.style} ${designTokens.colors.accent.purple}`,
              color: designTokens.colors.text.primary,
              fontFamily: designTokens.typography.fonts.mono,
              fontSize: designTokens.typography.sizes.sm,
              resize: 'vertical',
            }}
          />
        </div>
      )}

      {error && (
        <div style={{
          padding: designTokens.spacing.md,
          border: `${designTokens.borders.width.medium} ${designTokens.borders.style} ${designTokens.colors.semantic.error}`,
          backgroundColor: `${designTokens.colors.semantic.error}10`,
          color: designTokens.colors.semantic.error,
          fontFamily: designTokens.typography.fonts.mono,
          fontSize: designTokens.typography.sizes.sm,
        }}>
          {error}
        </div>
      )}

      <BrutalistButton
        variant="accent"
        size={compactMode ? 'sm' : 'md'}
        onClick={handleSubmit}
        disabled={isSubmitting || !!currentTask}
        loading={isSubmitting}
        fullWidth
      >
        <Send className="w-4 h-4" />
        <span>Submit to {selectedAgentConfig.name}</span>
      </BrutalistButton>
    </div>
  );

  // Render task status
  const renderTaskStatus = () => {
    if (!currentTask) return null;

    return (
      <GlassPanel
        bordered
        borderColor={getStatusColor(currentTask.status)}
        style={{ padding: designTokens.spacing.lg }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: designTokens.spacing.md }}>
          <div>
            <div style={{
              color: designTokens.colors.text.primary,
              fontSize: designTokens.typography.sizes.lg,
              fontFamily: designTokens.typography.fonts.header,
              fontWeight: designTokens.typography.weights.bold,
            }}>
              {currentTask.title}
            </div>
            <div style={{
              color: designTokens.colors.text.tertiary,
              fontSize: designTokens.typography.sizes.xs,
              fontFamily: designTokens.typography.fonts.mono,
            }}>
              Task ID: {currentTask.task_id}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.sm }}>
            <div style={{ color: getStatusColor(currentTask.status) }}>
              {getStatusIcon(currentTask.status)}
            </div>
            <div style={{
              padding: `${designTokens.spacing.xs} ${designTokens.spacing.sm}`,
              border: `${designTokens.borders.width.thin} ${designTokens.borders.style} ${getStatusColor(currentTask.status)}`,
              color: getStatusColor(currentTask.status),
              fontSize: designTokens.typography.sizes.xs,
              fontFamily: designTokens.typography.fonts.mono,
              textTransform: 'uppercase',
            }}>
              {currentTask.status}
            </div>
          </div>
        </div>

        {showPhaseIndicator && currentTask.currentPhase && (
          <div style={{ marginBottom: designTokens.spacing.md }}>
            <PhaseIndicator
              currentPhase={currentTask.currentPhase}
              completedPhases={currentTask.completedPhases}
              showLabels={!compactMode}
              compact={compactMode}
              orientation="horizontal"
            />
          </div>
        )}

        {currentTask.status === 'completed' && currentTask.result && (
          <div style={{
            marginTop: designTokens.spacing.md,
            padding: designTokens.spacing.md,
            backgroundColor: `${designTokens.colors.semantic.success}10`,
            border: `${designTokens.borders.width.thin} ${designTokens.borders.style} ${designTokens.colors.semantic.success}`,
          }}>
            <div style={{
              color: designTokens.colors.semantic.success,
              fontFamily: designTokens.typography.fonts.mono,
              fontSize: designTokens.typography.sizes.sm,
              marginBottom: designTokens.spacing.xs,
            }}>
              Result:
            </div>
            <div style={{
              color: designTokens.colors.text.primary,
              fontFamily: designTokens.typography.fonts.mono,
              fontSize: designTokens.typography.sizes.sm,
            }}>
              {typeof currentTask.result === 'string' ? currentTask.result : JSON.stringify(currentTask.result, null, 2)}
            </div>
          </div>
        )}

        {currentTask.error && (
          <div style={{
            marginTop: designTokens.spacing.md,
            padding: designTokens.spacing.md,
            backgroundColor: `${designTokens.colors.semantic.error}10`,
            border: `${designTokens.borders.width.thin} ${designTokens.borders.style} ${designTokens.colors.semantic.error}`,
          }}>
            <div style={{
              color: designTokens.colors.semantic.error,
              fontFamily: designTokens.typography.fonts.mono,
              fontSize: designTokens.typography.sizes.sm,
            }}>
              Error: {currentTask.error}
            </div>
          </div>
        )}

        {(currentTask.status === 'completed' || currentTask.status === 'failed') && (
          <div style={{ marginTop: designTokens.spacing.md }}>
            <BrutalistButton
              variant="secondary"
              size="sm"
              onClick={() => setCurrentTask(null)}
              fullWidth
            >
              Start New Task
            </BrutalistButton>
          </div>
        )}
      </GlassPanel>
    );
  };

  // Render terminal
  const renderTerminal = () => {
    if (!showTerminal || !currentTask || terminalLogs.length === 0) return null;

    return (
      <GlassPanel
        bordered
        style={{
          padding: designTokens.spacing.md,
          backgroundColor: designTokens.colors.structure.bg.primary,
          maxHeight: compactMode ? '200px' : '300px',
          overflowY: 'auto',
        }}
      >
        <div style={{
          color: designTokens.colors.text.secondary,
          fontSize: designTokens.typography.sizes.xs,
          fontFamily: designTokens.typography.fonts.mono,
          textTransform: 'uppercase',
          marginBottom: designTokens.spacing.sm,
        }}>
          <Terminal className="w-3 h-3 inline-block mr-1" />
          Terminal Output
        </div>
        <div style={{
          fontFamily: designTokens.typography.fonts.mono,
          fontSize: designTokens.typography.sizes.xs,
        }}>
          {terminalLogs.map((log, index) => (
            <div key={index} style={{ marginBottom: designTokens.spacing.xs }}>
              <span style={{ color: designTokens.colors.text.tertiary }}>
                [{log.timestamp}]
              </span>{' '}
              <span style={{
                color: log.level === 'error' ? designTokens.colors.semantic.error :
                  log.level === 'success' ? designTokens.colors.semantic.success :
                    log.level === 'warning' ? designTokens.colors.accent.yellow :
                      designTokens.colors.text.secondary
              }}>
                {log.level.toUpperCase()}
              </span>{' '}
              <span style={{ color: designTokens.colors.text.primary }}>
                {log.message}
              </span>
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>
      </GlassPanel>
    );
  };

  return (
    <div className={className}>
      <GlassPanel bordered style={{ padding: compactMode ? designTokens.spacing.md : designTokens.spacing.lg }}>
        <div style={{ marginBottom: designTokens.spacing.lg }}>
          <h3 style={{
            fontSize: compactMode ? designTokens.typography.sizes.lg : designTokens.typography.sizes['2xl'],
            fontFamily: designTokens.typography.fonts.header,
            fontWeight: designTokens.typography.weights.bold,
            color: designTokens.colors.text.primary,
            marginBottom: designTokens.spacing.xs,
          }}>
            Task Orchestration
          </h3>
          <p style={{
            color: designTokens.colors.text.secondary,
            fontSize: designTokens.typography.sizes.sm,
            fontFamily: designTokens.typography.fonts.mono,
          }}>
            Submit tasks to AI agents with multi-phase orchestration
          </p>
        </div>

        {!currentTask ? (
          <>
            {renderAgentSelector()}
            {renderTaskForm()}
          </>
        ) : (
          <>
            {renderTaskStatus()}
            {renderTerminal()}
          </>
        )}
      </GlassPanel>
    </div>
  );
};

export default TaskOrchestrationPanel;
