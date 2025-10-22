import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

/**
 * GET /api/tasks/status?task_id=xxx
 *
 * Get the current status of a task by checking all task directories.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("task_id");

    if (!taskId) {
      return NextResponse.json(
        { error: "Missing required parameter: task_id" },
        { status: 400 }
      );
    }

    // Check all task directories
    const projectRoot = path.join(process.cwd(), "..");
    const tasksDir = path.join(projectRoot, "orchestrator", "tasks");

    const directories = ["pending", "active", "completed", "failed", "archived"];

    for (const dir of directories) {
      const taskFile = path.join(tasksDir, dir, `${taskId}.json`);

      try {
        const content = await fs.readFile(taskFile, "utf-8");
        const task = JSON.parse(content);

        return NextResponse.json({
          success: true,
          task,
          location: dir,
        });
      } catch (error) {
        // File doesn't exist in this directory, continue
        continue;
      }
    }

    // Task not found in any directory
    return NextResponse.json(
      {
        error: "Task not found",
        task_id: taskId,
        message: "Task may have been deleted or does not exist",
      },
      { status: 404 }
    );
  } catch (error: any) {
    console.error("Error getting task status:", error);

    return NextResponse.json(
      {
        error: "Failed to get task status",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
