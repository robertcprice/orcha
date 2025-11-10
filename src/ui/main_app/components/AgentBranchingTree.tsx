"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import clsx from "clsx";
import { Activity, ArrowUpRight, Radio } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { hierarchy, tree as d3Tree } from "d3-hierarchy";

type AgentStatus = "spawning" | "active" | "completed" | "failed";

interface AgentEventNote {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

interface AgentTreeNode {
  id: string;
  label: string;
  agentType: string;
  status: AgentStatus;
  parentId: string | null;
  startedAt: string;
  lastUpdated: string;
  children: string[];
  events: AgentEventNote[];
}

interface BranchingTreeProps {
  wsUrl?: string;
  maxEventsPerAgent?: number;
}

interface DiagramNode {
  id: string;
  label: string;
  agentType: string;
  status: AgentStatus;
  nodeRef?: AgentTreeNode;
  children: DiagramNode[];
}

interface PositionedDiagramNode extends DiagramNode {
  x: number;
  y: number;
  depth: number;
}

interface DiagramLink {
  source: { x: number; y: number };
  target: { x: number; y: number };
}

const ROOT_NODE_ID = "root";

const statusStyles: Record<AgentStatus, { chip: string; branch: string; badge: string }> = {
  spawning: {
    chip: "border-purple-400/70 bg-purple-500/10 shadow-purple-500/20 animate-pulse",
    branch: "border-purple-400/60 animate-pulse",
    badge: "bg-purple-500/20 border-purple-400/60 text-purple-200",
  },
  active: {
    chip: "border-blue-400/70 bg-blue-500/10 shadow-blue-500/20 animate-[pulse_1.8s_ease-in-out_infinite]",
    branch: "border-blue-400/70 animate-[pulse_1.8s_ease-in-out_infinite]",
    badge: "bg-blue-500/20 border-blue-400/60 text-blue-200",
  },
  completed: {
    chip: "border-emerald-400/60 bg-emerald-500/10 shadow-emerald-500/20",
    branch: "border-emerald-400/50",
    badge: "bg-emerald-500/20 border-emerald-400/60 text-emerald-200",
  },
  failed: {
    chip: "border-rose-500/70 bg-rose-500/10 shadow-rose-500/30 animate-[pulse_1.4s_ease-in-out_infinite]",
    branch: "border-rose-500/70 animate-[pulse_1.4s_ease-in-out_infinite]",
    badge: "bg-rose-500/20 border-rose-500/60 text-rose-200",
  },
};

const nodeCircleStyles: Record<AgentStatus, string> = {
  spawning: "fill-purple-500/30 stroke-purple-300/80",
  active: "fill-sky-500/30 stroke-sky-300/80",
  completed: "fill-emerald-500/30 stroke-emerald-300/80",
  failed: "fill-rose-500/30 stroke-rose-300/80",
};

const friendlyName = (value: string | undefined, fallback: string) => {
  if (!value) return fallback;
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (s) => s.toUpperCase())
    .trim();
};

const describeEvent = (type: string, payload: Record<string, any>): string => {
  switch (type) {
    case "task_dispatched":
      return `Dispatching ${friendlyName(payload.agent, "agent")} task`;
    case "agent_spawned":
      return `Spawned sub-agent ${friendlyName(payload.agent_id, "instance")}`;
    case "manager_started":
      return `Manager ${friendlyName(payload.agent, "agent")} began execution`;
    case "agent_started":
      return `Agent execution started`;
    case "codex_session_started":
      return `Codex session establishing`;
    case "codex_thinking":
      return payload.content || "Codex processing request";
    case "agent_completed":
    case "task_completed":
    case "manager_complete":
    case "codex_session_completed":
      return `Task completed${payload.success === false ? " (with issues)" : ""}`;
    case "agent_failed":
    case "codex_session_failed":
    case "refinement_failed":
      return payload.error || "Agent reported a failure";
    case "refinement_complete":
      return `Refinement iteration ${payload.iteration ?? ""} finished`;
    case "phase_start":
      return `Entering ${friendlyName(payload.phase, "phase")} phase`;
    default:
      return payload.content || friendlyName(type, type);
  }
};

const determineStatusFromEvent = (eventType: string, previous: AgentStatus): AgentStatus => {
  switch (eventType) {
    case "task_dispatched":
    case "agent_spawned":
      return "spawning";
    case "manager_started":
    case "agent_started":
    case "codex_session_started":
    case "codex_thinking":
    case "phase_start":
      return previous === "completed" || previous === "failed" ? previous : "active";
    case "agent_completed":
    case "task_completed":
    case "manager_complete":
    case "codex_session_completed":
    case "refinement_complete":
    case "documentation_complete":
    case "orchestration_complete":
      return "completed";
    case "agent_failed":
    case "task_failed":
    case "manager_failed":
    case "codex_session_failed":
    case "orchestration_failed":
      return "failed";
    default:
      return previous;
  }
};

