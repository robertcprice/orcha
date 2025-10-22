"use client";

import TaskSubmissionForm from '@/components/TaskSubmissionForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TasksPage() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-[1200px] mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center gap-3">
          <Link href="/" className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary border border-border transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              Task Submission
            </h1>
            <p className="text-muted-foreground mt-1">
              Submit a new task for the orchestration system to process
            </p>
          </div>
        </header>

        {/* Task Form */}
        <TaskSubmissionForm />

        {/* What happens next */}
        <div className="bg-secondary/30 backdrop-blur-sm border border-border rounded-lg p-6">
          <h3 className="text-2xl font-semibold mb-4 text-primary">What happens after submission?</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-sm font-bold text-primary">
                1
              </div>
              <div>
                <div className="font-semibold text-foreground mb-1">Planning Phase</div>
                <div className="text-sm text-muted-foreground">
                  The system analyzes your request and creates an architectural plan,
                  identifying components (Frontend, Backend, Database, etc.)
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center text-sm font-bold text-accent">
                2
              </div>
              <div>
                <div className="font-semibold text-foreground mb-1">Task Decomposition</div>
                <div className="text-sm text-muted-foreground">
                  GPT-4 breaks down the plan into specific, actionable subtasks with
                  exact specifications (schemas, endpoints, components)
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-success/20 border-2 border-success flex items-center justify-center text-sm font-bold text-success">
                3
              </div>
              <div>
                <div className="font-semibold text-foreground mb-1">Manager Coordination</div>
                <div className="text-sm text-muted-foreground">
                  Domain-specific managers (Database, Frontend, Backend, etc.) coordinate
                  Claude agents to implement each subtask
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-warning/20 border-2 border-warning flex items-center justify-center text-sm font-bold text-warning">
                4
              </div>
              <div>
                <div className="font-semibold text-foreground mb-1">Validation</div>
                <div className="text-sm text-muted-foreground">
                  GPT-4 validates the completed work against original requirements and
                  provides quality assessment
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Monitor progress in real-time on the{' '}
              <Link href="/" className="text-primary hover:underline font-semibold">
                Home Dashboard
              </Link>
              {' '}where you can view live event streams and agent activity
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
