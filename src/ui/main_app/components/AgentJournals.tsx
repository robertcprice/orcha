"use client";

import { useState, useEffect } from "react";
import { FileText, ChevronDown, ChevronRight, CheckCircle, Clock, XCircle, Loader2, AlertCircle } from "lucide-react";

interface JournalStep {
  agent: string;
  task_id: string;
  timestamp: string;
  action: string;
  status: string;
  details?: Record<string, any>;
  error?: string;
}

interface AgentJournal {
  agent: string;
  task_id: string;
  date: string;
  file: string;
  steps: JournalStep[];
  summary: {
    total_steps: number;
    status_counts: Record<string, number>;
    start_time: string | null;
    last_updated: string | null;
  };
}

export default function AgentJournals() {
  const [journals, setJournals] = useState<AgentJournal[]>([]);
  const [expandedJournals, setExpandedJournals] = useState<Set<string>>(new Set());
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchJournals();
    const interval = setInterval(fetchJournals, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchJournals = async () => {
    try {
      const response = await fetch('/api/agent-journals?limit=20');
      const data = await response.json();

      if (data.ok) {
        setJournals(data.journals);
      }
    } catch (error) {
      console.error('Failed to fetch agent journals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleJournal = (file: string) => {
    setExpandedJournals((prev) => {
      const next = new Set(prev);
      if (next.has(file)) {
        next.delete(file);
      } else {
        next.add(file);
      }
      return next;
    });
  };

  const toggleStep = (index: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'in_progress':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-error" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      default:
        return <AlertCircle className="w-4 h-4 text-warning" />;
    }
  };

  const getAgentColor = (agent: string) => {
    const colors: Record<string, string> = {
      PP: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      AR: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      IM: 'bg-green-500/20 text-green-400 border-green-500/30',
      RD: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    };
    return colors[agent] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  if (isLoading) {
    return (
      <div className="bg-secondary/30 backdrop-blur-sm border border-border rounded-lg p-5">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (journals.length === 0) {
    return (
      <div className="bg-secondary/30 backdrop-blur-sm border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Agent Journals
          </h2>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          <p>No agent journals yet</p>
          <p className="text-xs mt-2">Agents will log their work here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-secondary/30 backdrop-blur-sm border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Agent Journals
        </h2>
        <span className="text-xs text-muted-foreground">{journals.length} active sessions</span>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin">
        {journals.map((journal) => {
          const isExpanded = expandedJournals.has(journal.file);

          return (
            <div key={journal.file} className="bg-background/50 rounded-lg border border-border/50">
              {/* Journal Header */}
              <div
                className="p-3 cursor-pointer hover:bg-background/30 transition-colors"
                onClick={() => toggleJournal(journal.file)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}

                    <span className={`text-xs px-2 py-0.5 rounded border font-mono ${getAgentColor(journal.agent)}`}>
                      {journal.agent}
                    </span>

                    <div>
                      <p className="text-sm font-medium">{journal.task_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {journal.summary.total_steps} steps •{' '}
                        {journal.summary.last_updated
                          ? new Date(journal.summary.last_updated).toLocaleTimeString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Status Summary */}
                  <div className="flex items-center gap-2 text-xs">
                    {journal.summary.status_counts.completed > 0 && (
                      <span className="text-success">{journal.summary.status_counts.completed} ✓</span>
                    )}
                    {journal.summary.status_counts.in_progress > 0 && (
                      <span className="text-primary">{journal.summary.status_counts.in_progress} ⋯</span>
                    )}
                    {journal.summary.status_counts.failed > 0 && (
                      <span className="text-error">{journal.summary.status_counts.failed} ✗</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Steps */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  {journal.steps.map((step, index) => {
                    const stepExpanded = expandedSteps.has(index);
                    const hasDetails = step.details && Object.keys(step.details).length > 0;

                    return (
                      <div key={`journal-${journal.file}-step-${index}`} className="bg-background/30 rounded p-2 border border-border/30">
                        <div
                          className={`flex items-start gap-2 ${hasDetails ? 'cursor-pointer' : ''}`}
                          onClick={() => hasDetails && toggleStep(index)}
                        >
                          {hasDetails && (
                            stepExpanded ? (
                              <ChevronDown className="w-3 h-3 mt-0.5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-3 h-3 mt-0.5 text-muted-foreground" />
                            )
                          )}
                          {getStatusIcon(step.status)}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs">{step.action}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(step.timestamp).toLocaleTimeString()}
                            </p>
                            {step.error && (
                              <p className="text-xs text-error mt-1">{step.error}</p>
                            )}
                          </div>
                        </div>

                        {/* Step Details */}
                        {stepExpanded && hasDetails && (
                          <div className="mt-2 pl-5 space-y-1">
                            {Object.entries(step.details!).map(([key, value]) => (
                              <div key={`journal-${journal.file}-step-${index}-detail-${key}`} className="text-xs">
                                <span className="text-primary font-medium">{key}:</span>{' '}
                                <span className="text-muted-foreground">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
