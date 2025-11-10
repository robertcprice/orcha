'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Cpu, Zap, CheckCircle, XCircle, Clock, Code, Shield, Book, Brain, Lightbulb } from 'lucide-react';

interface AgentNodeProps {
  id: string;
  name: string;
  type: string;
  status: 'spawning' | 'planning' | 'active' | 'complete' | 'idle' | 'error';
  x: number;
  y: number;
  depth: number; // ✅ FIX 3: Tree depth for z-index
  onClick: () => void;
}

export default function AgentNode({ id, name, type, status, x, y, depth, onClick }: AgentNodeProps) {
  const { theme } = useTheme();
  const [hasNotification, setHasNotification] = useState(false);

  useEffect(() => {
    if (status === 'active' || status === 'planning' || status === 'complete') {
      setHasNotification(true);
      setTimeout(() => setHasNotification(false), 3000);
    }
  }, [status]);

  const getNodeColor = () => {
    // Planning nodes have specific colors based on AI model
    if (type === 'planning') {
      if (name === 'Claude') return '#9333EA'; // Purple
      if (name === 'ChatGPT') return '#10B981'; // Green
      if (name === 'DeepSeek') return '#3B82F6'; // Blue
      if (name === 'Grok') return '#F97316'; // Orange
      if (name === 'Gemini') return '#EAB308'; // Yellow
      return '#6B7280'; // Default gray
    }
    return null;
  };

  const getStatusColor = () => {
    const nodeColor = getNodeColor();
    if (nodeColor) return nodeColor;
    
    switch (status) {
      case 'spawning': return 'var(--agent-orchestrator)';
      case 'planning': return 'var(--agent-planning)';
      case 'active': return 'var(--agent-active)';
      case 'complete': return 'var(--agent-complete)';
      case 'error': return 'var(--agent-error)';
      default: return 'var(--agent-idle)';
    }
  };

  // ✅ PHASE 4: Get icon based on agent type (not status)
  const getNodeTypeIcon = () => {
    const lowerType = type.toLowerCase();
    const lowerName = name.toLowerCase();

    // Planning nodes - brain/lightbulb
    if (lowerType === 'planning' || lowerName.includes('plan')) {
      return <Brain size={20} />;
    }

    // Code-writing agents - code icon
    if (lowerType === 'im' || lowerType === 'codex' || lowerType === 'claude' ||
        lowerName.includes('code') || lowerName.includes('implement')) {
      return <Code size={20} />;
    }

    // Review/security agents - shield icon
    if (lowerType === 'ar' || lowerName.includes('review') || lowerName.includes('security')) {
      return <Shield size={20} />;
    }

    // Documentation agents - book icon
    if (lowerType === 'rd' || lowerName.includes('doc') || lowerName.includes('research')) {
      return <Book size={20} />;
    }

    // Orchestrator - CPU
    if (lowerType === 'orchestrator') {
      return <Cpu size={20} />;
    }

    // Default - lightbulb for unknown types
    return <Lightbulb size={20} />;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'idle': return <Cpu size={20} />;
      case 'planning': return <Clock size={20} />;
      case 'active': return <Zap size={20} />;
      case 'complete': return <CheckCircle size={20} />;
      case 'error': return <XCircle size={20} />;
      default: return <Cpu size={20} />;
    }
  };

  const getAnimationClass = () => {
    if (status === 'spawning') return 'animate-[node-spawn_0.4s_ease-out]';
    if (status === 'planning' || status === 'active') return 'animate-[node-pulse_2s_ease-in-out_infinite]';
    return '';
  };

  const getGlowEffect = () => {
    const color = getStatusColor();
    if (status === 'spawning' || status === 'planning' || status === 'active') {
      // Enhanced glowing with multiple layers and stronger intensity
      return `
        drop-shadow(0 0 20px ${color}) 
        drop-shadow(0 0 12px ${color}) 
        drop-shadow(0 0 6px ${color})
        drop-shadow(0 0 3px ${color})
      `.trim();
    }
    if (status === 'complete') {
      // Subtle glow for completed nodes
      return `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 4px ${color})`;
    }
    return 'none';
  };

  const getBoxShadow = () => {
    const color = getStatusColor();
    if (status === 'spawning' || status === 'planning' || status === 'active') {
      // Additional box-shadow for extra glow effect
      return `0 0 20px ${color}40, 0 0 40px ${color}20, inset 0 0 20px ${color}10`;
    }
    return 'none';
  };

  // Calculate node dimensions for centering
  const nodeSize = type === 'orchestrator' ? 80 : type === 'planning' ? 70 : 60;
  const labelHeight = 32; // mt-2 + text height
  const totalHeight = nodeSize + labelHeight;

  return (
    <div
      className={`absolute cursor-pointer group ${getAnimationClass()}`}
      style={{
        // ✅ FIX: Use calc() to center node at x%, y% WITHOUT transform
        // This ensures connection lines align perfectly with node centers
        left: `calc(${x}% - ${nodeSize / 2}px)`,
        top: `calc(${y}% - ${nodeSize / 2}px)`,
        width: `${nodeSize}px`, // ✅ FIX: Fixed width prevents label from affecting position
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 10 + depth // ✅ FIX 3: Higher z-index for deeper nodes (prevents overlap issues)
      }}
      onClick={onClick}
    >
      {hasNotification && (
        <div
          className="absolute px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap animate-bounce"
          style={{
            background: getStatusColor(),
            color: '#FFFFFF',
            top: '-32px',
            left: '50%',
            transform: 'translateX(-50%)' // This is OK - relative to parent, not viewport
          }}
        >
          {status === 'planning' && 'Planning...'}
          {status === 'active' && 'Executing'}
          {status === 'complete' && 'Complete'}
        </div>
      )}
      <div
        className="relative"
        style={{
          width: type === 'orchestrator' ? '80px' : type === 'planning' ? '70px' : '60px',
          height: type === 'orchestrator' ? '80px' : type === 'planning' ? '70px' : '60px',
          background: 'var(--bg-secondary)',
          border: `3px solid ${getStatusColor()}`,
          borderRadius: '50%',
          color: getStatusColor(),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: getGlowEffect(),
          boxShadow: getBoxShadow(),
          transition: 'all 0.3s ease-in-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* ✅ PHASE 4: Show node type icon (brain/code/shield/book) instead of status icon */}
          {getNodeTypeIcon()}
        </div>
      </div>
      {/* Agent name label below node */}
      <div
        className="mt-2 px-2 py-1 rounded text-xs font-medium whitespace-nowrap"
        style={{
          color: '#FFFFFF', // ✅ FIX: Always white for visibility in both light/dark modes
          background: 'rgba(0, 0, 0, 0.6)',
          maxWidth: '120px',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {name}
      </div>
    </div>
  );
}