const computeNodeId = (eventType: string, payload: Record<string, any>, sourceApp: string | undefined): string => {
  if (payload.agent_task_id) return payload.agent_task_id;
  if (payload.task_id && payload.agent) return `${payload.agent}:${payload.task_id}`;
  if (payload.agent_id) return payload.agent_id;
  if (payload.conversation_id) return payload.conversation_id;
  if (payload.session_id && sourceApp) return `${sourceApp}:${payload.session_id}`;
  if (payload.task_id) return payload.task_id;
  if (sourceApp) return sourceApp;
  return `${eventType}:${Math.random().toString(36).slice(2, 10)}`;
};

const computeParentId = (
  nodeId: string,
  payload: Record<string, any>,
  sourceApp: string | undefined
): string => {
  if (payload.parent_agent_id) return payload.parent_agent_id;
  if (payload.parent_task_id && payload.agent) return `${payload.agent}:${payload.parent_task_id}`;
  if (payload.parent_task_id) return payload.parent_task_id;
  if (nodeId.includes("_refine_")) {
    return nodeId.substring(0, nodeId.indexOf("_refine_"));
  }
  if (nodeId !== ROOT_NODE_ID && sourceApp && sourceApp !== nodeId) {
    return ROOT_NODE_ID;
  }
  return ROOT_NODE_ID;
};

const createRootNode = (): AgentTreeNode => {
  const now = new Date().toISOString();
  return {
    id: ROOT_NODE_ID,
    label: "Unified Orchestrator",
    agentType: "orchestrator",
    status: "active",
    parentId: null,
    startedAt: now,
    lastUpdated: now,
    children: [],
    events: [
      {
        id: `${now}-root`,
        type: "orchestration_start",
        description: "Orchestration session initialized",
        timestamp: now,
      },
    ],
  };
};

const defaultWsUrl = typeof window !== "undefined" ? window.location.origin.replace(/^http/, "ws") + "/ws" : "ws://localhost:4000/ws";

