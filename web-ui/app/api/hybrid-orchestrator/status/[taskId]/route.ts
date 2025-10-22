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
