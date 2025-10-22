import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

/**
 * GET /api/tasks/list?status=pending|active|completed|failed|all
 *
 * List tasks by status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || "all";

    const projectRoot = path.join(process.cwd(), "..");
    const tasksDir = path.join(projectRoot, "orchestrator", "tasks");

    // Determine which directories to check
    let directories: string[];

    if (statusFilter === "all") {
      directories = ["pending", "active", "completed", "failed"];
    } else if (["pending", "active", "completed", "failed", "archived"].includes(statusFilter)) {
      directories = [statusFilter];
    } else {
      return NextResponse.json(
        { error: "Invalid status filter. Use: pending|active|completed|failed|all" },
        { status: 400 }
      );
    }

    // Collect tasks from directories
    const tasks: any[] = [];

    for (const dir of directories) {
      const dirPath = path.join(tasksDir, dir);

      try {
        const files = await fs.readdir(dirPath);

        for (const file of files) {
          if (!file.endsWith(".json")) continue;

          try {
            const filePath = path.join(dirPath, file);
            const content = await fs.readFile(filePath, "utf-8");
            const task = JSON.parse(content);

            tasks.push({
              ...task,
              location: dir,
            });
          } catch (error) {
            console.error(`Error reading task file ${file}:`, error);
          }
        }
      } catch (error) {
        // Directory doesn't exist or can't be read
        console.warn(`Cannot read directory ${dir}:`, error);
      }
    }

    // Sort by created_at (newest first)
    tasks.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({
      success: true,
      count: tasks.length,
      tasks,
      filter: statusFilter,
    });
  } catch (error: any) {
    console.error("Error listing tasks:", error);

    return NextResponse.json(
      {
        error: "Failed to list tasks",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
