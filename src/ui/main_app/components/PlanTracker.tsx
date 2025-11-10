"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Loader2, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

interface Task {
  id: number;
  title: string;
  status: "completed" | "in_progress" | "pending";
  details?: Record<string, string>;
  detailsList?: string[];
}

interface PlanData {
  tasks: Task[];
  metadata: {
    lastUpdated: string;
    activeSessions: string;
  };
}

export default function PlanTracker() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [metadata, setMetadata] = useState<PlanData['metadata']>({ lastUpdated: 'Unknown', activeSessions: 'Unknown' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  // Fetch plan data from API
  useEffect(() => {
    fetchPlanData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPlanData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPlanData = async () => {
    try {
      const response = await fetch('/api/plan');
      const data = await response.json();

      if (data.ok) {
        setTasks(data.tasks || []);
        setMetadata(data.metadata || { lastUpdated: 'Unknown', activeSessions: 'Unknown' });
        setError(null);
      } else {
        setError('Failed to load plan data');
      }
    } catch (err) {
      console.error('Failed to fetch plan data:', err);
      setError('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const progressPercentage = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const toggleTask = (id: number) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="bg-secondary/30 backdrop-blur-sm border border-border rounded-lg p-5">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-secondary/30 backdrop-blur-sm border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Development Plan Progress</h2>
          {metadata.lastUpdated !== 'Unknown' && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {metadata.lastUpdated}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPlanData}
            className="p-1 rounded hover:bg-secondary/50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
          {error ? (
            <span className="text-xs text-error">{error}</span>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">
                {completedCount}/{tasks.length} tasks
              </span>
              <span className="text-sm font-semibold text-primary">
                {progressPercentage}%
              </span>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6 bg-secondary/50 rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-primary to-blue-400 h-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Task List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin">
        {tasks.map((task) => {
          const isExpanded = expandedTasks.has(task.id);
          const hasDetails = task.details || task.detailsList;

          return (
            <div
              key={task.id}
              className={`rounded-lg border transition-all ${
                task.status === "completed"
                  ? "bg-success/5 border-success/20"
                  : task.status === "in_progress"
                  ? "bg-primary/5 border-primary/30 shadow-sm shadow-primary/10"
                  : "bg-background/30 border-border/50"
              }`}
            >
              {/* Main task row */}
              <div
                className={`flex items-start gap-3 p-3 ${hasDetails ? "cursor-pointer hover:bg-background/30" : ""}`}
                onClick={() => hasDetails && toggleTask(task.id)}
              >
                {/* Expand/collapse icon */}
                {hasDetails && (
                  <div className="flex-shrink-0 mt-0.5">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                )}

                {/* Status icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {task.status === "completed" ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : task.status === "in_progress" ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin-slow" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm leading-relaxed ${
                      task.status === "completed"
                        ? "text-muted-foreground line-through"
                        : task.status === "in_progress"
                        ? "text-foreground font-medium"
                        : "text-foreground/80"
                    }`}
                  >
                    {task.title}
                  </p>
                  {task.status === "in_progress" && (
                    <p className="text-xs text-primary mt-1">Currently working...</p>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && hasDetails && (
                <div className="px-3 pb-3 pl-12 space-y-2">
                  {/* Key-value details */}
                  {task.details && Object.entries(task.details).map(([key, value]) => (
                    <div key={`task-${task.id}-detail-${key}`} className="text-xs">
                      <span className="font-medium text-primary">{key}:</span>{" "}
                      <span className="text-muted-foreground">{value}</span>
                    </div>
                  ))}

                  {/* Nested list items */}
                  {task.detailsList && task.detailsList.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {task.detailsList.map((item, idx) => (
                        <div key={`task-${task.id}-detail-${idx}`} className="text-xs text-muted-foreground flex gap-2">
                          <span>•</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
