/**
 * API endpoint to get individual agent activity from Redis
 * Tracks agents spawned via Direct Claude and Hybrid Orchestrator
 */

import { NextResponse } from 'next/server';
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

interface AgentActivity {
  role: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentTask?: string;
  lastActivity?: string;
  sessionId?: string;
  cost?: number;
  duration?: number;
  turns?: number;
  startedAt?: string;
  completedAt?: string;
}

const ALL_AGENT_ROLES = ['PP', 'AR', 'IM', 'RD', 'DOC', 'CODE', 'QA', 'RES', 'DATA', 'TRAIN', 'DEVOPS', 'COORD'];

export async function GET() {
  const redis = createClient({ url: REDIS_URL });

  try {
    await redis.connect();

    // Initialize all agents as idle
    const agents: Record<string, AgentActivity> = {};
    for (const role of ALL_AGENT_ROLES) {
      agents[role] = {
        role: getRoleName(role),
        status: 'idle',
      };
    }

    // Get all active agent sessions from Redis
    // Pattern: algomind.agent.{role}.current
    for (const role of ALL_AGENT_ROLES) {
      const agentKey = `algomind.agent.${role}.current`;
      const agentData = await redis.hGetAll(agentKey);

      if (agentData && Object.keys(agentData).length > 0) {
        agents[role] = {
          role: getRoleName(role),
          status: (agentData.status as any) || 'idle',
          currentTask: agentData.task || undefined,
          lastActivity: agentData.last_activity || undefined,
          sessionId: agentData.session_id || undefined,
          cost: agentData.cost ? parseFloat(agentData.cost) : undefined,
          duration: agentData.duration ? parseFloat(agentData.duration) : undefined,
          turns: agentData.turns ? parseInt(agentData.turns) : undefined,
          startedAt: agentData.started_at || undefined,
          completedAt: agentData.completed_at || undefined,
        };
      }
    }

    // Also check for recent Direct Claude tasks
    const directClaudeKeys = await redis.keys('algomind.direct.claude.*');
    for (const key of directClaudeKeys.slice(-20)) { // Check last 20 tasks
      const taskData = await redis.hGetAll(key);
      if (taskData && taskData.agent) {
        const role = taskData.agent.toUpperCase();
        if (ALL_AGENT_ROLES.includes(role)) {
          // Only update if this is more recent than current data
          const taskUpdated = new Date(taskData.updated_at || 0);
          const currentUpdated = agents[role].lastActivity ? new Date(agents[role].lastActivity!) : new Date(0);

          if (taskUpdated > currentUpdated || agents[role].status === 'idle') {
            agents[role] = {
              role: getRoleName(role),
              status: (taskData.status as any) || 'idle',
              currentTask: taskData.task || undefined,
              lastActivity: taskData.updated_at || undefined,
              sessionId: taskData.task_id || undefined,
              cost: taskData.cost ? parseFloat(taskData.cost) : undefined,
              duration: taskData.duration ? parseFloat(taskData.duration) : undefined,
            };
          }
        }
      }
    }

    await redis.quit();

    return NextResponse.json({
      agents,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to get agent activity:', error);

    // Try to close Redis connection
    try {
      await redis.quit();
    } catch {}

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function getRoleName(role: string): string {
  const roleNames: Record<string, string> = {
    PP: 'Product Planner',
    AR: 'Architect/Reviewer',
    IM: 'Implementer',
    RD: 'Researcher/Documenter',
    DOC: 'Documentation Specialist',
    CODE: 'Coding Specialist',
    QA: 'QA & Testing Specialist',
    RES: 'Research Specialist',
    DATA: 'Data Engineering Specialist',
    TRAIN: 'Training Specialist',
    DEVOPS: 'DevOps Specialist',
    COORD: 'Coordinator',
  };
  return roleNames[role] || role;
}
