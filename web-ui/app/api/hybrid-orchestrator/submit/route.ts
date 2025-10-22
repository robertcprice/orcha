import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379/0");

/**
 * POST /api/hybrid-orchestrator/submit
 *
 * Submits a goal to the HybridOrchestrator V4 (Iterative Dialogue).
 * Claude analyzes → ChatGPT provides info → iterative dialogue at each stage.
 */
export async function POST(request: NextRequest) {

	try {

		// Check if required API keys are set
		if (!process.env.OPENAI_API_KEY) {
			return NextResponse.json(
				{
					success: false,
					error: "OPENAI_API_KEY not set",
					message: "Please set OPENAI_API_KEY environment variable before using the Hybrid Orchestrator. See hybrid_orchestrator_web_guide.md for instructions.",
				},
				{ status: 400 }
			);
		}

		if (!process.env.ANTHROPIC_API_KEY) {
			return NextResponse.json(
				{
					success: false,
					error: "ANTHROPIC_API_KEY not set",
					message: "Please set ANTHROPIC_API_KEY environment variable before using the Hybrid Orchestrator. See hybrid_orchestrator_web_guide.md for instructions.",
				},
				{ status: 400 }
			);
		}

		const { goal, context, maxTurns } = await request.json();

		// Validate input
		if (!goal || typeof goal !== "string" || goal.trim().length === 0) {

			return NextResponse.json(
				{ error: "goal is required and must be a non-empty string" },
				{ status: 400 }
			);
		}

		// Always use V4 iterative mode (analyze → plan → act cycle)
		const executionMode = "v4_iterative";
		const maxDialogueTurns = maxTurns || 20;

		// Generate task ID
		const taskId = `hybrid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		// Store initial state in Redis
		const taskKey = `algomind.hybrid.task.${taskId}`;
		await redis.hset(taskKey, {
			task_id: taskId,
			goal,
			context: JSON.stringify(context || {}),
			mode: executionMode,
			status: "analyzing",
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		});

		// Set expiration (24 hours)
		await redis.expire(taskKey, 86400);

		// Always use V4 iterative script
		const projectRoot = path.resolve(process.cwd(), "..");
		const pythonScript = path.join(projectRoot, "orchestrator", "run_hybrid_task_v4.py");

		// Build command arguments for V4 iterative mode
		const pythonArgs = [
			pythonScript,
			"--task-id",
			taskId,
			"--goal",
			goal,
			"--context",
			JSON.stringify(context || {}),
			"--max-turns",
			maxDialogueTurns.toString(),
		];

		// Use venv Python to ensure all dependencies are available
		const venvPython = path.join(projectRoot, "venv", "bin", "python3");

		const pythonProcess = spawn(venvPython, pythonArgs, {
			cwd: projectRoot,
			env: {
				...process.env,
				PYTHONUNBUFFERED: "1",
			},
		});

		// Capture output (for debugging, not returned to client)
		pythonProcess.stdout.on("data", (data) => {

			console.log(`[HybridOrchestrator ${taskId}] ${data.toString()}`);
		});

		pythonProcess.stderr.on("data", (data) => {

			console.error(`[HybridOrchestrator ${taskId}] ERROR: ${data.toString()}`);
		});

		pythonProcess.on("close", async (code) => {

			console.log(`[HybridOrchestrator ${taskId}] Process exited with code ${code}`);

			// Update final status
			await redis.hset(taskKey, {
				status: code === 0 ? "completed" : "failed",
				updated_at: new Date().toISOString(),
				exit_code: code,
			});
		});

		// Return immediately with task ID
		return NextResponse.json({
			success: true,
			task_id: taskId,
			mode: executionMode,
			message: "Task submitted to HybridOrchestrator V4 (Iterative Dialogue)",
			status_endpoint: `/api/hybrid-orchestrator/status/${taskId}`,
		});

	} catch (error) {

		console.error("Error submitting to HybridOrchestrator:", error);
		return NextResponse.json(
			{ error: "Failed to submit task to HybridOrchestrator" },
			{ status: 500 }
		);
	}
}
