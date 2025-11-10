import { NextRequest, NextResponse } from 'next/server';
import {
  listOrchestratorProjects,
  createOrchestratorProject,
  deleteOrchestratorProject,
  getCurrentProject,
  setCurrentProject,
} from '@/server/projects';

/**
 * GET /api/projects - List all orchestrator projects
 */
export async function GET() {
  try {
    const projects = listOrchestratorProjects();
    const currentProject = getCurrentProject();

    return NextResponse.json({
      ok: true,
      projects,
      currentProject,
    });
  } catch (error: any) {
    console.error('Error listing projects:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to list projects', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects - Create a new project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Project name is required' },
        { status: 400 }
      );
    }

    const project = createOrchestratorProject(name.trim(), description?.trim());

    return NextResponse.json({
      ok: true,
      project,
    });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to create project' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects?id=xxx - Delete a project
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    deleteOrchestratorProject(projectId);

    return NextResponse.json({
      ok: true,
      message: `Project ${projectId} deleted successfully`,
    });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to delete project' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects - Switch current project
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    setCurrentProject(projectId);

    return NextResponse.json({
      ok: true,
      currentProject: projectId,
    });
  } catch (error: any) {
    console.error('Error switching project:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to switch project' },
      { status: 500 }
    );
  }
}
