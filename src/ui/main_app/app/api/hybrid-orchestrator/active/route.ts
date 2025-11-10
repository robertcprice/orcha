import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379/0");

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

async function failIfStale(taskKey: string, taskData: Record<string, string>) {
	const updatedAt = taskData.updated_at || taskData.created_at;
	const lastTouched = updatedAt ? Date.parse(updatedAt) : 0;
	const threshold = Number(process.env.HYBRID_TASK_STALE_MS || 5 * 60 * 1000);

	if (!ACTIVE_STATUSES.has(taskData.status || "") || !lastTouched) {
		return;
	}

	if (Date.now() - lastTouched > threshold) {
		await redis.hset(taskKey, {
			status: "failed",
			error: "Task marked as failed after inactivity timeout.",
			updated_at: new Date().toISOString(),
		});
	}
}

/**
 * GET /api/hybrid-orchestrator/active
 *
 * Returns all active hybrid-orchestrator tasks (most recent first).
 * Active statuses include: analyzing, planning, executing, reviewing, refining, documenting, finalizing.
 */
export async function GET(request: NextRequest) {

	try {

		// Scan for all hybrid task keys
		const pattern = "algomind.hybrid.task.*";
		const keys = await redis.keys(pattern);

		if (keys.length === 0) {

			return NextResponse.json({ active_task: null });
		}

		// Check each task to find active ones
		const activeTasks = [];

		for (const key of keys) {

			const taskData = await redis.hgetall(key);

			if (!taskData || !taskData.status) {

				continue;
			}

			// Check if task is active (not completed or failed)
			const taskKey = key;

			await failIfStale(taskKey, taskData);

			const refreshed = await redis.hgetall(taskKey);

			const isActive = ACTIVE_STATUSES.has(refreshed.status);

			if (isActive) {

				activeTasks.push({
					task_id: refreshed.task_id,
					goal: refreshed.goal,
					status: refreshed.status,
					created_at: refreshed.created_at,
					updated_at: refreshed.updated_at,
				});
			}
		}

		// Sort by created_at (most recent first)
		activeTasks.sort((a, b) => {

			const dateA = new Date(a.created_at || 0).getTime();
			const dateB = new Date(b.created_at || 0).getTime();
			return dateB - dateA;
		});

		if (activeTasks.length === 0) {

			return NextResponse.json({ active_task: null, active_tasks: [] });
		}

		const detailedTasks = [];

		for (const task of activeTasks) {

			const taskKey = `algomind.hybrid.task.${task.task_id}`;
			const fullTaskData = await redis.hgetall(taskKey);

			if (!fullTaskData || Object.keys(fullTaskData).length === 0) {
				continue;
			}

			const response: any = {
				task_id: fullTaskData.task_id,
				goal: fullTaskData.goal,
				status: fullTaskData.status,
				created_at: fullTaskData.created_at,
				updated_at: fullTaskData.updated_at,
			};

			if (fullTaskData.context) {
				try {
					response.context = JSON.parse(fullTaskData.context);
				} catch {
					response.context = {};
				}
			}

			if (fullTaskData.plan) {
				try {
					response.plan = JSON.parse(fullTaskData.plan);
				} catch {
					response.plan = null;
				}
			}

			if (fullTaskData.execution_result) {
				try {
					response.execution_result = JSON.parse(fullTaskData.execution_result);
				} catch {
					response.execution_result = null;
				}
			}

			if (fullTaskData.review_result) {
				try {
					response.review_result = JSON.parse(fullTaskData.review_result);
				} catch {
					response.review_result = null;
				}
			}

			if (fullTaskData.documentation) {
				try {
					response.documentation = JSON.parse(fullTaskData.documentation);
				} catch {
					response.documentation = {};
				}
			}

			if (fullTaskData.final_result) {
				try {
					response.final_result = JSON.parse(fullTaskData.final_result);
				} catch {
					response.final_result = null;
				}
			}

			if (fullTaskData.summary) {
				response.summary = fullTaskData.summary;
			}

			if (fullTaskData.error) {
				response.error = fullTaskData.error;
			}

			detailedTasks.push(response);
		}

		if (detailedTasks.length === 0) {
			return NextResponse.json({ active_task: null, active_tasks: [] });
		}

		return NextResponse.json({
			active_task: detailedTasks[0],
			active_tasks: detailedTasks
		});

	} catch (error) {

		console.error("Error fetching active task:", error);
		return NextResponse.json(
			{ error: "Failed to fetch active task" },
			{ status: 500 }
		);
	}
}
