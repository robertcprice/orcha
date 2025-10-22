import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getCurrentProject } from "@/server/projects";

const getProjectTasksDir = () => {
  const currentProject = getCurrentProject();

  if (!currentProject) {
    // Fallback to orchestrator tasks directory
    const projectRoot = path.join(process.cwd(), "..");
    return path.join(projectRoot, "orchestrator", "tasks");
  }

  // Use current project's tasks directory
  const projectRoot = path.join(process.cwd(), "..");
  return path.join(projectRoot, "projects", currentProject, "tasks");
};

/**
 * GET /api/tasks/status?task_id=xxx
 *
 * Get the current status of a task by checking all task directories.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("task_id");

    const tasksDir = getProjectTasksDir();
    const directories = ["pending", "active", "completed", "failed", "archived"];

    // If no task_id provided, return all tasks
    if (!taskId) {
      const allTasks: any[] = [];

      for (const dir of directories) {
        const dirPath = path.join(tasksDir, dir);

        try {
          const files = await fs.readdir(dirPath);

          for (const file of files) {
            if (file.endsWith('.json')) {
              try {
                const content = await fs.readFile(path.join(dirPath, file), 'utf-8');
                const task = JSON.parse(content);
                allTasks.push({
                  ...task,
                  status: dir,
                  task_id: task.task_id || file.replace('.json', ''),
                });
              } catch {}
            }
          }
        } catch {
          // Directory doesn't exist, continue
          continue;
        }
      }

      return NextResponse.json({
        ok: true,
        tasks: allTasks,
        count: allTasks.length,
      });
    }

    // Get specific task by ID
    for (const dir of directories) {
      const taskFile = path.join(tasksDir, dir, `${taskId}.json`);

      try {
        const content = await fs.readFile(taskFile, "utf-8");
        const task = JSON.parse(content);

        return NextResponse.json({
          ok: true,
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
        ok: false,
        error: "Task not found",
        task_id: taskId,
      },
      { status: 404 }
    );
  } catch (error: any) {
    console.error("Error getting task status:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to get task status",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
