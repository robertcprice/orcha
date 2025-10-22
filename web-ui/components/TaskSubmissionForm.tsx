"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";

interface TaskSubmissionResult {
  success: boolean;
  task_id?: string;
  message?: string;
  error?: string;
}

export default function TaskSubmissionForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TaskSubmissionResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      setResult({
        success: false,
        error: "Please fill in all required fields",
      });
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      const response = await fetch("/api/tasks/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          priority,
          config: {
            enable_validation: true,
            max_retries: 3,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          task_id: data.task_id,
          message: data.message,
        });

        // Clear form
        setTitle("");
        setDescription("");
        setPriority("normal");
      } else {
        setResult({
          success: false,
          error: data.error || "Failed to submit task",
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || "Network error occurred",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Submit New Task</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Task Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Build a Twitter-like social media platform"
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            disabled={submitting}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Detailed Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what you want to build in detail. Include features, tech stack preferences, and any specific requirements..."
            rows={6}
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            disabled={submitting}
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-blue-500"
            disabled={submitting}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Task
            </>
          )}
        </button>

        {/* Result Message */}
        {result && (
          <div
            className={`p-4 rounded-lg border ${
              result.success
                ? "bg-green-900/20 border-green-700/30 text-green-400"
                : "bg-red-900/20 border-red-700/30 text-red-400"
            }`}
          >
            {result.success ? (
              <div>
                <div className="font-medium mb-1">✓ Task Submitted Successfully!</div>
                <div className="text-sm opacity-90">
                  Task ID: {result.task_id}
                </div>
                <div className="text-sm opacity-90 mt-1">
                  The orchestration system will begin processing your task shortly.
                  Monitor progress in the dashboard.
                </div>
              </div>
            ) : (
              <div>
                <div className="font-medium mb-1">✗ Submission Failed</div>
                <div className="text-sm opacity-90">{result.error}</div>
              </div>
            )}
          </div>
        )}
      </form>

      {/* Example */}
      <div className="mt-6 p-4 bg-blue-900/10 border border-blue-700/30 rounded-lg">
        <div className="text-sm font-medium text-blue-400 mb-2">Example Task:</div>
        <div className="text-xs text-gray-300 space-y-1">
          <div><strong>Title:</strong> Build a Twitter-like social media platform</div>
          <div>
            <strong>Description:</strong> Create a full-stack social media application with user
            authentication, posts (tweets), likes, comments, follow/unfollow functionality, and
            real-time updates. Use Next.js for frontend, PostgreSQL for database, and include
            responsive design with Tailwind CSS.
          </div>
        </div>
      </div>
    </div>
  );
}
