'use client';

import { useState, useEffect } from 'react';
import MinimalistTopBar from '@/components/orchestrator/MinimalistTopBar';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Folder, Bot, Save, Check, Sparkles } from 'lucide-react';

interface AgentConfig {
  primary_coder: string;
  fallback_chain: string[];
  max_retries_per_agent: number;
  enable_fallback: boolean;
}

export default function SettingsPage() {
  const { themeId, toggleTheme } = useTheme();
  const [projectDir, setProjectDir] = useState('');
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({
    primary_coder: 'codex',
    fallback_chain: ['deepseek', 'claude'],
    max_retries_per_agent: 3,
    enable_fallback: true
  });
  const [particleColor, setParticleColor] = useState<string>('');
  const [useCustomColor, setUseCustomColor] = useState(false);
  const [saved, setSaved] = useState(false);

  const availableModels = ['codex', 'deepseek', 'claude', 'chatgpt', 'gemini', 'grok'];

  useEffect(() => {
    // Load settings from API and localStorage
    Promise.all([
      fetch('/api/settings/agents').then(res => res.ok ? res.json() : null),
      fetch('/api/settings/project').then(res => res.ok ? res.json() : null)
    ]).then(([agentData, projectData]) => {
      if (agentData?.config) {
        setAgentConfig(agentData.config);
      }
      if (projectData?.directory) {
        setProjectDir(projectData.directory);
      }
    }).catch(console.error);

    // Load particle color from localStorage
    const savedColor = localStorage.getItem('particle-custom-color');
    const savedUseCustom = localStorage.getItem('particle-use-custom') === 'true';
    if (savedColor) {
      setParticleColor(savedColor);
    }
    setUseCustomColor(savedUseCustom);
  }, []);

  const handleSave = async () => {
    try {
      await Promise.all([
        fetch('/api/settings/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agentConfig)
        }),
        fetch('/api/settings/project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ directory: projectDir })
        })
      ]);

      // Save particle color to localStorage
      if (particleColor) {
        localStorage.setItem('particle-custom-color', particleColor);
      }
      localStorage.setItem('particle-use-custom', useCustomColor.toString());

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const toggleFallbackModel = (model: string) => {
    setAgentConfig(prev => ({
      ...prev,
      fallback_chain: prev.fallback_chain.includes(model)
        ? prev.fallback_chain.filter(m => m !== model)
        : [...prev.fallback_chain, model]
    }));
  };

  return (
    <div className="w-full min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <MinimalistTopBar />

      <div className="max-w-4xl mx-auto pt-24 px-8 pb-16">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        {/* Theme Selection */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            {themeId === 'minimalist' ? <Sun size={20} /> : <Moon size={20} />}
            Theme
          </h2>
          <div className="bg-[var(--glass-backdrop)] border border-[var(--glass-border)] rounded-lg p-6">
            <div className="flex gap-4">
              <button
                onClick={themeId === 'scifi' ? toggleTheme : undefined}
                className={`flex-1 p-6 rounded-lg border-2 transition-all ${
                  themeId === 'minimalist'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] bg-opacity-10'
                    : 'border-[var(--glass-border)] hover:border-[var(--accent-primary)]'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Sun size={24} />
                  <h3 className="text-lg font-semibold">Minimalist</h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  Clean, light theme inspired by Apple design
                </p>
              </button>

              <button
                onClick={themeId === 'minimalist' ? toggleTheme : undefined}
                className={`flex-1 p-6 rounded-lg border-2 transition-all ${
                  themeId === 'scifi'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] bg-opacity-10'
                    : 'border-[var(--glass-border)] hover:border-[var(--accent-primary)]'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Moon size={24} />
                  <h3 className="text-lg font-semibold">Dark Sci-Fi</h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  Cyberpunk theme with neon accents
                </p>
              </button>
            </div>
          </div>
        </section>

        {/* Particle Customization */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Sparkles size={20} />
            Particle Background
          </h2>
          <div className="bg-[var(--glass-backdrop)] border border-[var(--glass-border)] rounded-lg p-6">
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomColor}
                  onChange={(e) => setUseCustomColor(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--glass-border)] bg-[var(--bg-secondary)] checked:bg-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]"
                />
                <span className="text-sm">Use custom particle color</span>
              </label>
              <p className="text-xs text-[var(--text-secondary)] mt-1 ml-6">
                By default: black particles on Minimalist theme, white particles on Dark Sci-Fi theme
              </p>
            </div>

            {useCustomColor && (
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm mb-2">Custom Color</label>
                  <input
                    type="color"
                    value={(() => {
                      if (!particleColor) return '#ffffff';
                      const [r, g, b] = particleColor.split(',').map(n => parseInt(n));
                      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                    })()}
                    onChange={(e) => {
                      const hex = e.target.value;
                      // Convert hex to RGB string
                      const r = parseInt(hex.slice(1, 3), 16);
                      const g = parseInt(hex.slice(3, 5), 16);
                      const b = parseInt(hex.slice(5, 7), 16);
                      setParticleColor(`${r},${g},${b}`);
                    }}
                    className="w-full h-12 rounded-lg border-2 border-[var(--glass-border)] cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm mb-2">Preview</label>
                  <div
                    className="w-full h-12 rounded-lg border-2 border-[var(--glass-border)]"
                    style={{ backgroundColor: `rgb(${particleColor || '255,255,255'})` }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Project Directory */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Folder size={20} />
            Project Directory
          </h2>
          <div className="bg-[var(--glass-backdrop)] border border-[var(--glass-border)] rounded-lg p-6">
            <input
              type="text"
              value={projectDir}
              onChange={(e) => setProjectDir(e.target.value)}
              placeholder="/path/to/project"
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-lg focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            />
            <p className="text-sm text-[var(--text-secondary)] mt-2">
              The root directory for orchestration system operations
            </p>
          </div>
        </section>

        {/* AI Model Configuration */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Bot size={20} />
            AI Model Configuration
          </h2>

          {/* Primary Coding Model */}
          <div className="bg-[var(--glass-backdrop)] border border-[var(--glass-border)] rounded-lg p-6 mb-4">
            <h3 className="font-semibold mb-3">Primary Coding Model</h3>
            <select
              value={agentConfig.primary_coder}
              onChange={(e) => setAgentConfig({ ...agentConfig, primary_coder: e.target.value })}
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-lg focus:outline-none focus:border-[var(--accent-primary)] transition-colors capitalize"
            >
              {availableModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
            <p className="text-sm text-[var(--text-secondary)] mt-2">
              The primary AI model used for code generation and task execution
            </p>
          </div>

          {/* Fallback Chain */}
          <div className="bg-[var(--glass-backdrop)] border border-[var(--glass-border)] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Fallback Models</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agentConfig.enable_fallback}
                  onChange={(e) => setAgentConfig({ ...agentConfig, enable_fallback: e.target.checked })}
                  className="w-4 h-4 accent-[var(--accent-primary)]"
                />
                <span className="text-sm">Enable Fallback</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {availableModels.filter(m => m !== agentConfig.primary_coder).map(model => (
                <button
                  key={model}
                  onClick={() => toggleFallbackModel(model)}
                  disabled={!agentConfig.enable_fallback}
                  className={`px-4 py-3 rounded-lg border-2 transition-all capitalize ${
                    agentConfig.fallback_chain.includes(model)
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] bg-opacity-10'
                      : 'border-[var(--glass-border)] hover:border-[var(--accent-primary)]'
                  } ${!agentConfig.enable_fallback ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {model}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-[var(--glass-border)]">
              <label className="text-sm text-[var(--text-secondary)]">Max Retries:</label>
              <input
                type="number"
                min="1"
                max="10"
                value={agentConfig.max_retries_per_agent}
                onChange={(e) => setAgentConfig({ ...agentConfig, max_retries_per_agent: parseInt(e.target.value) })}
                className="w-20 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-lg focus:outline-none focus:border-[var(--accent-primary)]"
              />
            </div>

            <p className="text-sm text-[var(--text-secondary)] mt-4">
              Models used when the primary model fails. Order determines priority.
            </p>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              saved
                ? 'bg-green-500 bg-opacity-20 text-green-500 border-2 border-green-500'
                : 'bg-[var(--accent-primary)] hover:bg-opacity-90 text-white'
            }`}
          >
            {saved ? <Check size={20} /> : <Save size={20} />}
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
