'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Clock, CheckCircle, XCircle, Circle } from 'lucide-react';

interface Task {
  task_id: string;
  goal: string;
  status: string;
  project?: string;
  created_at?: string;
  updated_at?: string;
}

interface TaskHistoryDropdownProps {
  onTaskClick?: (taskId: string) => void; // ✅ PHASE 3: Callback when task is clicked to load its tree
}

export default function TaskHistoryDropdown({ onTaskClick }: TaskHistoryDropdownProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch active task and history
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        // Fetch current project
        const projectRes = await fetch('/api/projects');
        let projectFilter: string | null = null;
        if (projectRes.ok) {
          const projectData = await projectRes.json();
          projectFilter = projectData.currentProject || null;
          setCurrentProject(projectFilter);
        }

        // Fetch active task
        const activeRes = await fetch('/api/hybrid-orchestrator/active');
        if (activeRes.ok) {
          const activeData = await activeRes.json();
          if (activeData.active_task) {
            setCurrentTask(activeData.active_task);
          } else {
            setCurrentTask(null);
          }
        }

        // Fetch recent tasks
        const tasksRes = await fetch('/api/tasks/list');
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          let filteredTasks = tasksData.tasks || [];

          // Filter tasks by current project if project is set
          if (projectFilter) {
            filteredTasks = filteredTasks.filter((task: Task) => task.project === projectFilter);
          }

          // Get last 10 tasks
          setRecentTasks(filteredTasks.slice(0, 10));
        }
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      }
    };

    fetchTasks();
    // Poll every 5 seconds
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'analyzing':
      case 'planning':
      case 'executing':
      case 'running':
        return <Circle size={14} className="animate-pulse" style={{ color: 'var(--accent-primary)' }} />;
      case 'completed':
        return <CheckCircle size={14} style={{ color: 'var(--status-success)' }} />;
      case 'failed':
        return <XCircle size={14} style={{ color: 'var(--status-error)' }} />;
      default:
        return <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />;
    }
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const truncateGoal = (goal: string, maxLength: number = 40) => {
    if (goal.length <= maxLength) return goal;
    return goal.substring(0, maxLength) + '...';
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg group transition-all"
        style={{
          background: 'var(--glass-light)',
          border: '1px solid var(--glass-border)',
          color: 'var(--text-secondary)',
          minWidth: '200px',
        }}
      >
        <Clock size={18} />
        <span className="text-sm flex-1 text-left">
          {currentTask ? truncateGoal(currentTask.goal, 25) : 'No active task'}
        </span>
        <ChevronDown
          size={16}
          className="transition-transform"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 rounded-lg shadow-2xl overflow-hidden z-50"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(var(--blur-lg))',
            minWidth: '350px',
            maxHeight: '500px',
            overflowY: 'auto',
          }}
        >
          {/* Current Task Section */}
          {currentTask && (
            <div className="p-3 border-b" style={{ borderColor: 'var(--glass-border)' }}>
              <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-tertiary)' }}>
                CURRENT TASK
              </div>
              <div className="flex items-start gap-2">
                {getStatusIcon(currentTask.status)}
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {currentTask.goal}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    Status: {currentTask.status} • {formatTime(currentTask.created_at)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Tasks Section */}
          <div className="p-3">
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-tertiary)' }}>
              RECENT TASKS
            </div>
            {recentTasks.length === 0 ? (
              <div className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>
                No recent tasks
              </div>
            ) : (
              <div className="space-y-2">
                {recentTasks.map((task) => (
                  <div
                    key={task.task_id}
                    className="p-2 rounded-lg hover:bg-opacity-50 transition-all cursor-pointer"
                    style={{
                      background: 'var(--glass-light)',
                      border: '1px solid transparent',
                    }}
                    onClick={() => {
                      // ✅ PHASE 3: Load tree structure when task is clicked
                      if (onTaskClick) {
                        onTaskClick(task.task_id);
                        setIsOpen(false); // Close dropdown after selection
                      }
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--glass-border)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                  >
                    <div className="flex items-start gap-2">
                      {getStatusIcon(task.status)}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                          {task.goal}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {formatTime(task.created_at || task.updated_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
