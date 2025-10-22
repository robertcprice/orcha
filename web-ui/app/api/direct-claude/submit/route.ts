import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { createClient } from "redis";
import crypto from "crypto";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export async function POST(request: NextRequest) {
	try {
		// Check if ANTHROPIC_API_KEY is set
		if (!process.env.ANTHROPIC_API_KEY) {
			return NextResponse.json(
				{
					success: false,
					error: "ANTHROPIC_API_KEY not set",
					message: "Please set ANTHROPIC_API_KEY environment variable before using Direct Claude. See orchestrator_setup_guide.md for instructions.",
				},
				{ status: 400 }
			);
		}

		const body = await request.json();
		const { task, agent } = body;

		if (!task || typeof task !== "string") {
			return NextResponse.json(
				{ success: false, error: "Task is required and must be a string" },
				{ status: 400 }
			);
		}

		// Generate task ID
		const taskId = `dc_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

		// Connect to Redis
		const redis = createClient({ url: REDIS_URL });
		await redis.connect();

		try {
			// Initialize task state in Redis
			const taskData = {
				task_id: taskId,
				task: task.trim(),
				agent: agent || "IM",
				status: "executing",
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};

			await redis.hSet(`algomind.direct.claude.${taskId}`, taskData as any);
			await redis.expire(`algomind.direct.claude.${taskId}`, 86400); // 24 hour TTL

			// Spawn background process to execute task
			const projectRoot = process.cwd().replace("/ui-agent-console", "");
			const pythonScript = `${projectRoot}/orchestrator/run_direct_claude_task.py`;

			const childProcess = spawn(
				"python3",
				[pythonScript, "--task-id", taskId, "--task", task.trim(), "--agent", agent || "IM"],
				{
					detached: true,
					stdio: "ignore",
					env: {
						...process.env,
						PYTHONPATH: projectRoot,
					},
				}
			);

			childProcess.unref(); // Allow parent process to exit independently

			console.log(`[DirectClaude] Spawned task ${taskId} with PID ${childProcess.pid}`);

			return NextResponse.json({
				success: true,
				task_id: taskId,
				message: "Task submitted for execution",
			});

		} finally {
			await redis.quit();
		}

	} catch (error: any) {
		console.error("[DirectClaude] Error submitting task:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Internal server error",
				message: error.message || "Unknown error occurred",
			},
			{ status: 500 }
		);
	}
}
