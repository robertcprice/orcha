"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { GlassPanel, designTokens } from "@/components/design-system";

type TaskStatus = "pending" | "active" | "completed" | "failed";

interface Task {
  task_id: string;
  title: string;
  goal: string;
  status: TaskStatus;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
  agent?: string;
  project?: string;
  source: "workspace" | "project";
  summary?: string;
}

interface TaskDetail extends Task {
  description?: string;
  orchestrator_mode?: string;
  config?: Record<string, unknown>;
  context?: Record<string, unknown>;
  result?: any;
}

interface TaskHistoryEvent {
  id: number;
  session_id: string;
  hook_event_type: string;
  timestamp: number;
  payload: { content?: string; data?: any };
  source_app: string;
}

export default function TasksList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [history, setHistory] = useState<TaskHistoryEvent[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch("/api/tasks/list");
        if (!response.ok) return;
        const data = await response.json();
        setTasks(data.tasks || []);
      } catch (error) {
        console.error("[TasksList] Failed to fetch tasks:", error);
      }
    };

    fetchTasks();
    const interval = setInterval(fetchTasks, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadDetail = async () => {
      if (!selectedTaskId) {
        setSelectedTask(null);
        setHistory([]);
        return;
      }

      setIsLoadingDetail(true);
      try {
        const response = await fetch(`/api/tasks/detail/${selectedTaskId}`);
        if (!response.ok) return;
        const detail = await response.json();
        if (!detail.ok) return;

        const baseTask = tasks.find((t) => t.task_id === selectedTaskId);
        setSelectedTask({
          ...baseTask,
          ...(detail.task as TaskDetail),
        });
        setHistory(detail.events || []);
      } catch (error) {
        console.error("[TasksList] Failed to fetch task detail:", error);
      } finally {
        setIsLoadingDetail(false);
      }
    };

    loadDetail();
  }, [selectedTaskId, tasks]);

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (filter === "all") return true;
        return task.status === filter;
      }),
    [tasks, filter]
  );

  const statusConfig: Record<TaskStatus, { icon: typeof Loader2; color: string; label: string; spin: boolean }> = {
    pending: {
      icon: Clock,
      color: designTokens.colors.text.tertiary,
      label: "Queued",
      spin: false,
    },
    active: {
      icon: Loader2,
      color: designTokens.colors.accent.blue,
      label: "Active",
      spin: true,
    },
    completed: {
      icon: CheckCircle2,
      color: designTokens.colors.accent.blue,
      label: "Completed",
      spin: false,
    },
    failed: {
      icon: XCircle,
      color: "#ef4444",
      label: "Failed",
      spin: false,
    },
  };

  return (
    <GlassPanel
      bordered
      borderColor={designTokens.colors.structure.border.primary}
      rounded="md"
      shadow
      style={{ padding: designTokens.spacing.lg }}
    >
      <div style={{ marginBottom: designTokens.spacing.md }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h3
            style={{
              fontSize: designTokens.typography.sizes.xl,
              fontFamily: designTokens.typography.fonts.header,
              fontWeight: designTokens.typography.weights.semibold,
              color: designTokens.colors.accent.brown,
            }}
          >
            Task Activity
          </h3>
          <span
            style={{
              fontFamily: designTokens.typography.fonts.mono,
              fontSize: designTokens.typography.sizes.xs,
              color: designTokens.colors.text.tertiary,
            }}
          >
            {tasks.length} tracked
          </span>
        </div>

        <div style={{ display: "flex", gap: designTokens.spacing.xs, flexWrap: "wrap", marginTop: designTokens.spacing.sm }}>
          {(["all", "pending", "active", "completed", "failed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: `${designTokens.spacing.xs} ${designTokens.spacing.sm}`,
                backgroundColor:
                  filter === f
                    ? designTokens.colors.accent.blue
                    : designTokens.colors.structure.bg.secondary,
                color: filter === f ? "#000" : designTokens.colors.text.secondary,
                border: `1px solid ${designTokens.colors.structure.border.primary}`,
                borderRadius: "4px",
                fontSize: designTokens.typography.sizes.xs,
                fontFamily: designTokens.typography.fonts.mono,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: selectedTask ? "minmax(0, 2fr) minmax(0, 3fr)" : "1fr",
          gap: designTokens.spacing.lg,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: designTokens.spacing.sm }}>
          {filteredTasks.length === 0 ? (
            <div
              style={{
                padding: designTokens.spacing.xl,
                textAlign: "center",
                color: designTokens.colors.text.tertiary,
                fontFamily: designTokens.typography.fonts.mono,
                fontSize: designTokens.typography.sizes.sm,
              }}
            >
              {filter === "all" ? "No tasks yet" : `No ${filter} tasks`}
            </div>
          ) : (
            filteredTasks.map((task) => {
              const config = statusConfig[task.status];
              const StatusIcon = config.icon;
              const isSelected = selectedTaskId === task.task_id;

              return (
                <GlassPanel
                  key={task.task_id}
                  bordered
                  borderColor={config.color}
                  rounded="sm"
                  style={{
                    padding: designTokens.spacing.md,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    backgroundColor: isSelected ? designTokens.colors.structure.bg.secondary : "transparent",
                  }}
                  onClick={() => setSelectedTaskId(task.task_id)}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: designTokens.spacing.md }}>
                    <StatusIcon
                      className={config.spin ? "animate-spin" : ""}
                      style={{
                        width: "20px",
                        height: "20px",
                        color: config.color,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: designTokens.typography.sizes.sm,
                          fontFamily: designTokens.typography.fonts.mono,
                          color: designTokens.colors.text.primary,
                          marginBottom: designTokens.spacing.xs,
                          fontWeight: designTokens.typography.weights.medium,
                        }}
                      >
                        {task.title || task.goal}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: designTokens.spacing.sm,
                          fontSize: designTokens.typography.sizes.xs,
                          color: designTokens.colors.text.tertiary,
                          fontFamily: designTokens.typography.fonts.mono,
                        }}
                      >
                        <span>ID: {task.task_id.slice(0, 8)}</span>
                        <span>Source: {task.source === "project" ? task.project : "workspace"}</span>
                        {task.agent && <span>Agent: {task.agent}</span>}
                        {task.started_at && (
                          <span>Started: {new Date(task.started_at).toLocaleString()}</span>
                        )}
                        {task.completed_at && (
                          <span>Completed: {new Date(task.completed_at).toLocaleString()}</span>
                        )}
                      </div>
                      {task.summary && (
                        <div
                          style={{
                            marginTop: designTokens.spacing.xs,
                            fontSize: designTokens.typography.sizes.xs,
                            color: designTokens.colors.text.secondary,
                            fontFamily: designTokens.typography.fonts.mono,
                          }}
                        >
                          {task.summary}
                        </div>
                      )}
                    </div>
                  </div>
                </GlassPanel>
              );
            })
          )}
        </div>

        {selectedTaskId && (
          <GlassPanel
            bordered
            borderColor={designTokens.colors.structure.border.secondary}
            rounded="md"
            style={{
              padding: designTokens.spacing.lg,
              maxHeight: "100%",
              overflowY: "auto",
            }}
          >
            {isLoadingDetail ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: designTokens.colors.text.tertiary,
                  fontFamily: designTokens.typography.fonts.mono,
                }}
              >
                Loading task details…
              </div>
            ) : selectedTask ? (
              <TaskDetails task={selectedTask} events={history} />
            ) : (
              <div
                style={{
                  color: designTokens.colors.text.tertiary,
                  fontFamily: designTokens.typography.fonts.mono,
                }}
              >
                Task details unavailable.
              </div>
            )}
          </GlassPanel>
        )}
      </div>
    </GlassPanel>
  );
}

