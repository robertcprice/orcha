'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, Maximize2, Filter, X } from 'lucide-react';
import { GlassPanel, BrutalistButton, GlassInput, designTokens } from '@/components/design-system';
import { GraphData, GraphNode, GraphEdge } from '@/lib/vault/graph-builder';

export interface GraphViewProps {
  graph: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  selectedNodeId?: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * GraphView Component
 *
 * Interactive force-directed graph visualization of document connections
 */
export default function GraphView({
  graph,
  onNodeClick,
  selectedNodeId,
  width = 1200,
  height = 800,
  className = ''
}: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Filter graph based on selected groups and search term
  const filteredGraph = React.useMemo(() => {
    let nodes = graph.nodes;
    let edges = graph.edges;

    // Filter by groups
    if (selectedGroups.length > 0) {
      nodes = nodes.filter(n => selectedGroups.includes(n.group));
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      nodes = nodes.filter(n =>
        n.label.toLowerCase().includes(term) ||
        n.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Filter edges to only include nodes that remain
    const nodeIds = new Set(nodes.map(n => n.id));
    edges = edges.filter(e =>
      nodeIds.has(e.source as string) && nodeIds.has(e.target as string)
    );

    return { nodes, edges };
  }, [graph, selectedGroups, searchTerm]);

  // Initialize D3 force simulation
  useEffect(() => {
    if (!svgRef.current) return;
    if (filteredGraph.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    // Create main group for zoom/pan
    const g = svg.append('g');

    // Setup zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoom(event.transform.k);
      });

    svg.call(zoomBehavior);

    // Create arrow markers for directed edges
    svg.append('defs').selectAll('marker')
      .data(['wiki-link', 'related', 'tag', 'backlink'])
      .join('marker')
      .attr('id', d => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', d => getEdgeColor(d));

    // Force simulation
    const simulation = d3.forceSimulation<GraphNode>(filteredGraph.nodes as any)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(filteredGraph.edges as any)
        .id((d: any) => d.id)
        .distance(d => 100 / (d.weight || 1))
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create edges
    const link = g.append('g')
      .selectAll('line')
      .data(filteredGraph.edges)
      .join('line')
      .attr('stroke', d => getEdgeColor(d.type))
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.weight))
      .attr('marker-end', d => `url(#arrow-${d.type})`);

    // Create nodes
    const node = g.append('g')
      .selectAll('g')
      .data(filteredGraph.nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(drag(simulation) as any);

    // Node circles
    node.append('circle')
      .attr('r', d => d.size || 8)
      .attr('fill', d => d.color || designTokens.colors.accent.cyan)
      .attr('stroke', d => d.id === selectedNodeId ? designTokens.colors.accent.yellow : '#000')
      .attr('stroke-width', d => d.id === selectedNodeId ? 3 : 1.5)
      .attr('opacity', 0.9);

    // Node labels
    node.append('text')
      .text(d => d.label)
      .attr('x', d => (d.size || 8) + 5)
      .attr('y', 4)
      .attr('font-family', designTokens.typography.fonts.mono)
      .attr('font-size', '11px')
      .attr('fill', designTokens.colors.text.primary)
      .attr('opacity', 0.8);

    // Node interactions
    node.on('click', (event, d) => {
      event.stopPropagation();
      if (onNodeClick) {
        onNodeClick(d);
      }
    });

    node.on('mouseenter', (event, d) => {
      setHoveredNode(d);

      // Highlight connected nodes
      const connectedNodeIds = new Set<string>();
      filteredGraph.edges.forEach(edge => {
        if (edge.source === d.id || (edge.source as any).id === d.id) {
          connectedNodeIds.add(typeof edge.target === 'string' ? edge.target : (edge.target as any).id);
        }
        if (edge.target === d.id || (edge.target as any).id === d.id) {
          connectedNodeIds.add(typeof edge.source === 'string' ? edge.source : (edge.source as any).id);
        }
      });

      node.selectAll('circle')
        .attr('opacity', (n: any) =>
          n.id === d.id || connectedNodeIds.has(n.id) ? 1 : 0.2
        );

      node.selectAll('text')
        .attr('opacity', (n: any) =>
          n.id === d.id || connectedNodeIds.has(n.id) ? 1 : 0.2
        );

      link.attr('opacity', (e: any) => {
        const sourceId = typeof e.source === 'string' ? e.source : e.source.id;
        const targetId = typeof e.target === 'string' ? e.target : e.target.id;
        return sourceId === d.id || targetId === d.id ? 0.8 : 0.1;
      });
    });

    node.on('mouseleave', () => {
      setHoveredNode(null);
      node.selectAll('circle').attr('opacity', 0.9);
      node.selectAll('text').attr('opacity', 0.8);
      link.attr('opacity', 0.6);
    });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Drag behavior
    function drag(simulation: d3.Simulation<GraphNode, undefined>) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    }

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [filteredGraph, width, height, selectedNodeId, onNodeClick]);

  const handleZoomIn = useCallback(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      1.3
    );
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      0.7
    );
  }, []);

  const handleResetZoom = useCallback(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      d3.zoomIdentity
    );
  }, []);

  const toggleGroup = (group: string) => {
    setSelectedGroups(prev =>
      prev.includes(group)
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

  function getEdgeColor(type: string): string {
    const colors: Record<string, string> = {
      'wiki-link': designTokens.colors.accent.cyan,
      'related': designTokens.colors.accent.magenta,
      'tag': designTokens.colors.accent.yellow,
      'backlink': designTokens.colors.accent.purple
    };
    return colors[type] || designTokens.colors.text.tertiary;
  }

  return (
    <div className={className}>
      {/* Controls */}
      <GlassPanel
        bordered
        borderColor={designTokens.colors.accent.cyan}
        style={{
          padding: designTokens.spacing.md,
          marginBottom: designTokens.spacing.md,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.md, flexWrap: 'wrap' }}>
          {/* Zoom controls */}
          <div style={{ display: 'flex', gap: designTokens.spacing.xs }}>
            <BrutalistButton variant="secondary" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </BrutalistButton>
            <div
              style={{
                padding: `${designTokens.spacing.xs} ${designTokens.spacing.sm}`,
                fontFamily: designTokens.typography.fonts.mono,
                fontSize: designTokens.typography.sizes.sm,
                color: designTokens.colors.text.primary,
                backgroundColor: designTokens.colors.structure.surface.secondary,
                display: 'flex',
                alignItems: 'center',
                minWidth: '60px',
                justifyContent: 'center',
              }}
            >
              {Math.round(zoom * 100)}%
            </div>
            <BrutalistButton variant="secondary" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </BrutalistButton>
            <BrutalistButton variant="secondary" size="sm" onClick={handleResetZoom}>
              <Maximize2 className="w-4 h-4" />
            </BrutalistButton>
          </div>

          {/* Search */}
          <div style={{ flex: 1, minWidth: '200px', maxWidth: '400px' }}>
            <GlassInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search nodes..."
              fullWidth
            />
          </div>

          {/* Group filters */}
          <div style={{ display: 'flex', gap: designTokens.spacing.xs, flexWrap: 'wrap' }}>
            {graph.stats.groups.map(group => (
              <BrutalistButton
                key={group}
                variant={selectedGroups.includes(group) ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => toggleGroup(group)}
              >
                {selectedGroups.includes(group) && <Filter className="w-3 h-3" />}
                <span>{group}</span>
              </BrutalistButton>
            ))}
            {selectedGroups.length > 0 && (
              <BrutalistButton
                variant="secondary"
                size="sm"
                onClick={() => setSelectedGroups([])}
              >
                <X className="w-3 h-3" />
                <span>Clear</span>
              </BrutalistButton>
            )}
          </div>
        </div>
      </GlassPanel>

      {/* Graph visualization */}
      <GlassPanel
        bordered
        borderColor={designTokens.colors.structure.border.secondary}
        style={{
          padding: 0,
          overflow: 'hidden',
          backgroundColor: designTokens.colors.structure.bg.primary,
          position: 'relative',
        }}
      >
        <svg
          ref={svgRef}
          width={width}
          height={height}
          style={{
            backgroundColor: designTokens.colors.structure.bg.primary,
          }}
        />

        {/* Hover tooltip */}
        {hoveredNode && (
          <div
            style={{
              position: 'absolute',
              top: designTokens.spacing.md,
              right: designTokens.spacing.md,
              padding: designTokens.spacing.md,
              backgroundColor: `${designTokens.colors.structure.bg.secondary}ee`,
              backdropFilter: 'blur(10px)',
              border: `1px solid ${designTokens.colors.structure.border.secondary}`,
              borderRadius: '4px',
              maxWidth: '300px',
            }}
          >
            <h4
              style={{
                fontFamily: designTokens.typography.fonts.header,
                fontSize: designTokens.typography.sizes.base,
                fontWeight: designTokens.typography.weights.semibold,
                color: designTokens.colors.text.primary,
                marginBottom: designTokens.spacing.xs,
              }}
            >
              {hoveredNode.label}
            </h4>
            <p
              style={{
                fontFamily: designTokens.typography.fonts.mono,
                fontSize: designTokens.typography.sizes.xs,
                color: designTokens.colors.text.tertiary,
                marginBottom: designTokens.spacing.xs,
              }}
            >
              {hoveredNode.path}
            </p>
            <div
              style={{
                display: 'flex',
                gap: designTokens.spacing.xs,
                flexWrap: 'wrap',
                marginTop: designTokens.spacing.sm,
              }}
            >
              <span
                style={{
                  fontSize: designTokens.typography.sizes.xs,
                  padding: '2px 6px',
                  backgroundColor: `${hoveredNode.color}30`,
                  color: hoveredNode.color,
                  fontFamily: designTokens.typography.fonts.mono,
                }}
              >
                {hoveredNode.group}
              </span>
              {hoveredNode.tags.slice(0, 3).map((tag, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: designTokens.typography.sizes.xs,
                    padding: '2px 6px',
                    backgroundColor: `${designTokens.colors.accent.yellow}20`,
                    color: designTokens.colors.accent.yellow,
                    fontFamily: designTokens.typography.fonts.mono,
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </GlassPanel>

      {/* Stats */}
      <GlassPanel
        bordered
        borderColor={designTokens.colors.accent.purple}
        style={{
          padding: designTokens.spacing.md,
          marginTop: designTokens.spacing.md,
          backgroundColor: `${designTokens.colors.accent.purple}10`,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: designTokens.spacing.md,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: designTokens.typography.fonts.mono,
                fontSize: designTokens.typography.sizes.xs,
                color: designTokens.colors.text.tertiary,
                marginBottom: designTokens.spacing.xs,
              }}
            >
              Nodes
            </div>
            <div
              style={{
                fontFamily: designTokens.typography.fonts.header,
                fontSize: designTokens.typography.sizes.xl,
                fontWeight: designTokens.typography.weights.bold,
                color: designTokens.colors.accent.cyan,
              }}
            >
              {filteredGraph.nodes.length} / {graph.stats.totalNodes}
            </div>
          </div>

          <div>
            <div
              style={{
                fontFamily: designTokens.typography.fonts.mono,
                fontSize: designTokens.typography.sizes.xs,
                color: designTokens.colors.text.tertiary,
                marginBottom: designTokens.spacing.xs,
              }}
            >
              Edges
            </div>
            <div
              style={{
                fontFamily: designTokens.typography.fonts.header,
                fontSize: designTokens.typography.sizes.xl,
                fontWeight: designTokens.typography.weights.bold,
                color: designTokens.colors.accent.magenta,
              }}
            >
              {filteredGraph.edges.length} / {graph.stats.totalEdges}
            </div>
          </div>

          <div>
            <div
              style={{
                fontFamily: designTokens.typography.fonts.mono,
                fontSize: designTokens.typography.sizes.xs,
                color: designTokens.colors.text.tertiary,
                marginBottom: designTokens.spacing.xs,
              }}
            >
              Groups
            </div>
            <div
              style={{
                fontFamily: designTokens.typography.fonts.header,
                fontSize: designTokens.typography.sizes.xl,
                fontWeight: designTokens.typography.weights.bold,
                color: designTokens.colors.accent.yellow,
              }}
            >
              {graph.stats.groups.length}
            </div>
          </div>

          <div>
            <div
              style={{
                fontFamily: designTokens.typography.fonts.mono,
                fontSize: designTokens.typography.sizes.xs,
                color: designTokens.colors.text.tertiary,
                marginBottom: designTokens.spacing.xs,
              }}
            >
              Hubs
            </div>
            <div
              style={{
                fontFamily: designTokens.typography.fonts.header,
                fontSize: designTokens.typography.sizes.xl,
                fontWeight: designTokens.typography.weights.bold,
                color: designTokens.colors.accent.purple,
              }}
            >
              {graph.stats.hubs.length}
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
