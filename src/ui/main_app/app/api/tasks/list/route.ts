import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import Redis from 'ioredis';

const PROJECTS_DIR = path.join(process.cwd(), '../projects');
const ORCHESTRATOR_DIR = path.join(process.cwd(), '../orchestrator/tasks');
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379/0');

type TaskStatus = 'pending' | 'active' | 'completed' | 'failed';

interface NormalisedTask {
  task_id: string;
  title: string;
  goal: string;
  status: TaskStatus;
  project?: string;
  source: 'workspace' | 'project';
  orchestrator_mode?: string;
  agent?: string;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
  summary?: string;
  file_path: string;
}

const STATUS_DIRS: Record<TaskStatus, string> = {
  pending: 'pending',
  active: 'active',
  completed: 'completed',
  failed: 'failed',
};

async function collectTasksFromDirectory(
  baseDir: string,
  source: 'workspace' | 'project',
  project?: string
): Promise<NormalisedTask[]> {
  const tasks: NormalisedTask[] = [];

  for (const [status, dirName] of Object.entries(STATUS_DIRS) as [TaskStatus, string][]) {
    const dir = path.join(baseDir, dirName);
    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const fullPath = path.join(dir, file);
        try {
          const raw = JSON.parse(await fs.readFile(fullPath, 'utf8'));
          const taskId = raw.task_id || file.replace('.json', '');
          const title = raw.title || raw.goal || raw.description || 'Untitled task';
          const goal = raw.goal || raw.title || title;
          const startedAt = raw.started_at || raw.created_at;
          const completedAt = raw.completed_at || raw.finished_at;

          tasks.push({
            task_id: taskId,
            title,
            goal,
            status,
            project,
            source,
            orchestrator_mode: raw.orchestrator_mode,
            agent: raw.current_agent || raw.agent || raw.result?.agent || '',
            started_at: startedAt,
            completed_at: completedAt,
            created_at: raw.created_at,
            summary: raw.result?.summary,
            file_path: fullPath,
          });
        } catch (err) {
          console.warn(`[tasks/list] Failed to parse task file ${fullPath}:`, err);
        }
      }
    } catch {
      // Directory missing: ignore
    }
  }

  return tasks;
}

async function collectTasksFromRedis(): Promise<NormalisedTask[]> {
  const tasks: NormalisedTask[] = [];

  try {
    // Find all hybrid orchestrator tasks in Redis
    const keys = await redis.keys('algomind.hybrid.task.*');

    for (const key of keys) {
      try {
        const data = await redis.hgetall(key);
        if (!data || !data.task_id) continue;

        // Map Redis status to our normalized status
        let status: TaskStatus = 'pending';
        const redisStatus = data.status || 'pending';
        if (['analyzing', 'planning', 'executing', 'running', 'reviewing', 'refining', 'documenting', 'finalizing'].includes(redisStatus)) {
          status = 'active';
        } else if (redisStatus === 'completed') {
          status = 'completed';
        } else if (redisStatus === 'failed') {
          status = 'failed';
        }

        const goal = data.goal || 'Untitled task';

        tasks.push({
          task_id: data.task_id,
          title: goal,
          goal,
          status,
          source: 'workspace',
          orchestrator_mode: 'hybrid',
          agent: 'HybridOrchestratorV4',
          started_at: data.created_at,
          completed_at: data.updated_at && status !== 'active' ? data.updated_at : undefined,
          created_at: data.created_at,
          summary: data.error || undefined,
          file_path: `redis:${key}`,
        });
      } catch (err) {
        console.warn(`[tasks/list] Failed to parse Redis task ${key}:`, err);
      }
    }
  } catch (error) {
    console.error('[tasks/list] Failed to fetch tasks from Redis:', error);
  }

  return tasks;
}

export async function GET(_request: NextRequest) {
  try {
    const tasks: NormalisedTask[] = [];

    // Collect tasks from Redis (hybrid orchestrator active tasks)
    tasks.push(...await collectTasksFromRedis());

    // Collect orchestrator-level tasks (workspace)
    tasks.push(
      ...await collectTasksFromDirectory(ORCHESTRATOR_DIR, 'workspace')
    );

    // Collect project-level tasks
    try {
      const projectFolders = await fs.readdir(PROJECTS_DIR);
      for (const projectFolder of projectFolders) {
        const tasksDir = path.join(PROJECTS_DIR, projectFolder, 'tasks');
        tasks.push(
          ...await collectTasksFromDirectory(tasksDir, 'project', projectFolder)
        );
      }
    } catch {
      // Projects dir missing: ignore
    }

    tasks.sort((a, b) => {
      const timeA = new Date(a.started_at || a.created_at || 0).getTime();
      const timeB = new Date(b.started_at || b.created_at || 0).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({ tasks, count: tasks.length });
  } catch (error) {
    console.error('[tasks/list] Failed to list tasks:', error);
    return NextResponse.json({ tasks: [], count: 0, error: String(error) }, { status: 500 });
  }
}
