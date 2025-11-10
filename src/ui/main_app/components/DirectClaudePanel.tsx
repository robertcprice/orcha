"use client";

import { useState, useEffect } from "react";
import { Bot, Send, CheckCircle2, XCircle, Clock, Zap, Loader2 } from "lucide-react";

interface DirectClaudeTask {
	task_id: string;
	task: string;
	status: string;
	created_at: string;
	updated_at: string;
	result?: any;
	error?: string;
	agent?: string;
}

export default function DirectClaudePanel() {

	const [task, setTask] = useState("");
	const [currentTask, setCurrentTask] = useState<DirectClaudeTask | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Poll for task status when task is active
	useEffect(() => {

		if (!currentTask || currentTask.status === "completed" || currentTask.status === "failed") {

			return;
		}

		const pollInterval = setInterval(async () => {

			try {

				const response = await fetch(`/api/orchestrator/status/${currentTask.task_id}`);
				if (response.ok) {

					const updatedTask = await response.json();
					setCurrentTask(updatedTask);
				}
			} catch (error) {

				console.error("Error polling task status:", error);
			}
		}, 2000); // Poll every 2 seconds

		return () => clearInterval(pollInterval);

	}, [currentTask]);

	const handleSubmit = async () => {

		if (!task.trim()) {

			setError("Please enter a task");
			return;
		}

		setError(null);
		setIsSubmitting(true);

		try {

			const response = await fetch("/api/orchestrator/submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					task: task.trim()
				}),
			});

			if (response.ok) {

				const result = await response.json();

				// Initialize task state
				setCurrentTask({
					task_id: result.task_id,
					task,
					agent: "ORCHESTRATOR",
					status: "planning",
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				});

			} else {

				const errorData = await response.json();
				setError(errorData.error || "Failed to submit task");
			}
		} catch (error) {

			console.error("Error submitting task:", error);
			setError("Network error - failed to submit task");
		} finally {

			setIsSubmitting(false);
		}
	};

	const handleReset = () => {

		setCurrentTask(null);
		setTask("");
		setError(null);
	};

	const getStatusIcon = (status: string) => {

		switch (status) {

			case "executing":
				return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
			case "completed":
				return <CheckCircle2 className="w-5 h-5 text-green-400" />;
			case "failed":
				return <XCircle className="w-5 h-5 text-red-400" />;
			default:
				return <Clock className="w-5 h-5 text-gray-400" />;
		}
	};

	const getStatusText = (status: string) => {

		switch (status) {

			case "planning":
				return "Orchestrator analyzing task and creating execution plan...";
			case "delegating":
				return "Delegating work to specialized agents...";
			case "executing":
				return "Agents executing assigned tasks...";
			case "completed":
				return "Orchestration completed successfully";
			case "failed":
				return "Orchestration failed";
			default:
				return status;
		}
	};

	return (
		<div className="bg-secondary/30 backdrop-blur-sm border border-border rounded-lg p-5">
			<div className="flex items-center gap-2 mb-4">
				<Bot className="w-5 h-5 text-purple-400" />
				<h2 className="text-xl font-semibold">Task Orchestrator</h2>
				<span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
					AI-Powered Planning
				</span>
			</div>

			<p className="text-sm text-muted-foreground mb-4">
				Submit your task and let Claude orchestrate the work - analyzing requirements, planning execution, and delegating to specialized agents.
			</p>

			{/* Task Input */}
			{!currentTask && (
				<div className="space-y-3">
					{/* Task Input */}
					<div>
						<label className="text-sm font-medium text-muted-foreground block mb-2">
							Describe what you want to accomplish
						</label>
						<textarea
							value={task}
							onChange={(e) => setTask(e.target.value)}
							placeholder="e.g., Build a data validation system that checks incoming trade data&#10;e.g., Refactor the training pipeline to support multiple models&#10;e.g., Add comprehensive error handling and logging to the backtest framework"
							rows={5}
							className="w-full px-3 py-2 rounded-md bg-secondary/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
						/>
					</div>

					{error && (
						<div className="p-3 rounded-md bg-error/10 border border-error/30 text-error text-sm flex items-center gap-2">
							<XCircle className="w-4 h-4" />
							{error}
						</div>
					)}

					<button
						onClick={handleSubmit}
						disabled={isSubmitting || !task.trim()}
						className="w-full px-4 py-2 rounded-md bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-500/80 hover:to-blue-500/80 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								Analyzing task...
							</>
						) : (
							<>
								<Bot className="w-4 h-4" />
								Start Orchestration
							</>
						)}
					</button>
				</div>
			)}

			{/* Task Status */}
			{currentTask && (
				<div className="space-y-4">
					{/* Status Header */}
					<div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border">
						<div className="flex items-center gap-3">
							{getStatusIcon(currentTask.status)}
							<div>
								<p className="text-sm font-medium">{getStatusText(currentTask.status)}</p>
								<p className="text-xs text-muted-foreground">
									Agent: {currentTask.agent} • Task ID: {currentTask.task_id}
								</p>
							</div>
						</div>
						{(currentTask.status === "completed" || currentTask.status === "failed") && (
							<button
								onClick={handleReset}
								className="px-3 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 border border-primary/30 text-sm font-medium transition-colors"
							>
								New Task
							</button>
						)}
					</div>

					{/* Task Display */}
					<div className="p-3 rounded-lg bg-background/30 border border-border/50">
						<p className="text-xs font-medium text-muted-foreground mb-1">Task:</p>
						<p className="text-sm text-foreground">{currentTask.task}</p>
					</div>

					{/* Result Display */}
					{currentTask.result && (
						<div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
							<div className="flex items-center gap-2 mb-2">
								<CheckCircle2 className="w-4 h-4 text-green-400" />
								<p className="text-sm font-medium text-green-400">Execution Results</p>
							</div>
							<div className="text-xs text-muted-foreground space-y-1">
								<p className="whitespace-pre-wrap">
									{typeof currentTask.result === 'string'
										? currentTask.result
										: JSON.stringify(currentTask.result, null, 2)}
								</p>
							</div>
						</div>
					)}

					{/* Error Display */}
					{currentTask.error && (
						<div className="p-3 rounded-lg bg-error/10 border border-error/30">
							<div className="flex items-center gap-2 mb-2">
								<XCircle className="w-4 h-4 text-error" />
								<p className="text-sm font-medium text-error">Error</p>
							</div>
							<p className="text-xs text-error/80">{currentTask.error}</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
