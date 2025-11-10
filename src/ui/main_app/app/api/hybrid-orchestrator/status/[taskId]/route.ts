import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379/0");

/**
 * GET /api/hybrid-orchestrator/status/[taskId]
 *
 * Returns the current status and results of a hybrid orchestrator task
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ taskId: string }> }
) {

	try {

		const { taskId } = await params;

		if (!taskId) {

			return NextResponse.json(
				{ error: "taskId is required" },
				{ status: 400 }
			);
		}

		// Fetch task data from Redis
		const taskKey = `algomind.hybrid.task.${taskId}`;
		const taskData = await redis.hgetall(taskKey);

		if (!taskData || Object.keys(taskData).length === 0) {

			return NextResponse.json(
				{ error: "Task not found" },
				{ status: 404 }
			);
		}

		// Parse JSON fields
		const response: any = {
			task_id: taskData.task_id,
			goal: taskData.goal,
			status: taskData.status,
			created_at: taskData.created_at,
			updated_at: taskData.updated_at,
		};

		// Auto-fail stale active tasks
		await autoFailStaleTask(taskKey, taskData);
		if (ACTIVE_STATUSES.has(response.status)) {
			const refreshed = await redis.hgetall(taskKey);
			if (refreshed.status !== response.status) {
				response.status = refreshed.status;
				response.error = refreshed.error;
				response.updated_at = refreshed.updated_at;
			}
		}

		// Add optional fields if they exist
		if (taskData.context) {

			try {

				response.context = JSON.parse(taskData.context);
			} catch (e) {

				response.context = {};
			}
		}

		if (taskData.plan) {

			try {

				response.plan = JSON.parse(taskData.plan);
			} catch (e) {

				response.plan = null;
			}
		}

		if (taskData.execution_result) {

			try {

				response.execution_result = JSON.parse(taskData.execution_result);
			} catch (e) {

				response.execution_result = null;
			}
		}

		if (taskData.review_result) {

			try {

				response.review_result = JSON.parse(taskData.review_result);
			} catch (e) {

				response.review_result = null;
			}
		}

		if (taskData.documentation) {

			try {

				response.documentation = JSON.parse(taskData.documentation);
			} catch (e) {

				response.documentation = {};
			}
		}

		if (taskData.final_result) {

			try {

				response.final_result = JSON.parse(taskData.final_result);
			} catch (e) {

				response.final_result = null;
			}
		}

		if (taskData.summary) {

			response.summary = taskData.summary;
		}

		if (taskData.error) {

			response.error = taskData.error;
		}

		if (taskData.exit_code) {

			response.exit_code = parseInt(taskData.exit_code);
		}

		return NextResponse.json(response);

	} catch (error) {

		console.error("Error fetching hybrid orchestrator status:", error);
		return NextResponse.json(
			{ error: "Failed to fetch task status" },
			{ status: 500 }
		);
	}
}
const ACTIVE_STATUSES = new Set([
	"analyzing",
	"planning",
	"executing",
	"running",
	"reviewing",
	"refining",
	"documenting",
	"finalizing",
]);

async function markTaskFailed(taskKey: string, reason: string) {
	await redis.hset(taskKey, {
		status: "failed",
		error: reason,
		updated_at: new Date().toISOString(),
	});
}

async function autoFailStaleTask(taskKey: string, taskData: Record<string, string>) {
	const threshold = Number(process.env.HYBRID_TASK_STALE_MS || 5 * 60 * 1000);
	const now = Date.now();
	const updatedAt = taskData.updated_at || taskData.created_at;
	const lastTouch = updatedAt ? Date.parse(updatedAt) : 0;

	if (!ACTIVE_STATUSES.has(taskData.status || "") || !lastTouch) {
		return;
	}

	if (now - lastTouch > threshold) {
		await markTaskFailed(taskKey, "Task marked as failed after inactivity timeout.");
	}
}