export function AgentBranchingTreeView({ wsUrl = defaultWsUrl, maxEventsPerAgent = 25 }: BranchingTreeProps) {
  const [nodes, setNodes] = useState<Record<string, AgentTreeNode>>(() => ({
    [ROOT_NODE_ID]: createRootNode(),
  }));
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  const upsertNode = useCallback(
    (eventPayload: any) => {
      const payload: Record<string, any> = (eventPayload.payload || eventPayload.data || eventPayload) as Record<string, any>;
      const data: Record<string, any> = payload.data || payload;

      const eventType: string = (
        eventPayload.event_type ||
        eventPayload.hook_event_type ||
        eventPayload.type ||
        payload.event_type ||
        payload.hook_event_type ||
        payload.type ||
        data.event_type ||
        data.type ||
        "unknown"
      ).toString().toLowerCase();

      const sourceApp: string | undefined =
        eventPayload.source_app || payload.source_app || payload.actor || data.source_app || data.actor;

      const timestampRaw =
        eventPayload.timestamp || payload.timestamp || data.timestamp || Date.now();
      const timestamp = new Date(timestampRaw).toISOString();

      const nodeId = computeNodeId(eventType, data, sourceApp);
      const parentId = computeParentId(nodeId, data, sourceApp);
      const label = friendlyName(
        data.agent_label || data.agent || data.agent_type || data.manager || sourceApp || nodeId,
        nodeId
      );
      const agentType = friendlyName(
        data.agent || data.agent_type || sourceApp || "agent",
        "agent"
      );
      const eventDescription = describeEvent(eventType, data);
      const eventNote: AgentEventNote = {
        id: `${nodeId}-${timestamp}-${eventType}`,
        type: eventType,
        description: eventDescription,
        timestamp,
      };

      setNodes((prev) => {
        const next = new Map<string, AgentTreeNode>();
        for (const [key, value] of Object.entries(prev)) {
          next.set(key, { ...value, children: [...value.children], events: [...value.events] });
        }

        if (!next.has(ROOT_NODE_ID)) {
          next.set(ROOT_NODE_ID, createRootNode());
        }

        const existing = next.get(nodeId);
        const priorParentId = existing?.parentId ?? null;
        const status = determineStatusFromEvent(eventType, existing?.status ?? "spawning");

        const updatedNode: AgentTreeNode = {
          id: nodeId,
          label: existing?.label ?? label,
          agentType: existing?.agentType ?? agentType,
          status,
          parentId,
          startedAt: existing?.startedAt ?? timestamp,
          lastUpdated: timestamp,
          children: existing?.children ?? [],
          events: [
            eventNote,
            ...((existing?.events || []).filter((note) => note.id !== eventNote.id).slice(0, maxEventsPerAgent - 1)),
          ],
        };

        next.set(nodeId, updatedNode);

        if (priorParentId && priorParentId !== parentId) {
          const oldParent = next.get(priorParentId);
          if (oldParent) {
            next.set(priorParentId, {
              ...oldParent,
              children: oldParent.children.filter((childId) => childId !== nodeId),
              lastUpdated: timestamp,
            });
          }
        }

        const parentNode = next.get(parentId) ?? {
          id: parentId,
          label: friendlyName(parentId, parentId),
          agentType: "agent",
          status: "active" as AgentStatus,
          parentId: ROOT_NODE_ID,
          startedAt: timestamp,
          lastUpdated: timestamp,
          children: [],
          events: [],
        };

        if (!next.has(parentId)) {
          next.set(parentId, parentNode);
        }

        if (!parentNode.children.includes(nodeId)) {
          parentNode.children.push(nodeId);
        }

        parentNode.lastUpdated = timestamp;
        next.set(parentId, parentNode);

        const root = next.get(ROOT_NODE_ID)!;
        root.lastUpdated = timestamp;
        next.set(ROOT_NODE_ID, root);

        return Object.fromEntries(next.entries());
      });
    },
    [maxEventsPerAgent]
  );

  const handleMessage = useCallback(
    (message: any) => {
      if (!message) return;
      if (message.type === "event") {
        upsertNode(message.data);
      } else if (message.type === "initial" && Array.isArray(message.data)) {
        message.data.forEach(upsertNode);
      }
    },
    [upsertNode]
  );

  useEffect(() => {
    let ws: WebSocket | null = null;
    let shouldReconnect = true;

    const connect = () => {
      setConnectionStatus("connecting");
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnectionStatus("connected");
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
          reconnectTimer.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (error) {
          console.error("Failed to parse agent tree event:", error);
        }
      };

      ws.onerror = () => {
        setConnectionStatus("disconnected");
      };

      ws.onclose = () => {
        setConnectionStatus("disconnected");
        if (shouldReconnect) {
          reconnectTimer.current = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      shouldReconnect = false;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [handleMessage, wsUrl]);

  const activities = useMemo(() => {
    return Object.values(nodes)
      .filter((node) => node.id !== ROOT_NODE_ID)
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
      .slice(0, 8);
  }, [nodes]);

  const buildDiagramTree = useCallback(
    (nodeId: string, visited: Set<string> = new Set()): DiagramNode => {
      const node = nodes[nodeId];
      const safeLabel = node?.label || friendlyName(nodeId, nodeId);
      const safeAgentType = node?.agentType || "agent";
      const safeStatus: AgentStatus = node?.status || "active";

      if (!node) {
        return {
          id: nodeId,
          label: safeLabel,
          agentType: safeAgentType,
          status: safeStatus,
          children: [],
        };
      }

      if (visited.has(nodeId)) {
        return {
          id: node.id,
          label: node.label,
          agentType: node.agentType,
          status: node.status,
          nodeRef: node,
          children: [],
        };
      }

      const pathVisited = new Set(visited);
      pathVisited.add(nodeId);

      return {
        id: node.id,
        label: node.label,
        agentType: node.agentType,
        status: node.status,
        nodeRef: node,
        children: node.children.map((childId) => buildDiagramTree(childId, pathVisited)),
      };
    },
    [nodes]
  );

  const treeDiagram = useMemo(() => {
    const rootData = buildDiagramTree(ROOT_NODE_ID);
    const hierarchyRoot = hierarchy(rootData, (d) => d.children);

    const layout = d3Tree<DiagramNode>()
      .nodeSize([160, 180])
      .separation((a, b) => (a.parent === b.parent ? 1.1 : 1.6));

    const laidOut = layout(hierarchyRoot);
    const descendants = laidOut.descendants();
    const links = laidOut.links();
    const xs = descendants.map((node) => node.x);
    const ys = descendants.map((node) => node.y);

    const minX = Math.min(...xs, 0);
    const maxX = Math.max(...xs, 0);
    const minY = Math.min(...ys, 0);
    const maxY = Math.max(...ys, 0);

    const marginX = 120;
    const marginY = 160;
    const width = maxX - minX + marginX * 2;
    const height = maxY - minY + marginY * 2;

    const offsetX = marginX - minX;
    const offsetY = marginY - minY;

    const positionedNodes: PositionedDiagramNode[] = descendants.map((node) => ({
      ...node.data,
      x: node.x + offsetX,
      y: node.y + offsetY,
      depth: node.depth,
    }));

    const positionedLinks: DiagramLink[] = links.map((link) => ({
      source: { x: link.source.x + offsetX, y: link.source.y + offsetY },
      target: { x: link.target.x + offsetX, y: link.target.y + offsetY },
    }));

    return {
      nodes: positionedNodes,
      links: positionedLinks,
      width,
      height,
    };
  }, [buildDiagramTree]);

  const connectionBadge = useMemo(() => {
    switch (connectionStatus) {
      case "connected":
        return "text-emerald-300";
      case "connecting":
        return "text-yellow-300 animate-pulse";
      case "disconnected":
      default:
        return "text-rose-300 animate-pulse";
    }
  }, [connectionStatus]);

  const patternId = useId();
  const nodeRadius = 30;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/70 bg-slate-950/60 px-4 py-3 shadow-lg">
        <div className="flex items-center gap-3 text-sm text-white/80">
          <Radio className={clsx("h-4 w-4", connectionBadge)} />
          <span className="uppercase tracking-widest text-xs text-white/60">
            Connection {connectionStatus}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <ArrowUpRight className="h-4 w-4" />
          Listening to {wsUrl}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[2fr_minmax(320px,1fr)]">
        <div className="rounded-3xl border border-slate-800/60 bg-slate-950/70 p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800/70 pb-4">
            <div>
              <h2 className="text-lg font-semibold uppercase tracking-widest text-white">
                Agent Branching Graph
              </h2>
              <p className="mt-1 text-xs uppercase tracking-[0.3em] text-white/40">
                Real-time hierarchy of orchestrated agents
              </p>
            </div>
          </div>
          <div className="mt-6 overflow-auto rounded-2xl border border-slate-900/70 bg-slate-950/60 p-4">
            <div className="relative min-h-[520px] w-full">
              <svg
                className="h-full w-full"
                viewBox={`0 0 ${Math.max(treeDiagram.width, 600)} ${Math.max(treeDiagram.height, 600)}`}
                role="presentation"
              >
                <defs>
                  <pattern id={patternId} width="32" height="32" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="1" className="fill-slate-800/70" />
                  </pattern>
                </defs>
                <rect
                  width="100%"
                  height="100%"
                  fill={`url(#${patternId})`}
                  className="opacity-40"
                  rx={24}
                />
                {treeDiagram.links.map((link, index) => {
                  const curveMidY = (link.source.y + link.target.y) / 2;
                  const pathD = [
                    "M",
                    link.source.x,
                    link.source.y + nodeRadius,
                    "C",
                    link.source.x,
                    curveMidY,
                    link.target.x,
                    curveMidY,
                    link.target.x,
                    link.target.y - nodeRadius,
                  ].join(" ");
                  return (
                    <path
                      key={`link-${index}`}
                      d={pathD}
                      className="fill-none stroke-slate-700/70"
                      strokeWidth={2}
                    />
                  );
                })}
                {treeDiagram.nodes.map((node) => (
                  <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                    <circle
                      r={nodeRadius}
                      className={clsx(
                        "stroke-2 drop-shadow-[0_6px_12px_rgba(15,23,42,0.45)]",
                        nodeCircleStyles[node.status] || nodeCircleStyles.active
                      )}
                    />
                    <text
                      textAnchor="middle"
                      className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-white"
                      y={nodeRadius + 18}
                    >
                      {node.label}
                    </text>
                    <text
                      textAnchor="middle"
                      className="text-[10px] uppercase tracking-[0.3em] text-white/50"
                      y={nodeRadius + 32}
                    >
                      {friendlyName(node.agentType, "agent")}
                    </text>
                    <title>
                      {node.label} • {node.agentType} • {node.status}
                    </title>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-800/60 bg-slate-950/70 p-6 shadow-xl">
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
              Agent Activity Stream
            </h2>
            <p className="mt-2 text-xs text-white/40">
              Latest updates from active and recently completed agents.
            </p>
            <div className="mt-5 space-y-4">
              {activities.length === 0 && (
                <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-5 text-xs text-white/50">
                  Waiting for agent activity…
                </div>
              )}
              {activities.map((node) => {
                const lastEvent = node.events[0];
                const style = statusStyles[node.status] || statusStyles.active;
                return (
                  <div
                    key={node.id}
                    className={clsx(
                      "rounded-2xl border px-4 py-3 shadow-md transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-lg",
                      style.chip
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white/90">{node.label}</p>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">
                          {node.agentType}
                        </p>
                      </div>
                      <span
                        className={clsx(
                          "rounded-full border px-3 py-1 text-[10px] uppercase tracking-wide",
                          style.badge
                        )}
                      >
                        {node.status}
                      </span>
                    </div>
                    {lastEvent && (
                      <div className="mt-3 text-xs text-white/70">
                        <p className="font-medium uppercase tracking-[0.25em] text-white/40">Last Event</p>
                        <p className="mt-1 leading-relaxed">{lastEvent.description}</p>
                        <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/40">
                          {formatDistanceToNow(new Date(lastEvent.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgentBranchingTree(props: BranchingTreeProps) {
  return <AgentBranchingTreeView {...props} />;
}
