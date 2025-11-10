"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bot, Send, CheckCircle2, XCircle, Clock, Sparkles, Loader2, ChevronDown, ChevronRight, Brain, Lightbulb, Code, Zap, Gem } from "lucide-react";

interface HybridTask {
	task_id: string;
	goal: string;
	status: string;
	created_at?: string;
	updated_at?: string;
	plan?: any;
	execution_result?: any;
	review_result?: any;
	documentation?: any;
	final_result?: any;
	summary?: string;
	error?: string;
	context?: any;
}

interface TerminalLog {
	timestamp: string;
	level: string;
	message: string;
}

const ACTIVE_STATUS_SET = new Set([
	"analyzing",
	"planning",
	"executing",
	"reviewing",
	"refining",
	"documenting",
	"finalizing",
	"running",
]);

const toTimestamp = (value?: string) => {
	if (!value) {
		return 0;
	}
	const parsed = Date.parse(value);
	return Number.isNaN(parsed) ? 0 : parsed;
};

const formatTime = (value?: string) => {
	if (!value) {
		return "";
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "";
	}
	return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

export default function HybridOrchestratorPanel() {
	const [goal, setGoal] = useState("");
	const [tasks, setTasks] = useState<HybridTask[]>([]);
	const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([]);
	const [planningExpanded, setPlanningExpanded] = useState(true);
	const terminalContainerRef = useRef<HTMLDivElement>(null);

	const mergeTasks = useCallback((incoming: HybridTask[]) => {
		if (!incoming || incoming.length === 0) {
			return;
		}

		setTasks((prev) => {
			const map = new Map(prev.map((task) => [task.task_id, task]));

			for (const task of incoming) {
				if (!task?.task_id) {
					continue;
				}
				const existing = map.get(task.task_id) ?? {};
				map.set(task.task_id, { ...existing, ...task });
			}

			const combined = Array.from(map.values());
			combined.sort((a, b) => toTimestamp(b.created_at) - toTimestamp(a.created_at));
			return combined;
		});
	}, []);

	const fetchActiveTasks = useCallback(async () => {
		try {
			const response = await fetch("/api/hybrid-orchestrator/active");
			if (!response.ok) {
				return;
			}

			const data = await response.json();
			const activeList: HybridTask[] =
				data.active_tasks ?? (data.active_task ? [data.active_task] : []);

			if (activeList.length === 0) {
				return;
			}

			mergeTasks(activeList);
			setSelectedTaskId((prev) => prev ?? activeList[0].task_id);
		} catch (err) {
			console.error("Error checking for active tasks:", err);
		}
	}, [mergeTasks]);

	useEffect(() => {
		fetchActiveTasks();
		const interval = setInterval(fetchActiveTasks, 10000);
		return () => clearInterval(interval);
	}, [fetchActiveTasks]);

	useEffect(() => {
		if (selectedTaskId && tasks.some((task) => task.task_id === selectedTaskId)) {
			return;
		}

		if (tasks.length > 0) {
			setSelectedTaskId(tasks[0].task_id);
		} else {
			setSelectedTaskId(null);
		}
	}, [tasks, selectedTaskId]);

	const selectedTask = selectedTaskId
		? tasks.find((task) => task.task_id === selectedTaskId) ?? null
		: null;

	const activeTaskKey = tasks
		.filter((task) => ACTIVE_STATUS_SET.has(task.status))
		.map((task) => task.task_id)
		.sort()
		.join("|");

	useEffect(() => {
		if (!activeTaskKey) {
			return;
		}

		const activeIds = activeTaskKey.split("|").filter(Boolean);
		if (activeIds.length === 0) {
			return;
		}

		let cancelled = false;

		const pollStatuses = async () => {
			try {
				const updates: HybridTask[] = [];

				for (const taskId of activeIds) {
					const response = await fetch(`/api/hybrid-orchestrator/status/${taskId}`);
					if (response.ok) {
						const data = await response.json();
						updates.push(data);
					}
				}

				if (!cancelled && updates.length > 0) {
					mergeTasks(updates);
				}
			} catch (err) {
				console.error("Error polling task status:", err);
			}
		};

		pollStatuses();
		const interval = setInterval(pollStatuses, 2000);
		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, [activeTaskKey, mergeTasks]);

	useEffect(() => {
		if (!selectedTaskId) {
			setTerminalLogs([]);
			return;
		}

		const fetchTerminalLogs = async () => {
			try {
				const response = await fetch(`/api/hybrid-orchestrator/terminal/${selectedTaskId}`);
				if (response.ok) {
					const data = await response.json();
					setTerminalLogs(data.logs || []);
				}
			} catch (err) {
				console.error("Error fetching terminal logs:", err);
			}
		};

		fetchTerminalLogs();

		if (!selectedTask || ["completed", "failed"].includes(selectedTask.status)) {
			return;
		}

		const interval = setInterval(fetchTerminalLogs, 2000);
		return () => clearInterval(interval);
	}, [selectedTaskId, selectedTask?.status]);

	useEffect(() => {
		if (terminalContainerRef.current) {
			terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
		}
	}, [terminalLogs]);

	const activeTaskCount = tasks.filter((task) => ACTIVE_STATUS_SET.has(task.status)).length;

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
				const newTask: HybridTask = {
					task_id: result.task_id,
					goal,
					status: "planning",
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				};

				mergeTasks([newTask]);
				setSelectedTaskId(result.task_id);

				await fetchActiveTasks();
			} else {
				const errorData = await response.json();
				setError(errorData.message || errorData.error || "Failed to submit task");
			}
		} catch (err) {
			console.error("Error submitting task:", err);
			setError("Network error - failed to submit task");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDismissTask = (taskId: string) => {
		setTasks((prev) => {
			const filtered = prev.filter((task) => task.task_id !== taskId);

			if (selectedTaskId === taskId) {
				setSelectedTaskId(filtered.length > 0 ? filtered[0].task_id : null);
				setTerminalLogs([]);
			}

			return filtered;
		});
	};

	const getStatusIcon = (status?: string) => {
		switch (status) {
			case "planning":
			case "analyzing":
				return <Clock className="w-5 h-5 text-blue-400 animate-pulse" />;
			case "executing":
				return <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />;
			case "reviewing":
				return <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />;
			case "refining":
				return <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />;
			case "documenting":
				return <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />;
			case "finalizing":
				return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
			case "completed":
				return <CheckCircle2 className="w-5 h-5 text-green-400" />;
			case "failed":
				return <XCircle className="w-5 h-5 text-red-400" />;
			default:
				return <Clock className="w-5 h-5 text-muted-foreground" />;
		}
	};

	const getStatusText = (status?: string) => {
		switch (status) {
			case "planning":
			case "analyzing":
				return "Multi-AI enrichment in progress...";
			case "executing":
				return "Iterative implementation in progress...";
			case "reviewing":
				return "Automated review and testing...";
			case "refining":
				return "Refinement loop in progress...";
			case "documenting":
				return "Generating documentation...";
			case "finalizing":
				return "Finalizing orchestration output...";
			case "completed":
				return "Task completed successfully";
			case "failed":
				return "Task failed";
			default:
				return status ?? "unknown";
		}
	};

	return (
		<div className="bg-secondary/30 backdrop-blur-sm border border-border rounded-lg p-5 space-y-6">
			<div className="flex items-center gap-2">
				<Sparkles className="w-5 h-5 text-primary" />
				<h2 className="text-xl font-semibold">AI Orchestration System</h2>
				<span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
					Multi-AI + Iterative
				</span>
			</div>

			<p className="text-sm text-muted-foreground">
				Auto-planning → Multi-AI enrichment → Iterative implementation → Automated review → Documentation
			</p>

			<div className="space-y-6">
				<section className="space-y-3">
					<div>
						<label className="text-sm font-medium text-muted-foreground block mb-2">
							What would you like to accomplish?
						</label>
						<textarea
							value={goal}
							onChange={(e) => {
								setGoal(e.target.value);
								if (error) setError(null);
							}}
							placeholder="e.g., Build a user authentication system with JWT&#10;e.g., Add comprehensive error handling to the data processor&#10;e.g., Create documentation for the agent system&#10;e.g., Refactor the API to use TypeScript&#10;e.g., Add unit tests for the payment service"
							rows={5}
							className="w-full px-3 py-2 rounded-md bg-secondary/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
						/>
						<p className="text-xs text-muted-foreground mt-2">
							💡 The system will automatically create a plan, enrich it with multiple AI perspectives, and execute it with intelligent fallback handling.
						</p>
					</div>

					{error && (
						<div className="p-3 rounded-md bg-error/10 border border-error/30 text-error text-sm flex items-center gap-2">
							<XCircle className="w-4 h-4" />
							{error}
						</div>
					)}

					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<button
							onClick={handleSubmit}
							disabled={isSubmitting || !goal.trim()}
							className="flex-1 px-4 py-2 rounded-md bg-gradient-to-r from-primary to-blue-500 hover:from-primary/80 hover:to-blue-500/80 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
						>
							{isSubmitting ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
									Processing...
								</>
							) : (
								<>
									<Send className="w-4 h-4" />
									Start Multi-AI Orchestration
								</>
							)}
						</button>
						<span className="text-xs text-muted-foreground">
							{activeTaskCount} active • {tasks.length} tracked
						</span>
					</div>
				</section>

				{tasks.length > 0 && (
					<section className="space-y-3">
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
								Task Queue
							</h3>
							<span className="text-xs text-muted-foreground">
								{activeTaskCount > 0 ? `${activeTaskCount} running` : "No active tasks"}
							</span>
						</div>

						<div className="flex flex-col gap-2">
							{tasks.map((task) => {
								const isSelected = selectedTaskId === task.task_id;
								return (
									<button
										key={task.task_id}
										onClick={() => setSelectedTaskId(task.task_id)}
										className={`w-full text-left p-3 rounded-lg border transition-colors ${
											isSelected
												? "border-primary bg-primary/10"
												: "border-border bg-background/40 hover:bg-background/60"
										}`}
									>
										<div className="flex items-start justify-between gap-3">
											<div className="flex items-start gap-3">
												{getStatusIcon(task.status)}
												<div className="space-y-1">
													<p className="text-sm font-medium text-foreground line-clamp-2">
														{task.goal || "Untitled task"}
													</p>
													<p className="text-xs text-muted-foreground">
														{getStatusText(task.status)}
													</p>
												</div>
											</div>
											<div className="text-right">
												<p className="text-[10px] uppercase tracking-wide text-muted-foreground">
													{formatTime(task.created_at)}
												</p>
												<p className="text-[10px] uppercase tracking-wide text-muted-foreground">
													{task.status}
												</p>
											</div>
										</div>
									</button>
								);
							})}
						</div>
					</section>
				)}

				{selectedTask && (
					<section className="space-y-4">
						<div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border">
							<div className="flex items-center gap-3">
								{getStatusIcon(selectedTask.status)}
								<div>
									<p className="text-sm font-medium">{getStatusText(selectedTask.status)}</p>
									<p className="text-xs text-muted-foreground">
										Task ID: {selectedTask.task_id}
									</p>
								</div>
							</div>
							{["completed", "failed"].includes(selectedTask.status) && (
								<button
									onClick={() => handleDismissTask(selectedTask.task_id)}
									className="px-3 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 border border-primary/30 text-sm font-medium transition-colors"
								>
									Dismiss
								</button>
							)}
						</div>

						<div className="p-3 rounded-lg bg-background/30 border border-border/50">
							<p className="text-xs font-medium text-muted-foreground mb-1">Goal:</p>
							<p className="text-sm text-foreground whitespace-pre-wrap">{selectedTask.goal}</p>
						</div>

						{/* Multi-AI Planning Pipeline Details */}
						{selectedTask.context?.enrichments && Array.isArray(selectedTask.context.enrichments) && selectedTask.context.enrichments.length > 0 && (
							<div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
								<button
									onClick={() => setPlanningExpanded(!planningExpanded)}
									className="flex items-center gap-2 mb-2 w-full hover:bg-purple-500/10 p-2 -m-2 rounded transition-colors"
								>
									{planningExpanded ? <ChevronDown className="w-4 h-4 text-purple-400" /> : <ChevronRight className="w-4 h-4 text-purple-400" />}
									<Sparkles className="w-4 h-4 text-purple-400" />
									<p className="text-sm font-medium text-purple-400">Multi-AI Planning Pipeline ({selectedTask.context.enrichments.length} AIs)</p>
								</button>

								{planningExpanded && (
									<div className="mt-3 space-y-3">
										{selectedTask.context.enrichments.map((enrichment: any, index: number) => {
											const aiName = enrichment.ai_name || enrichment.ai || "Unknown AI";
											const content = enrichment.content || enrichment.enriched_content || enrichment.feedback || "";
											const suggestions = enrichment.suggestions || [];
											const insights = enrichment.insights || enrichment.technical_insights || enrichment.strengths || [];
											const concerns = enrichment.concerns || enrichment.weaknesses || [];

											// Choose icon based on AI
											const getAIIcon = (name: string) => {
												if (name.toLowerCase().includes("claude")) return <Brain className="w-3 h-3" />;
												if (name.toLowerCase().includes("chatgpt")) return <Bot className="w-3 h-3" />;
												if (name.toLowerCase().includes("deepseek")) return <Code className="w-3 h-3" />;
												if (name.toLowerCase().includes("grok")) return <Zap className="w-3 h-3" />;
												if (name.toLowerCase().includes("gemini")) return <Gem className="w-3 h-3" />;
												return <Lightbulb className="w-3 h-3" />;
											};

											return (
												<div key={`enrichment-${index}`} className="p-3 rounded-lg bg-background/40 border border-border/50 space-y-2">
													<div className="flex items-center gap-2">
														<div className="text-purple-400">
															{getAIIcon(aiName)}
														</div>
														<p className="text-xs font-semibold text-foreground">{aiName}</p>
													</div>

													{content && (
														<div className="text-xs text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
															{typeof content === "string" ? content.substring(0, 500) : JSON.stringify(content).substring(0, 500)}
															{(typeof content === "string" ? content.length : JSON.stringify(content).length) > 500 && "..."}
														</div>
													)}

													{suggestions.length > 0 && (
														<div>
															<p className="text-[10px] font-medium text-muted-foreground mb-1">Suggestions:</p>
															<ul className="list-disc list-inside ml-2 text-[10px] text-muted-foreground space-y-0.5">
																{suggestions.slice(0, 3).map((s: string, i: number) => (
																	<li key={`suggestion-${i}`}>{s}</li>
																))}
															</ul>
														</div>
													)}

													{insights.length > 0 && (
														<div>
															<p className="text-[10px] font-medium text-muted-foreground mb-1">Insights:</p>
															<ul className="list-disc list-inside ml-2 text-[10px] text-muted-foreground space-y-0.5">
																{insights.slice(0, 3).map((i: string, idx: number) => (
																	<li key={`insight-${idx}`}>{i}</li>
																))}
															</ul>
														</div>
													)}

													{concerns.length > 0 && (
														<div>
															<p className="text-[10px] font-medium text-orange-400 mb-1">Concerns:</p>
															<ul className="list-disc list-inside ml-2 text-[10px] text-orange-400/80 space-y-0.5">
																{concerns.slice(0, 3).map((c: string, cidx: number) => (
																	<li key={`concern-${cidx}`}>{c}</li>
																))}
															</ul>
														</div>
													)}
												</div>
											);
										})}
									</div>
								)}
							</div>
						)}

						{selectedTask.plan && Array.isArray(selectedTask.plan.tasks) && (
							<div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
								<div className="flex items-center gap-2 mb-2">
									<Bot className="w-4 h-4 text-blue-400" />
									<p className="text-sm font-medium text-blue-400">Execution Plan</p>
								</div>
								<div className="text-xs text-muted-foreground space-y-1">
									<p className="font-medium mb-1">
										Tasks ({selectedTask.plan.tasks.length}):
									</p>
									<ul className="list-disc list-inside ml-2 space-y-0.5">
										{selectedTask.plan.tasks.slice(0, 5).map((task: any, index: number) => (
											<li key={`plan-task-${index}`}>
												{task.description || task.task_id || "Unnamed task"}
											</li>
										))}
										{selectedTask.plan.tasks.length > 5 && (
											<li className="text-muted-foreground">
												... and {selectedTask.plan.tasks.length - 5} more
											</li>
										)}
									</ul>
								</div>
							</div>
						)}

						{selectedTask.execution_result && (
							<div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 space-y-1">
								<div className="flex items-center gap-2 mb-1">
									<CheckCircle2 className="w-4 h-4 text-green-400" />
									<p className="text-sm font-medium text-green-400">Execution Results</p>
								</div>
								<p className="text-xs text-muted-foreground">
									<span className="font-medium">Status:</span>{" "}
									{selectedTask.execution_result.status}
								</p>
								<p className="text-xs text-muted-foreground">
									<span className="font-medium">Completed Tasks:</span>{" "}
									{selectedTask.execution_result.completed_tasks ?? 0}
								</p>
								<p className="text-xs text-muted-foreground">
									<span className="font-medium">Failed Tasks:</span>{" "}
									{selectedTask.execution_result.failed_tasks ?? 0}
								</p>
								<p className="text-xs text-muted-foreground">
									<span className="font-medium">Files Created:</span>{" "}
									{Array.isArray(selectedTask.execution_result.files_created)
										? selectedTask.execution_result.files_created.length
										: 0}
								</p>
							</div>
						)}

						{selectedTask.review_result && (
							<div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 space-y-1">
								<p className="text-sm font-medium text-purple-300">Review Outcome</p>
								<p className="text-xs text-muted-foreground">
									<span className="font-medium">Quality Score:</span>{" "}
									{selectedTask.review_result.quality_score}/10
								</p>
								<p className="text-xs text-muted-foreground">
									<span className="font-medium">Approved:</span>{" "}
									{selectedTask.review_result.approved ? "Yes" : "No"}
								</p>
								{Array.isArray(selectedTask.review_result.issues_found) &&
									selectedTask.review_result.issues_found.length > 0 && (
										<div className="text-xs text-muted-foreground">
											<p className="font-medium">Issues:</p>
											<ul className="list-disc list-inside ml-3">
												{selectedTask.review_result.issues_found.map((issue: string, index: number) => (
													<li key={`issue-${index}`}>{issue}</li>
												))}
											</ul>
										</div>
									)}
							</div>
						)}

						{selectedTask.documentation && (
							<div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20 space-y-1">
								<p className="text-sm font-medium text-cyan-300">Generated Documentation</p>
								<ul className="text-xs text-muted-foreground list-disc list-inside ml-3">
									{Object.keys(selectedTask.documentation).map((doc) => (
										<li key={doc}>{doc}</li>
									))}
								</ul>
							</div>
						)}

						{selectedTask.summary && (
							<div className="p-3 rounded-lg bg-background/30 border border-border">
								<p className="text-xs font-medium text-muted-foreground mb-2">Summary:</p>
								<p className="text-sm text-foreground whitespace-pre-wrap">
									{selectedTask.summary}
								</p>
							</div>
						)}

						{selectedTask.error && (
							<div className="p-3 rounded-lg bg-error/10 border border-error/20">
								<p className="text-sm font-medium text-error mb-1">Error</p>
								<p className="text-xs text-error/90 whitespace-pre-wrap">{selectedTask.error}</p>
							</div>
						)}

						<div className="p-3 rounded-lg bg-background/40 border border-border">
							<p className="text-xs font-medium text-muted-foreground mb-2">Terminal Output</p>
							<div
								ref={terminalContainerRef}
								className="h-60 overflow-y-auto bg-black/60 text-green-300 text-xs font-mono rounded-md p-3 space-y-2 border border-black/40"
							>
								{terminalLogs.length === 0 ? (
									<p className="text-muted-foreground">No logs yet.</p>
								) : (
									terminalLogs.map((log, index) => (
										<div key={`${log.timestamp}-${index}`} className="space-y-1">
											<p className="text-[10px] text-muted-foreground">
												[{formatTime(log.timestamp)}] {log.level}
											</p>
											<p className="whitespace-pre-wrap">{log.message}</p>
										</div>
									))
								)}
							</div>
						</div>
					</section>
				)}
			</div>
		</div>
	);
}
