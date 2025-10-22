"use client";

import { Activity, CheckCircle2, Clock, Code2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Stats {
  tasksCompleted: number;
  tasksFailed: number;
  tasksRunning: number;
  tasksTotal: number;
  completionRate: number;
  activeSessions: number;
  uptimeSeconds: number;
}

export default function StatsOverview() {
  const [stats, setStats] = useState<Stats>({
    tasksCompleted: 0,
    tasksFailed: 0,
    tasksRunning: 0,
    tasksTotal: 0,
    completionRate: 0,
    activeSessions: 0,
    uptimeSeconds: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch stats from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats');
        const data = await response.json();

        if (data && !data.error) {
          setStats({
            tasksCompleted: data.tasksCompleted || 0,
            tasksFailed: data.tasksFailed || 0,
            tasksRunning: data.tasksRunning || 0,
            tasksTotal: data.tasksTotal || 0,
            completionRate: data.completionRate || 0,
            activeSessions: data.activeSessions || 0,
            uptimeSeconds: data.uptimeSeconds || 0,
          });
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchStats();

    // Update every 5 seconds
    const interval = setInterval(fetchStats, 5000);

    return () => clearInterval(interval);
  }, []);

  // Format uptime
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const statCards = [
    {
      label: "Tasks Completed",
      value: isLoading ? "..." : `${stats.tasksCompleted}/${stats.tasksTotal}`,
      subValue: stats.tasksFailed > 0 ? `${stats.tasksFailed} failed` : undefined,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
      borderColor: "border-success/30",
    },
    {
      label: "Success Rate",
      value: isLoading ? "..." : `${stats.completionRate}%`,
      subValue: stats.tasksRunning > 0 ? `${stats.tasksRunning} running` : undefined,
      icon: Activity,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/30",
    },
    {
      label: "Active Agents",
      value: isLoading ? "..." : stats.activeSessions.toString(),
      subValue: stats.activeSessions > 0 ? `${stats.activeSessions} working` : 'All idle',
      icon: Code2,
      color: "text-warning",
      bgColor: "bg-warning/10",
      borderColor: "border-warning/30",
    },
    {
      label: "System Uptime",
      value: isLoading ? "..." : formatUptime(stats.uptimeSeconds),
      subValue: stats.tasksTotal > 0 ? `${stats.tasksTotal} total tasks` : undefined,
      icon: Clock,
      color: "text-accent",
      bgColor: "bg-accent/10",
      borderColor: "border-accent/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={`bg-secondary/30 backdrop-blur-sm border ${stat.borderColor} rounded-lg p-4 hover:bg-secondary/50 transition-all hover:glow-border`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {stat.label}
              </span>
              <div className={`${stat.bgColor} p-2 rounded-lg border ${stat.borderColor}`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            {stat.subValue && (
              <div className="text-xs text-muted-foreground mt-1">
                {stat.subValue}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
