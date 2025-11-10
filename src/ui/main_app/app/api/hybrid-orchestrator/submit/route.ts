import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import Redis from "ioredis";
import fs from "fs/promises";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379/0");
// FIX: Go up THREE levels to reach project root (src/ui/main_app -> src/ui -> src -> project root)
const projectRoot = path.resolve(process.cwd(), "..", "..", "..");
const forceOffline = process.env.HYBRID_FORCE_OFFLINE === "true";
const ACTIVE_STATUSES = new Set([
	"analyzing",
	"planning",
	"executing",
	"running",
	"reviewing",
	"refining",
	"documenting",
	"finalizing"
]);

async function failStaleActiveTasks() {
	const keys = await redis.keys("algomind.hybrid.task.*");
	if (!keys.length) return;

	const threshold = Number(process.env.HYBRID_TASK_STALE_MS || 5 * 60 * 1000);
	const now = Date.now();

	for (const key of keys) {
		const data = await redis.hgetall(key);
		if (!data || !ACTIVE_STATUSES.has(data.status || "")) {
			continue;
		}

		const updatedAt = data.updated_at || data.created_at;
		const lastTouched = updatedAt ? Date.parse(updatedAt) : 0;

		if (lastTouched && now - lastTouched > threshold) {
			await redis.hset(key, {
				status: "failed",
				error: "Task marked as failed after inactivity timeout.",
				updated_at: new Date().toISOString(),
			});
		}
	}
}

/**
 * POST /api/hybrid-orchestrator/submit
 *
 * Submits a goal to the Unified AI Orchestration System.
 *
 * Workflow: Claude plan → Multi-AI enrichment → Iterative implementation → Automated review → Documentation
 */
export async function POST(request: NextRequest) {

	try {

		await failStaleActiveTasks();

		// Check if required API keys are set
        const { goal, context, claudePlan } = await request.json();

		// Validate input
		if (!goal || typeof goal !== "string" || goal.trim().length === 0) {

			return NextResponse.json(
				{ error: "goal is required and must be a non-empty string" },
				{ status: 400 }
			);
		}

		// Use provided plan or create a basic one
		let finalClaudePlan = claudePlan;
        if (!claudePlan || typeof claudePlan !== "string" || claudePlan.trim().length === 0) {
            // Create a simple generic plan
            finalClaudePlan = `1. Analyze the task requirements\n2. Plan the implementation approach\n3. Implement the solution\n4. Test the implementation\n5. Document the code`;
            console.log(`📝 Using generic plan template for: "${goal}"`);
        }

        // Check required API keys for multi-AI enrichment
        const missingKeys = [];
        if (!process.env.DEEPSEEK_API_KEY) missingKeys.push("DEEPSEEK_API_KEY");
        if (!process.env.GROK_API_KEY && !process.env.XAI_API_KEY) missingKeys.push("GROK_API_KEY or XAI_API_KEY");
        if (!process.env.GEMINI_API_KEY) missingKeys.push("GEMINI_API_KEY");

        // DEBUG: Log what keys we actually have
        console.log("[DEBUG] API Key Check:", {
            openai: !!process.env.OPENAI_API_KEY,
            deepseek: !!process.env.DEEPSEEK_API_KEY,
            grok: !!process.env.GROK_API_KEY,
            xai: !!process.env.XAI_API_KEY,
            gemini: !!process.env.GEMINI_API_KEY,
            missingKeys,
            forceOffline
        });

        if (forceOffline || !process.env.OPENAI_API_KEY || missingKeys.length > 0) {
            // Offline simulation fallback: write task file for local task monitor
            console.warn("[HybridOrchestrator] API keys missing. Running in offline simulation mode.");

            const taskId = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const pendingDir = path.join(projectRoot, "orchestrator", "tasks", "pending");
            await fs.mkdir(pendingDir, { recursive: true });

            const taskPayload = {
                task_id: taskId,
                title: goal,
                description: finalClaudePlan,
                priority: "normal",
                orchestrator_mode: "hybrid",
                created_at: new Date().toISOString(),
                created_by: "web-app",
                context: context || {},
                config: {
                    max_dialogue_turns: 20,
                    timeout_minutes: 60,
                    gpt_model: "gpt-4o-mini",
                    allow_sub_agents: true,
                    max_agent_depth: 3,
                },
                status: "pending",
            };

            const taskFile = path.join(pendingDir, `${taskId}.json`);
            await fs.writeFile(taskFile, JSON.stringify(taskPayload, null, 2), "utf-8");

            return NextResponse.json({
                success: true,
                mode: "offline",
                task_id: taskId,
                message: "Offline simulation queued. Watch the monitoring dashboard for events.",
                status_endpoint: `/api/tasks/status?task_id=${taskId}`,
            });
        }

        // Generate task ID
        const taskId = `hybrid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Store initial state in Redis
		const taskKey = `algomind.hybrid.task.${taskId}`;
		await redis.hset(taskKey, {
			task_id: taskId,
			goal,
			context: JSON.stringify(context || {}),
			status: "planning",
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		});

		// Set expiration (24 hours)
		await redis.expire(taskKey, 86400);

		// Use hybrid orchestrator V4 script for iterative dialogue mode
        const pythonScript = path.join(projectRoot, "src", "orchestrator", "run_hybrid_task_v4.py");

		// Build command arguments
		const pythonArgs = [
			pythonScript,
			"--task-id",
			taskId,
			"--goal",
			goal,
			"--context",
			JSON.stringify(context || {}),
			"--verbose"  // Enable verbose mode for detailed logging
		];

		// Use venv Python to ensure all dependencies are available
		const venvPython = path.join(projectRoot, "venv", "bin", "python3");

	// Load API keys from parent .env file
	const dotenvPath = path.join(projectRoot, ".env");
	let envVars = {
		...process.env,
		PYTHONUNBUFFERED: "1",
		VERBOSE_MODE: "true"  // Enable verbose mode for detailed agent output
	};

	try {
		const envContent = await fs.readFile(dotenvPath, "utf8");
		envContent.split("\n").forEach((line) => {
			const match = line.match(/^([^=]+)=(.*)$/);
			if (match && !line.trim().startsWith("#")) {
				const [, key, value] = match;
				envVars[key.trim()] = value.trim();
			}
		});
	} catch (error) {
		console.warn("[HybridOrchestrator] Could not load .env file:", error);
	}

	const pythonProcess = spawn(venvPython, pythonArgs, {
		cwd: projectRoot,
		env: envVars,
	});

	const timeoutMs = Number(process.env.HYBRID_TASK_TIMEOUT_MS || 15 * 60 * 1000);
	const timeoutHandle = setTimeout(async () => {
		console.warn(`[HybridOrchestrator ${taskId}] Timeout reached (${timeoutMs}ms). Terminating process.`);
		pythonProcess.kill("SIGTERM");
		await redis.hset(taskKey, {
			status: "failed",
			error: `Task timed out after ${Math.round(timeoutMs / 60000)} minutes without completion.`,
			updated_at: new Date().toISOString(),
		});
	}, timeoutMs);

		// Capture output (for debugging, not returned to client)
		pythonProcess.stdout.on("data", (data) => {

			console.log(`[HybridOrchestrator ${taskId}] ${data.toString()}`);
		});

		pythonProcess.stderr.on("data", (data) => {

			console.error(`[HybridOrchestrator ${taskId}] ERROR: ${data.toString()}`);
		});

	pythonProcess.on("close", async (code) => {
		clearTimeout(timeoutHandle);

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
			message: "Task submitted to AI Orchestration System",
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
