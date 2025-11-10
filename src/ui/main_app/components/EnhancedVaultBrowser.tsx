'use client';

import React, { useState, useEffect } from 'react';
import { GlassPanel, BrutalistButton, designTokens } from '@/components/design-system';
import {  Folder, FileText, Search, Network, BookOpen, Maximize2, Minimize2 } from 'lucide-react';
import VaultGraph from '@/components/VaultGraph';
import DocumentReader from '@/components/DocumentReader';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  tags?: string[];
  frontmatter?: Record<string, any>;
}

interface GraphData {
  nodes: Array<{
    id: string;
    label: string;
    path: string;
    type: 'file' | 'directory';
    tags?: string[];
  }>;
  links: Array<{
    source: string;
    target: string;
    type: 'wiki-link' | 'tag' | 'backlink';
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: 'wiki-link' | 'tag' | 'parent';
  }>;
}

export default function EnhancedVaultBrowser() {
  const [view, setView] = useState<'tree' | 'graph' | 'reader' | 'split'>('split');
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['01-Architecture', '02-Components']));
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [backlinks, setBacklinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [treeWidth, setTreeWidth] = useState(300);
  const [graphWidth, setGraphWidth] = useState(600);

  useEffect(() => {
    fetchFileTree();
    fetchGraphData();
  }, []);

  const fetchFileTree = async () => {
    try {
      const res = await fetch('/api/obsidian/files');
      const data = await res.json();
      if (data.ok) {
        setFileTree(data.tree);
      }
    } catch (error) {
      console.error('Error fetching file tree:', error);
    }
  };

  const fetchGraphData = async () => {
    try {
      const res = await fetch('/api/obsidian/graph');
      const data = await res.json();
      if (data.ok) {
        // Map links to edges for compatibility with VaultGraph
        const graphWithEdges = {
          ...data.graph,
          edges: data.graph.links || []
        };
        setGraphData(graphWithEdges);
      }
    } catch (error) {
      console.error('Error fetching graph data:', error);
    }
  };

  const toggleDir = (path: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);
  };

  const selectFile = async (filePath: string) => {
    setSelectedFile(filePath);
    setLoading(true);
    try {
      const res = await fetch(`/api/obsidian/read?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.ok) {
        setFileContent(data.content);

        // Fetch backlinks
        const filename = filePath.split('/').pop();
        if (filename) {
          const backlinkRes = await fetch(`/api/obsidian/backlinks?filename=${encodeURIComponent(filename)}`);
          const backlinkData = await backlinkRes.json();
          if (backlinkData.ok) {
            setBacklinks(backlinkData.backlinks);
          }
        }
      }
    } catch (error) {
      console.error('Error reading file:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGraphNodeClick = (node: any) => {
    if (node.path) {
      selectFile(node.path);
    }
  };

  const handleWikiLinkClick = (linkText: string) => {
    // Find the file with this name
    const findFile = (nodes: FileNode[]): string | null => {
      for (const node of nodes) {
        if (node.type === 'file' && node.name.replace('.md', '') === linkText) {
          return node.path;
        }
        if (node.children) {
          const found = findFile(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    const filePath = findFile(fileTree);
    if (filePath) {
      selectFile(filePath);
    }
  };

  const renderFileTree = (nodes: FileNode[], depth: number = 0): React.ReactNode => {
    return nodes.map((node) => {
      const isExpanded = expandedDirs.has(node.path) || expandedDirs.has(node.name);
      const isSelected = selectedFile === node.path;

      return (
        <div key={node.path} style={{ marginLeft: `${depth * 12}px` }}>
          {node.type === 'directory' ? (
            <>
              <div
                onClick={() => toggleDir(node.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: designTokens.spacing.xs,
                  padding: `${designTokens.spacing.xs} ${designTokens.spacing.sm}`,
                  cursor: 'pointer',
                  backgroundColor: isExpanded ? `${designTokens.colors.accent.cyan}10` : 'transparent',
                  borderLeft: isExpanded ? `2px solid ${designTokens.colors.accent.cyan}` : 'none',
                  transition: designTokens.transitions.fast,
                  borderRadius: '4px',
                }}
              >
                <Folder
                  className="w-4 h-4"
                  style={{ color: isExpanded ? designTokens.colors.accent.cyan : designTokens.colors.text.secondary }}
                />
                <span
                  style={{
                    fontFamily: designTokens.typography.fonts.mono,
                    fontSize: designTokens.typography.sizes.xs,
                    color: isExpanded ? designTokens.colors.accent.cyan : designTokens.colors.text.primary,
                    fontWeight: isExpanded ? designTokens.typography.weights.semibold : designTokens.typography.weights.normal,
                  }}
                >
                  {node.name}
                </span>
              </div>
              {isExpanded && node.children && renderFileTree(node.children, depth + 1)}
            </>
          ) : (
            <div
              onClick={() => selectFile(node.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: designTokens.spacing.xs,
                padding: `${designTokens.spacing.xs} ${designTokens.spacing.sm}`,
                cursor: 'pointer',
                backgroundColor: isSelected ? `${designTokens.colors.accent.magenta}15` : 'transparent',
                borderLeft: isSelected ? `2px solid ${designTokens.colors.accent.magenta}` : 'none',
                transition: 'all 0.2s ease',
                borderRadius: '4px',
              }}
            >
              <FileText
                className="w-3 h-3"
                style={{ color: isSelected ? designTokens.colors.accent.magenta : designTokens.colors.text.tertiary }}
              />
              <span
                style={{
                  fontFamily: designTokens.typography.fonts.mono,
                  fontSize: designTokens.typography.sizes.xs,
                  color: isSelected ? designTokens.colors.accent.magenta : designTokens.colors.text.secondary,
                  fontWeight: isSelected ? designTokens.typography.weights.semibold : designTokens.typography.weights.normal,
                }}
              >
                {node.name.replace('.md', '')}
              </span>
              {node.tags && node.tags.length > 0 && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '9px',
                    padding: '1px 4px',
                    backgroundColor: `${designTokens.colors.accent.yellow}20`,
                    color: designTokens.colors.accent.yellow,
                    borderRadius: '3px',
                  }}
                >
                  {node.tags.length}
                </span>
              )}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: designTokens.spacing.md, height: '100%' }}>
      {/* View Controls */}
      <GlassPanel
        bordered
        borderColor={designTokens.colors.accent.cyan}
        style={{ padding: designTokens.spacing.md }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.sm, flexWrap: 'wrap' }}>
          <BrutalistButton
            variant={view === 'tree' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setView('tree')}
          >
            <Folder className="w-4 h-4" />
            <span>Tree</span>
          </BrutalistButton>
          <BrutalistButton
            variant={view === 'graph' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setView('graph')}
          >
            <Network className="w-4 h-4" />
            <span>Graph</span>
          </BrutalistButton>
          <BrutalistButton
            variant={view === 'reader' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setView('reader')}
            disabled={!selectedFile}
          >
            <BookOpen className="w-4 h-4" />
            <span>Reader</span>
          </BrutalistButton>
          <BrutalistButton
            variant={view === 'split' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setView('split')}
          >
            <Maximize2 className="w-4 h-4" />
            <span>Split View</span>
          </BrutalistButton>
        </div>
      </GlassPanel>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {view === 'tree' && (
          <GlassPanel
            bordered
            borderColor={designTokens.colors.structure.border.secondary}
            style={{ padding: designTokens.spacing.md, height: '100%', overflow: 'auto' }}
          >
            {renderFileTree(fileTree)}
          </GlassPanel>
        )}

        {view === 'graph' && graphData && (
          <GlassPanel
            bordered
            borderColor={designTokens.colors.structure.border.secondary}
            style={{ padding: designTokens.spacing.md, height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          >
            <VaultGraph
              data={graphData}
              onNodeClick={handleGraphNodeClick}
              highlightNode={selectedFile}
              width={Math.min(1200, window.innerWidth - 100)}
              height={Math.min(800, window.innerHeight - 300)}
            />
          </GlassPanel>
        )}

        {view === 'reader' && selectedFile && fileContent && (
          <div style={{ height: '100%', overflow: 'auto' }}>
            <DocumentReader
              filePath={selectedFile}
              content={fileContent}
              onWikiLinkClick={handleWikiLinkClick}
              onClose={() => {
                setSelectedFile(null);
                setFileContent('');
                setView('tree');
              }}
              backlinks={backlinks}
            />
          </div>
        )}

        {view === 'split' && (
          <div style={{ display: 'flex', gap: designTokens.spacing.md, height: '100%' }}>
            {/* File Tree */}
            <GlassPanel
              bordered
              borderColor={designTokens.colors.structure.border.secondary}
              style={{ width: `${treeWidth}px`, padding: designTokens.spacing.md, overflow: 'auto', flexShrink: 0 }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: designTokens.spacing.sm,
                paddingBottom: designTokens.spacing.xs,
                borderBottom: `1px solid ${designTokens.colors.structure.border.tertiary}`,
              }}>
                <h3 style={{
                  fontFamily: designTokens.typography.fonts.header,
                  fontSize: designTokens.typography.sizes.sm,
                  fontWeight: designTokens.typography.weights.semibold,
                  color: designTokens.colors.text.primary,
                }}>
                  Files
                </h3>
                <Folder className="w-4 h-4" style={{ color: designTokens.colors.accent.cyan }} />
              </div>
              {renderFileTree(fileTree)}
            </GlassPanel>

            {/* Graph */}
            {graphData && (
              <GlassPanel
                bordered
                borderColor={designTokens.colors.structure.border.secondary}
                style={{ width: `${graphWidth}px`, padding: designTokens.spacing.md, flexShrink: 0 }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: designTokens.spacing.sm,
                }}>
                  <h3 style={{
                    fontFamily: designTokens.typography.fonts.header,
                    fontSize: designTokens.typography.sizes.sm,
                    fontWeight: designTokens.typography.weights.semibold,
                    color: designTokens.colors.text.primary,
                  }}>
                    Knowledge Graph
                  </h3>
                  <Network className="w-4 h-4" style={{ color: designTokens.colors.accent.purple }} />
                </div>
                <VaultGraph
                  data={graphData}
                  onNodeClick={handleGraphNodeClick}
                  highlightNode={selectedFile}
                  width={graphWidth - 40}
                  height={600}
                />
              </GlassPanel>
            )}

            {/* Document Reader */}
            {selectedFile && fileContent ? (
              <div style={{ flex: 1, overflow: 'auto' }}>
                <DocumentReader
                  filePath={selectedFile}
                  content={fileContent}
                  onWikiLinkClick={handleWikiLinkClick}
                  backlinks={backlinks}
                />
              </div>
            ) : (
              <GlassPanel
                bordered
                borderColor={designTokens.colors.structure.border.tertiary}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: designTokens.spacing.xl,
                }}
              >
                <BookOpen
                  className="w-16 h-16"
                  style={{ color: designTokens.colors.text.tertiary, marginBottom: designTokens.spacing.md }}
                />
                <p style={{
                  color: designTokens.colors.text.secondary,
                  fontFamily: designTokens.typography.fonts.mono,
                  fontSize: designTokens.typography.sizes.sm,
                  textAlign: 'center',
                }}>
                  Select a file from the tree or click a node in the graph to view its content
                </p>
              </GlassPanel>
            )}
          </div>
        )}
      </div>

      {loading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <GlassPanel
            bordered
            borderColor={designTokens.colors.accent.cyan}
            style={{ padding: designTokens.spacing.lg }}
          >
            <p style={{
              color: designTokens.colors.text.primary,
              fontFamily: designTokens.typography.fonts.mono,
              fontSize: designTokens.typography.sizes.base,
            }}>
              Loading...
            </p>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
