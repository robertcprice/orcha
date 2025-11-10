"use client";

import { useState, useEffect, useRef } from "react";
import { FileText, Search, Network, Folder, Tag, BookOpen, Eye, Sparkles, ChevronRight, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import MarkdownViewer from "./MarkdownViewer";

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  tags?: string[];
  frontmatter?: Record<string, any>;
}

interface SearchResult {
  path: string;
  name: string;
  matches: Array<{
    line: number;
    content: string;
    context: string;
  }>;
  score: number;
  frontmatter?: Record<string, any>;
}

interface GraphNode {
  id: string;
  label: string;
  path: string;
  type?: string;
  tags?: string[];
  group?: string;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
  type: 'wiki-link' | 'tag' | 'backlink';
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface AIInsight {
  type: 'progress' | 'blocker' | 'suggestion' | 'achievement';
  title: string;
  description: string;
  confidence: number;
}

export default function ObsidianKnowledgeEnhanced() {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['00-Index', '05-Agent-Sessions']));
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);

  // Graph visualization state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Map<string, { x: number; y: number; vx: number; vy: number }>>(new Map());
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (graphData && canvasRef.current) {
      initializePositions();
      const interval = setInterval(updateSimulation, 16);
      return () => clearInterval(interval);
    }
  }, [graphData]);

  useEffect(() => {
    if (canvasRef.current && nodes.size > 0) {
      drawGraph();
    }
  }, [nodes, zoom, pan, hoveredNode, selectedFile]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  async function fetchData() {
    try {
      setLoading(true);
      const [filesRes, graphRes] = await Promise.all([
        fetch('/api/obsidian/files'),
        fetch('/api/obsidian/graph')
      ]);

      const filesData = await filesRes.json();
      const graphDataRes = await graphRes.json();

      if (filesData.ok) {
        setTree(filesData.tree);
      }

      if (graphDataRes.ok) {
        setGraphData(graphDataRes.graph);
        generateAIInsights(filesData.tree, graphDataRes.graph);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function performSearch() {
    try {
      setSearching(true);
      const res = await fetch(`/api/obsidian/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.ok) {
        setSearchResults(data.results);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setSearching(false);
    }
  }

  function generateAIInsights(fileTree: FileNode[], graph: GraphData) {
    const insights: AIInsight[] = [];

    // Count files by directory
    const sessionCount = countFilesInDir(fileTree, '05-Agent-Sessions');
    const experimentCount = countFilesInDir(fileTree, '03-Experiments');
    const milestoneCount = countFilesInDir(fileTree, '09-Milestones');

    // Progress insight
    if (sessionCount > 0) {
      insights.push({
        type: 'achievement',
        title: `${sessionCount} Agent Sessions Logged`,
        description: 'Active development with comprehensive session tracking',
        confidence: 0.95
      });
    }

    // Graph connectivity insight
    const avgConnections = graph.links.length / graph.nodes.length;
    if (avgConnections < 1.5) {
      insights.push({
        type: 'suggestion',
        title: 'Low Note Connectivity',
        description: 'Consider adding more cross-references between related notes using [[wiki-links]]',
        confidence: 0.8
      });
    }

    // Experiment tracking
    if (experimentCount > 0) {
      insights.push({
        type: 'progress',
        title: `${experimentCount} Experiments Documented`,
        description: 'Good scientific approach with experiment tracking',
        confidence: 0.9
      });
    }

    // Check for recent activity
    const recentNodes = graph.nodes.filter(n => n.group === 'sessions').length;
    if (recentNodes === 0) {
      insights.push({
        type: 'blocker',
        title: 'No Recent Session Activity',
        description: 'No agent sessions detected. Ensure auto-documentation is working.',
        confidence: 0.85
      });
    }

    // Milestone progress
    if (milestoneCount > 0) {
      insights.push({
        type: 'achievement',
        title: `${milestoneCount} Milestones Reached`,
        description: 'Strong progress tracking with documented milestones',
        confidence: 0.95
      });
    }

    setAiInsights(insights);
  }

  function countFilesInDir(nodes: FileNode[], dirName: string): number {
    for (const node of nodes) {
      if (node.type === 'directory' && node.name === dirName) {
        return countFiles(node.children || []);
      }
    }
    return 0;
  }

  function countFiles(nodes: FileNode[]): number {
    return nodes.reduce((count, node) => {
      if (node.type === 'file') return count + 1;
      if (node.children) return count + countFiles(node.children);
      return count;
    }, 0);
  }

  function initializePositions() {
    if (!graphData || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const newNodes = new Map();

    graphData.nodes.forEach((node, i) => {
      const angle = (i / graphData.nodes.length) * 2 * Math.PI;
      const radius = Math.min(width, height) / 3;

      newNodes.set(node.id, {
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      });
    });

    setNodes(newNodes);
  }

  function updateSimulation() {
    if (!graphData) return;

    const newNodes = new Map(nodes);
    const alpha = 0.1;
    const linkStrength = 0.1;
    const repelStrength = 100;

    // Apply spring forces for links
    graphData.links.forEach(link => {
      const source = newNodes.get(link.source);
      const target = newNodes.get(link.target);

      if (source && target) {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (distance - 50) * linkStrength;

        source.vx += (dx / distance) * force;
        source.vy += (dy / distance) * force;
        target.vx -= (dx / distance) * force;
        target.vy -= (dy / distance) * force;
      }
    });

    // Repel nodes
    for (const [id1, node1] of newNodes) {
      for (const [id2, node2] of newNodes) {
        if (id1 !== id2) {
          const dx = node2.x - node1.x;
          const dy = node2.y - node1.y;
          const distSq = dx * dx + dy * dy || 1;
          const force = repelStrength / distSq;

          node1.vx -= (dx / Math.sqrt(distSq)) * force;
          node1.vy -= (dy / Math.sqrt(distSq)) * force;
        }
      }
    }

    // Update positions
    for (const node of newNodes.values()) {
      node.x += node.vx * alpha;
      node.y += node.vy * alpha;
      node.vx *= 0.9;
      node.vy *= 0.9;
    }

    setNodes(newNodes);
  }

  function drawGraph() {
    const canvas = canvasRef.current;
    if (!canvas || !graphData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = containerRef.current?.clientWidth || 800;
    canvas.height = containerRef.current?.clientHeight || 600;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const groupColors: Record<string, string> = {
      architecture: '#3b82f6',
      components: '#f97316',
      experiments: '#10b981',
      decisions: '#a855f7',
      sessions: '#eab308',
      milestones: '#ef4444',
      research: '#06b6d4',
      tag: '#64748b',
      default: '#6b7280',
    };

    // Draw links with highlight for selected/hovered nodes
    graphData.links.forEach(link => {
      const source = nodes.get(link.source);
      const target = nodes.get(link.target);

      if (source && target) {
        const isHighlighted =
          link.source === hoveredNode ||
          link.target === hoveredNode ||
          link.source === selectedFile ||
          link.target === selectedFile;

        ctx.strokeStyle = isHighlighted ? '#3b82f6' : '#374151';
        ctx.lineWidth = isHighlighted ? 2 : 1;
        ctx.globalAlpha = isHighlighted ? 0.8 : 0.2;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      }
    });

    // Draw nodes
    ctx.globalAlpha = 1;
    graphData.nodes.forEach(node => {
      const pos = nodes.get(node.id);
      if (!pos) return;

      const isSelected = selectedFile === node.path;
      const isHovered = hoveredNode === node.id;
      const radius = isSelected || isHovered ? 8 : 5;
      const color = groupColors[node.group || 'default'];

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      if (isSelected || isHovered) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#f3f4f6';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.label.slice(0, 25), pos.x, pos.y - 12);
      }
    });

    ctx.restore();
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!graphData || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    for (const node of graphData.nodes) {
      const pos = nodes.get(node.id);
      if (!pos) continue;

      const dx = x - pos.x;
      const dy = y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 10) {
        setSelectedFile(node.path);
        return;
      }
    }
  }

  function handleCanvasMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!graphData || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    for (const node of graphData.nodes) {
      const pos = nodes.get(node.id);
      if (!pos) continue;

      const dx = x - pos.x;
      const dy = y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 10) {
        setHoveredNode(node.id);
        return;
      }
    }
    setHoveredNode(null);
  }

  function toggleDir(path: string) {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);
  }

  function renderFileTree(nodes: FileNode[], depth: number = 0): React.ReactNode {
    return nodes.map(node => {
      if (node.type === 'directory') {
        const isExpanded = expandedDirs.has(node.path);
        return (
          <div key={node.path}>
            <button
              onClick={() => toggleDir(node.path)}
              className="w-full text-left px-3 py-2 hover:bg-primary/10 rounded-lg transition-all flex items-center gap-2 text-sm group"
              style={{ paddingLeft: `${depth * 12 + 12}px` }}
            >
              <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              <Folder className={`w-4 h-4 ${isExpanded ? 'text-primary' : 'text-muted-foreground'} group-hover:text-primary transition-colors`} />
              <span className="font-medium">{node.name}</span>
              <span className="text-xs text-muted-foreground ml-auto px-2 py-0.5 rounded-full bg-secondary">
                {node.children?.length || 0}
              </span>
            </button>
            {isExpanded && node.children && (
              <div className="mt-1">
                {renderFileTree(node.children, depth + 1)}
              </div>
            )}
          </div>
        );
      } else {
        const isSelected = selectedFile === node.path;
        return (
          <button
            key={node.path}
            onClick={() => setSelectedFile(node.path)}
            className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-sm group ${
              isSelected ? 'bg-primary/20 text-primary' : 'hover:bg-primary/10'
            }`}
            style={{ paddingLeft: `${depth * 12 + 24}px` }}
          >
            <FileText className={`w-3 h-3 ${isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
            <span className="flex-1 truncate">{node.name.replace('.md', '')}</span>
            {node.frontmatter?.status && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                node.frontmatter.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                node.frontmatter.status === 'in-progress' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-secondary text-muted-foreground'
              }`}>
                {node.frontmatter.status}
              </span>
            )}
          </button>
        );
      }
    });
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card/50 backdrop-blur p-12">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-muted-foreground">Loading knowledge base...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-gradient-to-br from-card/80 to-card/40 backdrop-blur shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-primary" />
                <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                  Knowledge Graph
                </span>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Interactive visualization of your project documentation
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search across all notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-border bg-background/50 backdrop-blur text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            {searching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Three-Column Layout */}
        <div className="grid grid-cols-[280px_1fr_320px] gap-4 p-4" style={{ height: '700px' }}>
          {/* Left: File Tree */}
          <div className="rounded-lg border border-border/50 bg-card/30 backdrop-blur overflow-hidden flex flex-col">
            <div className="p-3 border-b border-border/50 bg-secondary/20">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Folder className="w-4 h-4 text-primary" />
                Files
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              <div className="space-y-1">
                {renderFileTree(tree)}
              </div>
            </div>
          </div>

          {/* Center: Graph Visualization */}
          <div className="rounded-lg border border-border/50 bg-card/30 backdrop-blur overflow-hidden flex flex-col">
            <div className="p-3 border-b border-border/50 bg-secondary/20 flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Network className="w-4 h-4 text-primary" />
                Connections
                <span className="text-xs text-muted-foreground ml-2">
                  {graphData?.nodes.length || 0} nodes • {graphData?.links.length || 0} links
                </span>
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={() => setZoom(z => Math.min(z + 0.2, 2))}
                  className="px-2 py-1 text-xs rounded hover:bg-secondary/50 transition-colors"
                >
                  Zoom +
                </button>
                <button
                  onClick={() => setZoom(z => Math.max(z - 0.2, 0.3))}
                  className="px-2 py-1 text-xs rounded hover:bg-secondary/50 transition-colors"
                >
                  Zoom −
                </button>
              </div>
            </div>
            <div ref={containerRef} className="flex-1 bg-gradient-to-br from-secondary/10 to-transparent">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMouseMove}
                className="w-full h-full cursor-crosshair"
              />
            </div>
          </div>

          {/* Right: AI Insights */}
          <div className="rounded-lg border border-border/50 bg-card/30 backdrop-blur overflow-hidden flex flex-col">
            <div className="p-3 border-b border-border/50 bg-gradient-to-r from-primary/10 to-transparent">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI Insights
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {aiInsights.map((insight, idx) => (
                <div
                  key={`ai-insight-${idx}-${insight.title.slice(0, 20).replace(/\s/g, '-')}`}
                  className={`p-4 rounded-lg border ${
                    insight.type === 'achievement' ? 'bg-green-500/10 border-green-500/30' :
                    insight.type === 'progress' ? 'bg-blue-500/10 border-blue-500/30' :
                    insight.type === 'blocker' ? 'bg-red-500/10 border-red-500/30' :
                    'bg-yellow-500/10 border-yellow-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {insight.type === 'achievement' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                      {insight.type === 'progress' && <TrendingUp className="w-4 h-4 text-blue-400" />}
                      {insight.type === 'blocker' && <AlertCircle className="w-4 h-4 text-red-400" />}
                      {insight.type === 'suggestion' && <Sparkles className="w-4 h-4 text-yellow-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold mb-1">{insight.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${insight.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(insight.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {searchResults.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                    Search Results
                  </h4>
                  <div className="space-y-2">
                    {searchResults.slice(0, 5).map((result) => (
                      <button
                        key={result.path}
                        onClick={() => setSelectedFile(result.path)}
                        className="w-full text-left p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-all border border-border/30"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-3 h-3 text-primary" />
                          <span className="text-xs font-medium truncate">
                            {result.name.replace('.md', '')}
                          </span>
                        </div>
                        {result.matches[0] && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {result.matches[0].content}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Markdown Viewer Modal */}
      {selectedFile && (
        <MarkdownViewer
          filePath={selectedFile}
          onClose={() => setSelectedFile(null)}
        />
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }
      `}</style>
    </>
  );
}
