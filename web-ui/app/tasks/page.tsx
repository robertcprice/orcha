"use client";

import { useState, useEffect } from 'react';
import TaskSubmissionForm from '@/components/TaskSubmissionForm';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock, XCircle, Loader2, Play } from 'lucide-react';

interface Task {
  task_id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  priority: string;
  created_at: string;
  updated_at: string;
  progress?: number;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'failed'>('all');

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks/status');
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.tasks) {
          setTasks(data.tasks);
        }
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      default:
        return <Play className="w-4 h-4 text-gray-400" />;
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const activeCount = tasks.filter(t => t.status === 'active').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const failedCount = tasks.filter(t => t.status === 'failed').length;

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary border border-border transition-all">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                Task Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Submit and monitor orchestration tasks
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="text-sm font-medium">{activeCount} Active</span>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Task submission */}
          <div className="lg:col-span-1">
            <TaskSubmissionForm />
          </div>

          {/* Right: Task list */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filter tabs */}
            <div className="bg-secondary/30 backdrop-blur-sm border border-border rounded-lg p-2 flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === 'all'
                    ? 'bg-primary/20 text-primary border border-primary'
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                All Tasks ({tasks.length})
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === 'active'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500'
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === 'completed'
                    ? 'bg-green-500/20 text-green-400 border border-green-500'
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                Completed ({completedCount})
              </button>
              <button
                onClick={() => setFilter('failed')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === 'failed'
                    ? 'bg-red-500/20 text-red-400 border border-red-500'
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                Failed ({failedCount})
              </button>
            </div>

            {/* Task list */}
            <div className="bg-secondary/30 backdrop-blur-sm border border-border rounded-lg overflow-hidden">
              <div className="p-4 bg-background/50 border-b border-border">
                <h3 className="font-semibold">Task Queue</h3>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" />
                    <p>Loading tasks...</p>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <p className="text-lg font-medium mb-2">No {filter !== 'all' && filter} tasks</p>
                    <p className="text-sm">
                      {filter === 'all'
                        ? 'Submit a task using the form to get started'
                        : `No tasks with status "${filter}"`
                      }
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredTasks.map((task) => (
                      <div
                        key={task.task_id}
                        className="p-4 hover:bg-muted/20 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1">{getStatusIcon(task.status)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-foreground truncate">
                                {task.title}
                              </h4>
                              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                                task.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                                task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                task.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {task.status}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {task.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>ID: {task.task_id.substring(0, 8)}...</span>
                              <span>Created: {new Date(task.created_at).toLocaleString()}</span>
                              {task.priority && (
                                <span className="capitalize">Priority: {task.priority}</span>
                              )}
                            </div>
                            {task.progress !== undefined && task.status === 'active' && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                  <span>Progress</span>
                                  <span>{task.progress}%</span>
                                </div>
                                <div className="bg-muted/50 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-blue-400 h-full transition-all duration-500"
                                    style={{ width: `${task.progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
