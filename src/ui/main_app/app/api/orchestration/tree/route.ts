"use server";

import { NextResponse } from "next/server";
import { getRecentEvents, HookEvent } from "@/server/db";

type AgentStatus = "spawning" | "active" | "completed" | "failed" | "idle" | "waiting" | "unknown";

interface AgentEventNote {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

interface MutableTreeNode {
  id: string;
  label: string;
  agentType: string;
  status: AgentStatus;
  parentId: string | null;
  startedAt: string;
  lastUpdated: string;
  children: Set<string>;
  events: AgentEventNote[];
}

const ROOT_NODE_ID = "root";

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
    case "agent_status":
      return previous === "unknown" ? "idle" : previous;
    default:
      return previous;
  }
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

const computeNodeId = (eventType: string, payload: Record<string, any>, sourceApp?: string): string => {
  if (payload.agent_task_id) return String(payload.agent_task_id);
  if (payload.task_id && payload.agent) return `${payload.agent}:${payload.task_id}`;
  if (payload.agent_id) return String(payload.agent_id);
  if (payload.conversation_id) return String(payload.conversation_id);
  if (payload.session_id && sourceApp) return `${sourceApp}:${payload.session_id}`;
  if (payload.task_id) return String(payload.task_id);
  if (sourceApp) return sourceApp;
  return `${eventType}:${Math.random().toString(36).slice(2, 10)}`;
};

const computeParentId = (nodeId: string, payload: Record<string, any>, sourceApp?: string): string => {
  if (payload.parent_agent_id) return String(payload.parent_agent_id);
  if (payload.parent_task_id && payload.agent) return `${payload.agent}:${payload.parent_task_id}`;
  if (payload.parent_task_id) return String(payload.parent_task_id);
  if (nodeId.includes("_refine_")) {
    return nodeId.substring(0, nodeId.indexOf("_refine_"));
  }
  if (nodeId !== ROOT_NODE_ID && sourceApp && sourceApp !== nodeId) {
    return ROOT_NODE_ID;
  }
  return ROOT_NODE_ID;
};

function ensureNode(nodes: Map<string, MutableTreeNode>, nodeId: string, defaults: Omit<MutableTreeNode, "children" | "events">) {
  if (!nodes.has(nodeId)) {
    nodes.set(nodeId, {
      ...defaults,
      children: new Set<string>(),
      events: [],
    });
  }
}

function serializeNodes(nodes: Map<string, MutableTreeNode>) {
  return Array.from(nodes.values()).map((node) => ({
    id: node.id,
    label: node.label,
    agentType: node.agentType,
    status: node.status,
    parentId: node.parentId,
    startedAt: node.startedAt,
    lastUpdated: node.lastUpdated,
    children: Array.from(node.children),
    events: node.events,
  }));
}

const extractEventType = (event: HookEvent, payload: Record<string, any>, data: Record<string, any>) => {
  return (
    payload.event_type ||
    event.hook_event_type ||
    data.event_type ||
    data.type ||
    "unknown"
  )
    .toString()
    .toLowerCase();
};

const extractTimestamp = (value: number | string | undefined) => {
  if (typeof value === "number") {
    return new Date(value).toISOString();
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return new Date().toISOString();
};

export async function GET() {
  try {
    const events = getRecentEvents(250);
    const nodes = new Map<string, MutableTreeNode>();

    const now = new Date().toISOString();
    ensureNode(nodes, ROOT_NODE_ID, {
      id: ROOT_NODE_ID,
      label: "Unified Orchestrator",
      agentType: "orchestrator",
      status: "active",
      parentId: null,
      startedAt: now,
      lastUpdated: now,
    });

    for (const event of events) {
      const payload = (event.payload as Record<string, any>) ?? {};
      const data = (payload.data as Record<string, any>) ?? payload;
      const sourceApp = payload.source_app || data.source_app || event.source_app;

      const eventType = extractEventType(event, payload, data);
      const timestamp = extractTimestamp(event.timestamp);
      const nodeId = computeNodeId(eventType, data, sourceApp);
      const parentId = computeParentId(nodeId, data, sourceApp);
      const label = friendlyName(data.agent_label || data.agent || sourceApp || nodeId, nodeId);
      const agentType = friendlyName(data.agent || data.agent_type || sourceApp || "agent", "agent");
      const description = describeEvent(eventType, data);

      ensureNode(nodes, parentId, {
        id: parentId,
        label: friendlyName(parentId, parentId),
        agentType: "agent",
        status: "active",
        parentId: parentId === ROOT_NODE_ID ? null : ROOT_NODE_ID,
        startedAt: timestamp,
        lastUpdated: timestamp,
      });

      const existingNode = nodes.get(nodeId);
      const nextStatus = determineStatusFromEvent(eventType, existingNode?.status ?? "spawning");

      if (!existingNode) {
        nodes.set(nodeId, {
          id: nodeId,
          label,
          agentType,
          status: nextStatus,
          parentId,
          startedAt: timestamp,
          lastUpdated: timestamp,
          children: new Set<string>(),
          events: [
            {
              id: `${nodeId}-${timestamp}-${eventType}`,
              type: eventType,
              description,
              timestamp,
            },
          ],
        });
      } else {
        existingNode.label = existingNode.label || label;
        existingNode.agentType = existingNode.agentType || agentType;
        existingNode.status = nextStatus;
        existingNode.parentId = parentId;
        existingNode.lastUpdated = timestamp;
        existingNode.events.unshift({
          id: `${nodeId}-${timestamp}-${eventType}`,
          type: eventType,
          description,
          timestamp,
        });
        existingNode.events = existingNode.events.slice(0, 25);
      }

      const node = nodes.get(nodeId)!;
      const parentNode = nodes.get(parentId);
      if (parentNode && !parentNode.children.has(nodeId)) {
        parentNode.children.add(nodeId);
      }
      parentNode && (parentNode.lastUpdated = timestamp);
      nodes.get(ROOT_NODE_ID)!.lastUpdated = timestamp;
    }

    return NextResponse.json({
      ok: true,
      nodes: serializeNodes(nodes),
      events: events.slice(-100),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to build orchestration tree:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to build orchestration tree snapshot",
      },
      { status: 500 }
    );
  }
}
