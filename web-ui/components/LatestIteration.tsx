"use client";

import { useState, useEffect } from "react";
import { Brain, TrendingUp, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";

interface LatestIteration {
  iteration: number;
  timestamp: string;
  experiment: string;
  results: {
    train_f1: number;
    val_f1: number;
    test_f1: number;
  };
  decision: {
    type: string;
    priority: string;
    reasoning: string;
    next_steps: string[];
  };
}

export default function LatestIteration() {
  const [iteration, setIteration] = useState<LatestIteration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchLatestIteration();
    const interval = setInterval(fetchLatestIteration, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLatestIteration = async () => {
    try {
      const response = await fetch('/api/plan');
      const data = await response.json();

      if (data.ok && data.latestIteration) {
        setIteration(data.latestIteration);
      }
    } catch (err) {
      console.error('Failed to fetch latest iteration:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !iteration) {
    return null;
  }

  const getDecisionColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'continue':
        return 'text-success';
      case 'pivot':
        return 'text-warning';
      case 'stop':
        return 'text-error';
      default:
        return 'text-primary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-error/20 text-error border-error/30';
      case 'medium':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'low':
        return 'bg-success/20 text-success border-success/30';
      default:
        return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  return (
    <div className="bg-secondary/30 backdrop-blur-sm border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Latest Orchestration Iteration
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded border bg-primary/10 text-primary border-primary/30">
            Iteration #{iteration.iteration}
          </span>
        </div>
      </div>

      {/* Experiment Info */}
      <div className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground">Experiment</p>
          <p className="text-base font-medium">{iteration.experiment}</p>
        </div>

        {/* Results */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-background/50 rounded-lg p-3 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Train F1</p>
            <p className="text-lg font-semibold">{iteration.results.train_f1.toFixed(3)}</p>
          </div>
          <div className="bg-background/50 rounded-lg p-3 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Val F1</p>
            <p className="text-lg font-semibold">{iteration.results.val_f1.toFixed(3)}</p>
          </div>
          <div className="bg-background/50 rounded-lg p-3 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Test F1</p>
            <p className="text-lg font-semibold">{iteration.results.test_f1.toFixed(3)}</p>
          </div>
        </div>

        {/* Decision */}
        <div className="bg-background/50 rounded-lg p-3 border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">ChatGPT Decision:</p>
              <span className={`text-sm font-semibold capitalize ${getDecisionColor(iteration.decision.type)}`}>
                {iteration.decision.type}
              </span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded border ${getPriorityColor(iteration.decision.priority)}`}>
              {iteration.decision.priority} priority
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{iteration.decision.reasoning}</p>
        </div>

        {/* Next Steps (Collapsible) */}
        <div className="bg-background/50 rounded-lg border border-border/50">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full p-3 flex items-center justify-between hover:bg-background/30 transition-colors"
          >
            <span className="text-sm font-medium">Next Steps ({iteration.decision.next_steps.length})</span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {isExpanded && (
            <div className="px-3 pb-3 space-y-2">
              {iteration.decision.next_steps.map((step, index) => (
                <div key={`iteration-${iteration.iteration}-step-${index}`} className="flex gap-2 text-xs">
                  <span className="text-primary font-medium">{index + 1}.</span>
                  <span className="text-muted-foreground">{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground text-right">
          {iteration.timestamp}
        </p>
      </div>
    </div>
  );
}
