import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379/0");

/**
 * GET /api/hybrid-orchestrator/active
 *
 * Returns the most recent active task (if any exists)
 * Checks for tasks with status: analyzing, planning, executing
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
			const isActive = ["analyzing", "planning", "executing", "running"].includes(taskData.status);

			if (isActive) {

				activeTasks.push({
					task_id: taskData.task_id,
					goal: taskData.goal,
					status: taskData.status,
					created_at: taskData.created_at,
					updated_at: taskData.updated_at,
				});
			}
		}

		// Sort by created_at (most recent first)
		activeTasks.sort((a, b) => {

			const dateA = new Date(a.created_at || 0).getTime();
			const dateB = new Date(b.created_at || 0).getTime();
			return dateB - dateA;
		});

		// Return most recent active task
		if (activeTasks.length > 0) {

			// Fetch full details for the most recent active task
			const taskId = activeTasks[0].task_id;
			const taskKey = `algomind.hybrid.task.${taskId}`;
			const fullTaskData = await redis.hgetall(taskKey);

			const response: any = {
				task_id: fullTaskData.task_id,
				goal: fullTaskData.goal,
				status: fullTaskData.status,
				created_at: fullTaskData.created_at,
				updated_at: fullTaskData.updated_at,
			};

			// Add optional fields
			if (fullTaskData.context) {

				try {

					response.context = JSON.parse(fullTaskData.context);
				} catch (e) {

					response.context = {};
				}
			}

			if (fullTaskData.plan) {

				try {

					response.plan = JSON.parse(fullTaskData.plan);
				} catch (e) {

					response.plan = null;
				}
			}

			if (fullTaskData.summary) {

				response.summary = fullTaskData.summary;
			}

			if (fullTaskData.error) {

				response.error = fullTaskData.error;
			}

			return NextResponse.json({ active_task: response });
		}

		return NextResponse.json({ active_task: null });

	} catch (error) {

		console.error("Error fetching active task:", error);
		return NextResponse.json(
			{ error: "Failed to fetch active task" },
			{ status: 500 }
		);
	}
}
