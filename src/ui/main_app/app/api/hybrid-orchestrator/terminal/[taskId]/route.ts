import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379/0");

/**
 * GET /api/hybrid-orchestrator/terminal/[taskId]
 *
 * Returns terminal feed logs for a hybrid orchestrator task
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

		// Fetch terminal logs from Redis
		const terminalKey = `algomind.terminal.${taskId}`;
		const logs = await redis.lrange(terminalKey, 0, -1);

		// Parse JSON logs
		const parsedLogs = logs.map(log => {
			try {
				return JSON.parse(log);
			} catch (e) {
				return {
					timestamp: new Date().toISOString(),
					level: "info",
					message: log
				};
			}
		});

		return NextResponse.json({
			task_id: taskId,
			logs: parsedLogs,
			count: parsedLogs.length
		});

	} catch (error) {

		console.error("Error fetching terminal feed:", error);
		return NextResponse.json(
			{ error: "Failed to fetch terminal feed" },
			{ status: 500 }
		);
	}
}
