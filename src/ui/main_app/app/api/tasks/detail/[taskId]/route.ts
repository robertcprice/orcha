import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { getEventsBySession } from '@/server/db';

const PROJECTS_DIR = path.join(process.cwd(), '../projects');
const ORCHESTRATOR_DIR = path.join(process.cwd(), '../orchestrator/tasks');

type TaskStatus = 'pending' | 'active' | 'completed' | 'failed';

const STATUS_DIRS: Record<TaskStatus, string> = {
  pending: 'pending',
  active: 'active',
  completed: 'completed',
  failed: 'failed',
};

interface LocatedTaskFile {
  filePath: string;
  source: 'workspace' | 'project';
  project?: string;
  status: TaskStatus;
}

async function findTaskFile(taskId: string): Promise<LocatedTaskFile | undefined> {
  const candidates: LocatedTaskFile[] = [];

  for (const [status, dirName] of Object.entries(STATUS_DIRS) as [TaskStatus, string][]) {
    candidates.push({
      filePath: path.join(ORCHESTRATOR_DIR, dirName, `${taskId}.json`),
      source: 'workspace',
      status,
    });
  }

  try {
    const projectFolders = await fs.readdir(PROJECTS_DIR);
    for (const projectFolder of projectFolders) {
      for (const [status, dirName] of Object.entries(STATUS_DIRS) as [TaskStatus, string][]) {
        candidates.push({
          filePath: path.join(PROJECTS_DIR, projectFolder, 'tasks', dirName, `${taskId}.json`),
          source: 'project',
          project: projectFolder,
          status,
        });
      }
    }
  } catch {
    // ignore missing projects dir
  }

  for (const candidate of candidates) {
    try {
      await fs.access(candidate.filePath);
      return candidate;
    } catch {
      // continue
    }
  }

  return undefined;
}

export async function GET(_request: NextRequest, { params }: { params: { taskId: string } }) {
  const { taskId } = params;

  try {
    const located = await findTaskFile(taskId);
    if (!located) {
      return NextResponse.json({ ok: false, error: 'Task not found' }, { status: 404 });
    }

    const raw = JSON.parse(await fs.readFile(located.filePath, 'utf8'));
    const events = getEventsBySession(taskId, 200);

    const response = {
      ok: true,
      task: {
        task_id: raw.task_id || taskId,
        title: raw.title || raw.goal || raw.description || 'Untitled task',
        goal: raw.goal || raw.title || '',
        description: raw.description,
        status: located.status,
        project: located.project,
        source: located.source,
        orchestrator_mode: raw.orchestrator_mode,
        agent: raw.current_agent || raw.agent || raw.result?.agent || '',
        created_at: raw.created_at,
        started_at: raw.started_at || raw.created_at,
        completed_at: raw.completed_at || raw.finished_at,
        config: raw.config,
        context: raw.context,
        result: raw.result,
        tree_structure: raw.tree_structure, // ✅ Include tree structure for visualization restore
        file_path: located.filePath,
      },
      events,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[tasks/detail] Failed to load task ${taskId}:`, error);
    return NextResponse.json(
      { ok: false, error: 'Failed to load task' },
      { status: 500 },
    );
  }
}
