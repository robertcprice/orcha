import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createClient } from 'redis';

export const dynamic = 'force-dynamic';

interface AgentTask {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

interface AgentStats {
  total_tasks: number;
  completed: number;
  in_progress: number;
  failed: number;
  success_rate: number;
  last_active: string | null;
}

interface AgentState {
  role: string;
  name: string;
  objective: string;
  current_task: string | null;
  planned_tasks: AgentTask[];
  stats: AgentStats;
  last_updated: string;
  status?: 'idle' | 'processing' | 'paused' | 'stopped' | 'offline';
  timestamp?: string;
  task_id?: string | null;
}

const AGENTS_DIR = path.join(process.cwd(), '..', 'obsidian-vault', '07-Agent-States');
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/0';

// Ensure directory exists
async function ensureDir() {
  try {
    await fs.mkdir(AGENTS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating agents directory:', error);
  }
}

// Get agent state file path
function getAgentFilePath(role: string): string {
  return path.join(AGENTS_DIR, `${role.toLowerCase()}_state.json`);
}

// Default agent configurations
const DEFAULT_AGENTS: Record<string, AgentState> = {
  PP: {
    role: 'PP',
    name: 'Product Manager',
    objective: 'Plan and define development tasks, break down complex features into actionable steps, prioritize work, and maintain project roadmap.',
    current_task: null,
    planned_tasks: [],
    stats: {
      total_tasks: 0,
      completed: 0,
      in_progress: 0,
      failed: 0,
      success_rate: 0,
      last_active: null,
    },
    last_updated: new Date().toISOString(),
  },
  AR: {
    role: 'AR',
    name: 'Architect/Reviewer',
    objective: 'Review code quality, validate architecture decisions, ensure best practices, identify technical debt, and maintain code standards.',
    current_task: null,
    planned_tasks: [],
    stats: {
      total_tasks: 0,
      completed: 0,
      in_progress: 0,
      failed: 0,
      success_rate: 0,
      last_active: null,
    },
    last_updated: new Date().toISOString(),
  },
  IM: {
    role: 'IM',
    name: 'Implementer',
    objective: 'Write and modify code, implement features, fix bugs, refactor existing code, and execute development tasks efficiently.',
    current_task: null,
    planned_tasks: [],
    stats: {
      total_tasks: 0,
      completed: 0,
      in_progress: 0,
      failed: 0,
      success_rate: 0,
      last_active: null,
    },
    last_updated: new Date().toISOString(),
  },
  RD: {
    role: 'RD',
    name: 'Researcher/Documenter',
    objective: 'Research solutions, document code and decisions, create knowledge base entries, maintain technical documentation, and analyze patterns.',
    current_task: null,
    planned_tasks: [],
    stats: {
      total_tasks: 0,
      completed: 0,
      in_progress: 0,
      failed: 0,
      success_rate: 0,
      last_active: null,
    },
    last_updated: new Date().toISOString(),
  },
};

// Get agent status from Redis (for persistent agents)
async function getAgentStatusFromRedis(role: string): Promise<Partial<AgentState> | null> {
  const client = createClient({ url: REDIS_URL });

  try {
    await client.connect();

    const statusKey = `algomind.agent.${role}.status`;
    const queueKey = `algomind.agent.${role}.tasks`;
    const currentTaskKey = `algomind.agent.${role}.current_task`;

    // Get status
    const statusJson = await client.get(statusKey);
    const queueLength = await client.lLen(queueKey);
    const currentTaskJson = await client.get(currentTaskKey);

    await client.disconnect();

    if (!statusJson) {
      return null; // Agent not connected to Redis
    }

    const statusData = JSON.parse(statusJson);
    const currentTask = currentTaskJson ? JSON.parse(currentTaskJson) : null;

    return {
      status: statusData.status || 'offline',
      current_task: currentTask ? currentTask.goal : null,
      task_id: statusData.task_id || null,
      stats: {
        ...DEFAULT_AGENTS[role].stats,
        in_progress: queueLength,
      },
      timestamp: statusData.timestamp,
    };
  } catch (error) {
    console.error('Redis error:', error);
    return null;
  }
}

// Read agent state (merges Redis status with file-based data)
async function readAgentState(role: string): Promise<AgentState> {
  await ensureDir();
  const filePath = getAgentFilePath(role);

  let fileState: AgentState;
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    fileState = JSON.parse(content);
  } catch (error) {
    // If file doesn't exist, create default
    fileState = DEFAULT_AGENTS[role] || DEFAULT_AGENTS.PP;
    await fs.writeFile(filePath, JSON.stringify(fileState, null, 2));
  }

  // Try to get live status from Redis (persistent agents)
  const redisStatus = await getAgentStatusFromRedis(role);

  if (redisStatus) {
    // Merge Redis status with file state
    return {
      ...fileState,
      ...redisStatus,
      last_updated: redisStatus.timestamp || fileState.last_updated,
    };
  }

  // No Redis status, return file state with offline status
  return {
    ...fileState,
    status: 'offline',
  };
}

// Write agent state
async function writeAgentState(role: string, state: AgentState): Promise<void> {
  await ensureDir();
  const filePath = getAgentFilePath(role);
  state.last_updated = new Date().toISOString();
  await fs.writeFile(filePath, JSON.stringify(state, null, 2));
}

// GET - Retrieve all agent states or specific agent
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    if (role) {
      const agentState = await readAgentState(role.toUpperCase());
      return NextResponse.json({ ok: true, agent: agentState });
    }

    // Get all agents
    const agents = await Promise.all(
      Object.keys(DEFAULT_AGENTS).map(role => readAgentState(role))
    );

    return NextResponse.json({ ok: true, agents });
  } catch (error) {
    console.error('Error fetching agent states:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch agent states' },
      { status: 500 }
    );
  }
}

// POST - Update agent state
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, updates } = body;

    if (!role) {
      return NextResponse.json(
        { ok: false, error: 'Role is required' },
        { status: 400 }
      );
    }

    const currentState = await readAgentState(role.toUpperCase());
    const updatedState = { ...currentState, ...updates };

    // Recalculate stats if tasks changed
    if (updates.planned_tasks) {
      const tasks = updates.planned_tasks as AgentTask[];
      updatedState.stats = {
        total_tasks: tasks.length,
        completed: tasks.filter(t => t.status === 'completed').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        failed: tasks.filter(t => t.status === 'failed').length,
        success_rate: tasks.length > 0
          ? (tasks.filter(t => t.status === 'completed').length / tasks.length) * 100
          : 0,
        last_active: new Date().toISOString(),
      };
    }

    await writeAgentState(role.toUpperCase(), updatedState);

    return NextResponse.json({ ok: true, agent: updatedState });
  } catch (error) {
    console.error('Error updating agent state:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update agent state' },
      { status: 500 }
    );
  }
}
