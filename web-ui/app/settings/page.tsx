"use client";

import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
  const [config, setConfig] = useState({
    websocketPort: 4000,
    apiPort: 3002,
    maxEvents: 100,
    autoReconnect: true,
    enableNotifications: true,
    eventRetention: 24, // hours
  });

  const handleSave = () => {
    console.log('Saving settings:', config);
    // In a real app, save to backend/localStorage
    alert('Settings saved successfully!');
  };

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-[1200px] mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary border border-border transition-all">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                System Settings
              </h1>
              <p className="text-muted-foreground mt-1">
                Configure orchestration system parameters
              </p>
            </div>
          </div>
        </header>

        {/* Settings Sections */}
        <div className="grid grid-cols-1 gap-6">
          {/* Connection Settings */}
          <div className="bg-secondary/30 backdrop-blur-sm border border-border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-primary">Connection Settings</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">WebSocket Port</label>
                  <input
                    type="number"
                    value={config.websocketPort}
                    onChange={(e) => setConfig({...config, websocketPort: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">API Port</label>
                  <input
                    type="number"
                    value={config.apiPort}
                    onChange={(e) => setConfig({...config, apiPort: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoReconnect"
                  checked={config.autoReconnect}
                  onChange={(e) => setConfig({...config, autoReconnect: e.target.checked})}
                  className="w-4 h-4 rounded border-border"
                />
                <label htmlFor="autoReconnect" className="text-sm">
                  Auto-reconnect on connection loss
                </label>
              </div>
            </div>
          </div>

          {/* Event Settings */}
          <div className="bg-secondary/30 backdrop-blur-sm border border-border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-primary">Event Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Maximum Events in Memory</label>
                <input
                  type="number"
                  value={config.maxEvents}
                  onChange={(e) => setConfig({...config, maxEvents: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:outline-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Number of events to keep in memory for real-time display
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Event Retention (hours)</label>
                <input
                  type="number"
                  value={config.eventRetention}
                  onChange={(e) => setConfig({...config, eventRetention: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:outline-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How long to keep events in the database before automatic cleanup
                </p>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-secondary/30 backdrop-blur-sm border border-border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-primary">Notification Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enableNotifications"
                  checked={config.enableNotifications}
                  onChange={(e) => setConfig({...config, enableNotifications: e.target.checked})}
                  className="w-4 h-4 rounded border-border"
                />
                <label htmlFor="enableNotifications" className="text-sm">
                  Enable toast notifications for new agents
                </label>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary/10 border-2 border-primary text-primary hover:bg-primary/20 hover:glow-border transition-all font-semibold"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>

        {/* System Information */}
        <div className="bg-secondary/30 backdrop-blur-sm border border-border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 text-primary">System Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Version</div>
              <div className="font-semibold">1.0.0</div>
            </div>
            <div>
              <div className="text-muted-foreground">WebSocket URL</div>
              <div className="font-mono text-xs">ws://localhost:{config.websocketPort}</div>
            </div>
            <div>
              <div className="text-muted-foreground">API URL</div>
              <div className="font-mono text-xs">http://localhost:{config.apiPort}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Event Storage</div>
              <div className="font-semibold">SQLite</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
