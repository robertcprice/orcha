"use client";

import { useState, useEffect, useRef } from "react";
import { Bot, Send, CheckCircle2, XCircle, Clock, Sparkles, Loader2 } from "lucide-react";

interface HybridTask {
	task_id: string;
	goal: string;
	status: string;
	created_at: string;
	updated_at: string;
	plan?: any;
	execution_result?: any;
	summary?: string;
	error?: string;
}

interface TerminalLog {
	timestamp: string;
	level: string;
	message: string;
}

export default function HybridOrchestratorPanel() {

	const [goal, setGoal] = useState("");
	const [currentTask, setCurrentTask] = useState<HybridTask | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([]);
	const terminalEndRef = useRef<HTMLDivElement>(null);
	const terminalContainerRef = useRef<HTMLDivElement>(null);

	// Check for active task on mount (restore after page refresh)
	useEffect(() => {

		const checkForActiveTask = async () => {

			try {

				const response = await fetch("/api/hybrid-orchestrator/active");
				if (response.ok) {

					const data = await response.json();
					if (data.active_task) {

						console.log("Found active task on mount:", data.active_task.task_id);
						setCurrentTask(data.active_task);
						setGoal(data.active_task.goal);
					}
				}
			} catch (error) {

				console.error("Error checking for active task:", error);
			}
		};

		checkForActiveTask();
	}, []); // Only run on mount

	// Poll for task status when task is active
	useEffect(() => {

		if (!currentTask || currentTask.status === "completed" || currentTask.status === "failed") {

			return;
		}

		const pollInterval = setInterval(async () => {

			try {

				const response = await fetch(`/api/hybrid-orchestrator/status/${currentTask.task_id}`);
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

	// Poll for terminal feed when task is active
	useEffect(() => {

		if (!currentTask) {

			setTerminalLogs([]);
			return;
		}

		// Initial fetch
		const fetchTerminalLogs = async () => {

			try {

				const response = await fetch(`/api/hybrid-orchestrator/terminal/${currentTask.task_id}`);
				if (response.ok) {

					const data = await response.json();
					setTerminalLogs(data.logs || []);
				}
			} catch (error) {

				console.error("Error fetching terminal logs:", error);
			}
		};

		fetchTerminalLogs();

		// Don't poll if task is completed or failed
		if (currentTask.status === "completed" || currentTask.status === "failed") {

			return;
		}

		// Poll for updates
		const pollInterval = setInterval(fetchTerminalLogs, 2000); // Poll every 2 seconds

		return () => clearInterval(pollInterval);

	}, [currentTask]);

	// Auto-scroll terminal to bottom when logs update (only container, not page)
	useEffect(() => {

		if (terminalContainerRef.current) {

			terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
		}
	}, [terminalLogs]);

	const handleSubmit = async () => {

		if (!goal.trim()) {

			setError("Please enter a goal");
			return;
		}

		setError(null);
		setIsSubmitting(true);

		try {

			const response = await fetch("/api/hybrid-orchestrator/submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ goal }),
			});

			if (response.ok) {

				const result = await response.json();

				// Initialize task state (V4 starts with analyzing)
				setCurrentTask({
					task_id: result.task_id,
					goal,
					status: "analyzing",
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				});

				// Don't clear goal until task completes (for reference)
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
		setGoal("");
		setError(null);
	};

	const getStatusIcon = (status: string) => {

		switch (status) {

			case "planning":
				return <Clock className="w-5 h-5 text-blue-400 animate-pulse" />;
			case "executing":
				return <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />;
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

			case "analyzing":
				return "Claude is analyzing the goal...";
			case "planning":
				return "ChatGPT is providing guidance...";
			case "executing":
				return "Claude agents are executing tasks...";
			case "completed":
				return "Task completed successfully";
			case "failed":
				return "Task failed";
			default:
				return status;
		}
	};

	return (
		<div className="bg-secondary/30 backdrop-blur-sm border border-border rounded-lg p-5">
			<div className="flex items-center gap-2 mb-4">
				<Sparkles className="w-5 h-5 text-primary" />
				<h2 className="text-xl font-semibold">Hybrid Orchestrator V4</h2>
				<span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
					Iterative Dialogue
				</span>
			</div>

			<p className="text-sm text-muted-foreground mb-4">
				Submit a goal and let Claude analyze while ChatGPT provides guidance through iterative dialogue at each stage.
			</p>

			{/* Goal Input */}
			{!currentTask && (
				<div className="space-y-3">
					<div>
						<label className="text-sm font-medium text-muted-foreground block mb-2">
							What would you like to accomplish?
						</label>
						<textarea
							value={goal}
							onChange={(e) => setGoal(e.target.value)}
							placeholder="e.g., Analyze the training pipeline and suggest optimizations&#10;e.g., Add comprehensive error handling to the data processor&#10;e.g., Create documentation for the agent system"
							rows={4}
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
						disabled={isSubmitting || !goal.trim()}
						className="w-full px-4 py-2 rounded-md bg-gradient-to-r from-primary to-blue-500 hover:from-primary/80 hover:to-blue-500/80 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								Submitting...
							</>
						) : (
							<>
								<Send className="w-4 h-4" />
								Submit to Hybrid Orchestrator
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
									Task ID: {currentTask.task_id}
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

					{/* Goal Display */}
					<div className="p-3 rounded-lg bg-background/30 border border-border/50">
						<p className="text-xs font-medium text-muted-foreground mb-1">Goal:</p>
						<p className="text-sm text-foreground">{currentTask.goal}</p>
					</div>

					{/* Plan Display */}
					{currentTask.plan && (
						<div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
							<div className="flex items-center gap-2 mb-2">
								<Bot className="w-4 h-4 text-blue-400" />
								<p className="text-sm font-medium text-blue-400">ChatGPT Execution Plan</p>
							</div>
							<div className="text-xs text-muted-foreground space-y-1">
								{currentTask.plan.tasks && Array.isArray(currentTask.plan.tasks) && (
									<div>
										<p className="font-medium mb-1">Tasks ({currentTask.plan.tasks.length}):</p>
										<ul className="list-disc list-inside ml-2 space-y-0.5">
											{currentTask.plan.tasks.slice(0, 5).map((task: any, i: number) => (
												<li key={`plan-task-${i}`}>{task.description || task.task_id}</li>
											))}
											{currentTask.plan.tasks.length > 5 && (
												<li className="text-muted-foreground">
													... and {currentTask.plan.tasks.length - 5} more
												</li>
											)}
										</ul>
									</div>
								)}
							</div>
						</div>
					)}

					{/* Execution Result */}
					{currentTask.execution_result && (
						<div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
							<div className="flex items-center gap-2 mb-2">
								<CheckCircle2 className="w-4 h-4 text-green-400" />
								<p className="text-sm font-medium text-green-400">Execution Results</p>
							</div>
							<div className="text-xs text-muted-foreground space-y-1">
								<p>
									<span className="font-medium">Status:</span> {currentTask.execution_result.status}
								</p>
								<p>
									<span className="font-medium">Completed Tasks:</span>{" "}
									{currentTask.execution_result.completed_tasks || 0}
								</p>
								{currentTask.execution_result.failed_tasks > 0 && (
									<p className="text-yellow-400">
										<span className="font-medium">Failed Tasks:</span>{" "}
										{currentTask.execution_result.failed_tasks}
									</p>
								)}
							</div>
						</div>
					)}

					{/* Summary */}
					{currentTask.summary && (
						<div className="p-3 rounded-lg bg-background/30 border border-border">
							<p className="text-xs font-medium text-muted-foreground mb-2">Summary:</p>
							<p className="text-sm text-foreground whitespace-pre-wrap">
								{currentTask.summary}
							</p>
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

					{/* Terminal Feed */}
					{terminalLogs.length > 0 && (
						<div className="p-3 rounded-lg bg-background/50 border border-border">
							<div className="flex items-center gap-2 mb-2">
								<Clock className="w-4 h-4 text-muted-foreground" />
								<p className="text-sm font-medium text-foreground">Activity Feed</p>
								<span className="text-xs text-muted-foreground">
									({terminalLogs.length} entries)
								</span>
							</div>
							<div ref={terminalContainerRef} className="space-y-1 max-h-96 overflow-y-auto">
								{terminalLogs.map((log, index) => (
									<div
										key={`terminal-log-${index}-${log.timestamp}`}
										className={`text-xs p-2 rounded ${
											log.level === "error"
												? "bg-error/10 text-error"
												: log.level === "warning"
												? "bg-yellow-500/10 text-yellow-400"
												: log.level === "success"
												? "bg-green-500/10 text-green-400"
												: "bg-secondary/30 text-muted-foreground"
										}`}
									>
										<span className="font-mono text-[10px] opacity-60 mr-2">
											{new Date(log.timestamp).toLocaleTimeString()}
										</span>
										<span>{log.message}</span>
									</div>
								))}
								<div ref={terminalEndRef} />
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
