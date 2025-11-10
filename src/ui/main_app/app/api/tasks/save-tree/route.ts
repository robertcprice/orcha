import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task_id, tree_structure, project } = body;

    if (!task_id || !tree_structure) {
      return NextResponse.json(
        { error: 'task_id and tree_structure are required' },
        { status: 400 }
      );
    }

    // Determine task file path
    const projectRoot = process.cwd().replace('/web-ui', '');
    const projectName = project || 'Smart Market Solutions';
    const tasksDir = path.join(projectRoot, 'projects', projectName, 'tasks', 'completed');
    const taskFilePath = path.join(tasksDir, `${task_id}.json`);

    // Ensure directory exists
    await fs.mkdir(tasksDir, { recursive: true });

    // Read existing task file if it exists
    let taskData: any = {
      task_id,
      title: tree_structure.title || 'Orchestration Task',
      status: 'completed',
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };

    try {
      const existing = await fs.readFile(taskFilePath, 'utf-8');
      taskData = JSON.parse(existing);
    } catch (err) {
      // File doesn't exist yet, use defaults
    }

    // Add/update tree structure
    taskData.tree_structure = tree_structure;

    // Save to file
    await fs.writeFile(taskFilePath, JSON.stringify(taskData, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Tree structure saved',
      path: taskFilePath,
    });
  } catch (error: any) {
    console.error('Error saving tree structure:', error);
    return NextResponse.json(
      { error: 'Failed to save tree structure', details: error.message },
      { status: 500 }
    );
  }
}