function TaskDetails({ task, events }: { task: TaskDetail; events: TaskHistoryEvent[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: designTokens.spacing.md }}>
      <div>
        <h4
          style={{
            fontSize: designTokens.typography.sizes.lg,
            fontFamily: designTokens.typography.fonts.header,
            fontWeight: designTokens.typography.weights.semibold,
            color: designTokens.colors.accent.blue,
            marginBottom: designTokens.spacing.xs,
          }}
        >
          {task.title || task.goal}
        </h4>
        {task.summary && (
          <p
            style={{
              color: designTokens.colors.text.secondary,
              fontFamily: designTokens.typography.fonts.mono,
              fontSize: designTokens.typography.sizes.sm,
            }}
          >
            {task.summary}
          </p>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: designTokens.spacing.sm,
          fontFamily: designTokens.typography.fonts.mono,
          fontSize: designTokens.typography.sizes.xs,
          color: designTokens.colors.text.secondary,
        }}
      >
        <span><strong>Status:</strong> {task.status}</span>
        <span><strong>Source:</strong> {task.source === "project" ? task.project : "workspace"}</span>
        {task.agent && <span><strong>Agent:</strong> {task.agent}</span>}
        {task.orchestrator_mode && <span><strong>Mode:</strong> {task.orchestrator_mode}</span>}
        {task.started_at && (
          <span><strong>Started:</strong> {new Date(task.started_at).toLocaleString()}</span>
        )}
        {task.completed_at && (
          <span><strong>Completed:</strong> {new Date(task.completed_at).toLocaleString()}</span>
        )}
      </div>

      {task.description && (
        <section>
          <h5
            style={{
              fontSize: designTokens.typography.sizes.sm,
              fontFamily: designTokens.typography.fonts.header,
              color: designTokens.colors.text.primary,
              marginBottom: designTokens.spacing.xs,
            }}
          >
            Description
          </h5>
          <p
            style={{
              fontFamily: designTokens.typography.fonts.mono,
              color: designTokens.colors.text.secondary,
              fontSize: designTokens.typography.sizes.sm,
              whiteSpace: "pre-wrap",
            }}
          >
            {task.description}
          </p>
        </section>
      )}

      {events.length > 0 && (
        <section>
          <h5
            style={{
              fontSize: designTokens.typography.sizes.sm,
              fontFamily: designTokens.typography.fonts.header,
              color: designTokens.colors.text.primary,
              marginBottom: designTokens.spacing.xs,
            }}
          >
            Event Timeline
          </h5>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: designTokens.spacing.xs,
              fontFamily: designTokens.typography.fonts.mono,
              fontSize: designTokens.typography.sizes.xs,
              color: designTokens.colors.text.secondary,
            }}
          >
            {events.map((event) => {
              const data = event.payload?.data || {};
              const stage = data.stage || data.meta?.stage;
              const purpose = data.purpose || data.tool?.purpose;
              const content =
                event.payload?.content ||
                data.content ||
                JSON.stringify(data || {}, null, 2);

              return (
                <div
                  key={event.id}
                  style={{
                    borderLeft: `2px solid ${designTokens.colors.accent.blue}`,
                    paddingLeft: designTokens.spacing.sm,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div style={{ color: designTokens.colors.text.primary }}>
                    {new Date(event.timestamp || Date.now()).toLocaleTimeString()} · {event.hook_event_type}
                  </div>
                  {(stage || purpose) && (
                    <div style={{ color: designTokens.colors.text.tertiary }}>
                      {stage && <span>Stage: {stage}</span>}
                      {stage && purpose ? " · " : ""}
                      {purpose && <span>Purpose: {purpose}</span>}
                    </div>
                  )}
                  <div>{content}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {task.result && (
        <section>
          <h5
            style={{
              fontSize: designTokens.typography.sizes.sm,
              fontFamily: designTokens.typography.fonts.header,
              color: designTokens.colors.text.primary,
              marginBottom: designTokens.spacing.xs,
            }}
          >
            Outcome
          </h5>
          <pre
            style={{
              backgroundColor: "#0f172a",
              padding: designTokens.spacing.md,
              borderRadius: "8px",
              fontFamily: designTokens.typography.fonts.mono,
              fontSize: designTokens.typography.sizes.xs,
              color: designTokens.colors.text.secondary,
              whiteSpace: "pre-wrap",
              maxHeight: 280,
              overflow: "auto",
            }}
          >
            {JSON.stringify(task.result, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
