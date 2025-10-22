import { NextRequest, NextResponse } from "next/server";
import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ taskId: string }> }
) {
	try {
		const { taskId } = await params;

		if (!taskId) {
			return NextResponse.json(
				{ error: "Task ID is required" },
				{ status: 400 }
			);
		}

		// Connect to Redis
		const redis = createClient({ url: REDIS_URL });
		await redis.connect();

		try {
			// Get task data from Redis
			const taskData = await redis.hGetAll(`algomind.direct.claude.${taskId}`);

			if (!taskData || Object.keys(taskData).length === 0) {
				return NextResponse.json(
					{ error: "Task not found" },
					{ status: 404 }
				);
			}

			// Parse result and error if they exist
			let result = taskData.result;
			let error = taskData.error;

			if (result) {
				try {
					result = JSON.parse(result);
				} catch {
					// Keep as string if not JSON
				}
			}

			return NextResponse.json({
				task_id: taskData.task_id,
				task: taskData.task,
				agent: taskData.agent,
				status: taskData.status,
				created_at: taskData.created_at,
				updated_at: taskData.updated_at,
				result,
				error,
			});

		} finally {
			await redis.quit();
		}

	} catch (error: any) {
		console.error("[DirectClaude] Error fetching task status:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				message: error.message || "Unknown error occurred",
			},
			{ status: 500 }
		);
	}
}
