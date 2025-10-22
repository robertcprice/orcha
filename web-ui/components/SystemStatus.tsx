"use client";

import { useEffect, useState } from "react";
import { Server, Database, Zap, AlertCircle } from "lucide-react";

interface SystemStatusData {
  redis: "connected" | "disconnected" | "error";
  webserver: "running" | "stopped";
  orchestrator: "active" | "idle" | "error";
  uptime: number;
}

export default function SystemStatus() {
  const [status, setStatus] = useState<SystemStatusData>({
    redis: "disconnected",
    webserver: "running",
    orchestrator: "idle",
    uptime: 0,
  });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/system-status');
        if (response.ok) {
          const data = await response.json();
          setStatus({
            redis: data.redis || "disconnected",
            webserver: data.webserver || "running",
            orchestrator: data.orchestrator || "idle",
            uptime: data.uptime || 0,
          });
        }
      } catch (error) {
        console.error('Failed to fetch system status:', error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
      case "running":
      case "active":
        return "text-success";
      case "idle":
        return "text-warning";
      default:
        return "text-error";
    }
  };

  const getStatusIcon = (service: string, serviceStatus: string) => {
    const iconClass = `w-5 h-5 ${getStatusColor(serviceStatus)}`;

    switch (service) {
      case "redis":
        return <Database className={iconClass} />;
      case "webserver":
        return <Server className={iconClass} />;
      case "orchestrator":
        return <Zap className={iconClass} />;
      default:
        return <AlertCircle className={iconClass} />;
    }
  };

  return (
    <div className="bg-secondary/30 backdrop-blur-sm border border-border rounded-lg p-5">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Server className="w-5 h-5 text-primary" />
        System Status
      </h2>

      <div className="space-y-4">
        {/* Redis Status */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            {getStatusIcon("redis", status.redis)}
            <div>
              <div className="font-medium text-sm">Redis</div>
              <div className="text-xs text-muted-foreground">State Management</div>
            </div>
          </div>
          <div className={`text-sm font-semibold capitalize ${getStatusColor(status.redis)}`}>
            {status.redis}
          </div>
        </div>

        {/* Web Server Status */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            {getStatusIcon("webserver", status.webserver)}
            <div>
              <div className="font-medium text-sm">Web Server</div>
              <div className="text-xs text-muted-foreground">API & UI</div>
            </div>
          </div>
          <div className={`text-sm font-semibold capitalize ${getStatusColor(status.webserver)}`}>
            {status.webserver}
          </div>
        </div>

        {/* Orchestrator Status */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            {getStatusIcon("orchestrator", status.orchestrator)}
            <div>
              <div className="font-medium text-sm">Orchestrator</div>
              <div className="text-xs text-muted-foreground">Task Manager</div>
            </div>
          </div>
          <div className={`text-sm font-semibold capitalize ${getStatusColor(status.orchestrator)}`}>
            {status.orchestrator}
          </div>
        </div>

        {/* System Uptime */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">System Uptime</span>
            <span className="font-semibold text-primary">{formatUptime(status.uptime)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
