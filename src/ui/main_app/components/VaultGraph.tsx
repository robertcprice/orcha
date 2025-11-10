'use client';

import React, { useEffect, useRef, useState } from 'react';
import { designTokens } from '@/components/design-system';

interface GraphNode {
  id: string;
  label: string;
  path: string;
  type: 'file' | 'directory';
  tags?: string[];
  links?: string[];
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'wiki-link' | 'tag' | 'parent';
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface VaultGraphProps {
  data?: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  highlightNode?: string | null;
  width?: number;
  height?: number;
}

export default function VaultGraph({
  data,
  onNodeClick,
  highlightNode,
  width = 800,
  height = 600,
}: VaultGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!data) return;

    // Initialize node positions
    const initializedNodes = data.nodes.map((node, i) => {
      const angle = (i / data.nodes.length) * Math.PI * 2;
      const radius = Math.min(width, height) * 0.3;
      return {
        ...node,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      };
    });

    setNodes(initializedNodes);
    setEdges(data.edges);
  }, [data, width, height]);

  useEffect(() => {
    if (highlightNode) {
      setSelectedNode(highlightNode);
    }
  }, [highlightNode]);

  // Force-directed graph simulation
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const simulate = () => {
      if (!isRunning) return;

      // Apply forces
      const updatedNodes = nodes.map((node) => ({ ...node }));

      // Repulsion between nodes
      for (let i = 0; i < updatedNodes.length; i++) {
        for (let j = i + 1; j < updatedNodes.length; j++) {
          const dx = updatedNodes[j].x - updatedNodes[i].x;
          const dy = updatedNodes[j].y - updatedNodes[i].y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 1000 / (distance * distance);

          updatedNodes[i].vx -= (dx / distance) * force;
          updatedNodes[i].vy -= (dy / distance) * force;
          updatedNodes[j].vx += (dx / distance) * force;
          updatedNodes[j].vy += (dy / distance) * force;
        }
      }

      // Attraction along edges
      edges.forEach((edge) => {
        const source = updatedNodes.find((n) => n.id === edge.source);
        const target = updatedNodes.find((n) => n.id === edge.target);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = distance * 0.01;

          source.vx += (dx / distance) * force;
          source.vy += (dy / distance) * force;
          target.vx -= (dx / distance) * force;
          target.vy -= (dy / distance) * force;
        }
      });

      // Center gravity
      const centerX = width / 2;
      const centerY = height / 2;
      updatedNodes.forEach((node) => {
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        node.vx += dx * 0.001;
        node.vy += dy * 0.001;
      });

      // Update positions with damping
      updatedNodes.forEach((node) => {
        node.vx *= 0.85;
        node.vy *= 0.85;
        node.x += node.vx;
        node.y += node.vy;

        // Keep within bounds
        const padding = 50;
        node.x = Math.max(padding, Math.min(width - padding, node.x));
        node.y = Math.max(padding, Math.min(height - padding, node.y));
      });

      setNodes(updatedNodes);

      // Render
      render(ctx, updatedNodes);

      animationRef.current = requestAnimationFrame(simulate);
    };

    const render = (ctx: CanvasRenderingContext2D, renderNodes: any[]) => {
      // Clear canvas
      ctx.fillStyle = designTokens.colors.structure.bg.primary;
      ctx.fillRect(0, 0, width, height);

      // Draw edges
      edges.forEach((edge) => {
        const source = renderNodes.find((n) => n.id === edge.source);
        const target = renderNodes.find((n) => n.id === edge.target);
        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);

          if (edge.type === 'wiki-link') {
            ctx.strokeStyle = designTokens.colors.accent.cyan + '40';
            ctx.lineWidth = 2;
          } else if (edge.type === 'tag') {
            ctx.strokeStyle = designTokens.colors.accent.yellow + '30';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
          } else {
            ctx.strokeStyle = designTokens.colors.structure.border.tertiary + '20';
            ctx.lineWidth = 1;
          }

          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // Draw nodes
      renderNodes.forEach((node) => {
        const isHovered = hoveredNode === node.id;
        const isSelected = selectedNode === node.id;
        const nodeRadius = isSelected ? 12 : isHovered ? 10 : 8;

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);

        if (isSelected) {
          ctx.fillStyle = designTokens.colors.accent.magenta;
          ctx.strokeStyle = designTokens.colors.accent.magenta;
          ctx.lineWidth = 3;
        } else if (isHovered) {
          ctx.fillStyle = designTokens.colors.accent.cyan;
          ctx.strokeStyle = designTokens.colors.accent.cyan;
          ctx.lineWidth = 2;
        } else if (node.type === 'directory') {
          ctx.fillStyle = designTokens.colors.accent.purple + '80';
          ctx.strokeStyle = designTokens.colors.accent.purple;
          ctx.lineWidth = 1;
        } else {
          ctx.fillStyle = designTokens.colors.accent.blue + '80';
          ctx.strokeStyle = designTokens.colors.accent.blue;
          ctx.lineWidth = 1;
        }

        ctx.fill();
        ctx.stroke();

        // Node label
        if (isHovered || isSelected) {
          ctx.fillStyle = designTokens.colors.text.primary;
          ctx.font = `12px ${designTokens.typography.fonts.mono}`;
          ctx.textAlign = 'center';
          ctx.fillText(node.label, node.x, node.y - nodeRadius - 5);
        }
      });
    };

    simulate();

    return () => {
      isRunning = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes, edges, width, height, hoveredNode, selectedNode]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let foundNode: string | null = null;
    for (const node of nodes) {
      const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
      if (distance < 12) {
        foundNode = node.id;
        break;
      }
    }

    setHoveredNode(foundNode);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const node of nodes) {
      const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
      if (distance < 12) {
        setSelectedNode(node.id);
        if (onNodeClick) {
          onNodeClick(node);
        }
        break;
      }
    }
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        style={{
          cursor: hoveredNode ? 'pointer' : 'default',
          borderRadius: designTokens.borders.radiusLg,
          backgroundColor: designTokens.colors.structure.bg.primary,
        }}
      />

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          padding: designTokens.spacing.md,
          backgroundColor: designTokens.colors.structure.surface.primary + 'DD',
          backdropFilter: 'blur(8px)',
          borderRadius: designTokens.borders.radius,
          border: `1px solid ${designTokens.colors.structure.border.secondary}`,
        }}
      >
        <div style={{ fontSize: designTokens.typography.sizes.xs, fontFamily: designTokens.typography.fonts.mono }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.xs, marginBottom: '4px' }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: designTokens.colors.accent.blue + '80',
                border: `1px solid ${designTokens.colors.accent.blue}`,
              }}
            />
            <span style={{ color: designTokens.colors.text.secondary }}>File</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.xs, marginBottom: '4px' }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: designTokens.colors.accent.purple + '80',
                border: `1px solid ${designTokens.colors.accent.purple}`,
              }}
            />
            <span style={{ color: designTokens.colors.text.secondary }}>Directory</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.xs }}>
            <div
              style={{
                width: 20,
                height: 2,
                backgroundColor: designTokens.colors.accent.cyan + '40',
              }}
            />
            <span style={{ color: designTokens.colors.text.secondary }}>Wiki Link</span>
          </div>
        </div>
      </div>
    </div>
  );
}
