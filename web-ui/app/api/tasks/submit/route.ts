import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

/**
 * POST /api/tasks/submit
 *
 * Submit a new task to the autonomous agent task queue.
 * Tasks are written to orchestrator/tasks/pending/ and will be
 * automatically picked up by the task monitor service.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { title, description, priority = "normal" } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: "Missing required fields: title, description" },
        { status: 400 }
      );
    }

    // Validate priority
    const validPriorities = ["critical", "high", "normal", "low"];
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${validPriorities.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate max_agent_depth if provided
    const maxDepth = body.config?.max_agent_depth || 3;
    if (maxDepth < 1 || maxDepth > 5) {
      return NextResponse.json(
        { error: "max_agent_depth must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Create task object
    const taskId = uuidv4();
    const now = new Date().toISOString();

    const task = {
      task_id: taskId,
      title,
      description,
      priority,
      created_at: now,
      created_by: "web-app",
      context: body.context || {},
      config: {
        max_dialogue_turns: body.config?.max_dialogue_turns || 20,
        timeout_minutes: body.config?.timeout_minutes || 60,
        gpt_model: body.config?.gpt_model || "gpt-4",
        allow_sub_agents: body.config?.allow_sub_agents !== false,
        max_agent_depth: maxDepth,
      },
      status: "pending",
    };

    // Write task file to pending directory
    const projectRoot = path.join(process.cwd(), "..");
    const pendingDir = path.join(projectRoot, "orchestrator", "tasks", "pending");

    // Ensure pending directory exists
    await fs.mkdir(pendingDir, { recursive: true });

    const taskFile = path.join(pendingDir, `${taskId}.json`);

    await fs.writeFile(taskFile, JSON.stringify(task, null, 2), "utf-8");

    console.log(`Task submitted: ${title} (${taskId})`);

    return NextResponse.json({
      success: true,
      task_id: taskId,
      message: "Task submitted successfully and queued for processing",
      task: {
        task_id: taskId,
        title,
        priority,
        status: "pending",
        created_at: now,
      },
    });
  } catch (error: any) {
    console.error("Error submitting task:", error);

    return NextResponse.json(
      {
        error: "Failed to submit task",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tasks/submit
 *
 * Get information about task submission endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/tasks/submit",
    method: "POST",
    description: "Submit a new task to the autonomous agent queue",
    required_fields: {
      title: "string - Short task title",
      description: "string - Detailed task description",
    },
    optional_fields: {
      priority: "string - critical|high|normal|low (default: normal)",
      context: "object - Additional context (files, dependencies, etc.)",
      config: {
        max_dialogue_turns: "number - Max orchestrator turns (default: 20)",
        timeout_minutes: "number - Max execution time (default: 60)",
        gpt_model: "string - GPT model to use (default: gpt-4)",
        allow_sub_agents: "boolean - Allow sub-agent spawning (default: true)",
        max_agent_depth: "number - Max agent nesting (default: 3)",
      },
    },
    example: {
      title: "Implement user authentication",
      description: "Add JWT-based authentication to the API with login/logout endpoints",
      priority: "high",
      context: {
        project: "api-server",
        files: ["server/auth.ts", "server/middleware/auth.ts"],
      },
      config: {
        max_dialogue_turns: 15,
        timeout_minutes: 30,
      },
    },
  });
}
