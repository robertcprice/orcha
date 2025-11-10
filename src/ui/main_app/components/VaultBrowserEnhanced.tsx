'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Folder, File, Search, Tag, BookOpen, X, FolderOpen, Network, List as ListIcon, ChevronRight, ChevronDown } from 'lucide-react';
import { GlassPanel, GlassInput, BrutalistButton, designTokens } from '@/components/design-system';
import DocumentReader from '@/components/vault/DocumentReader';
import GraphView from '@/components/vault/GraphView';
import { buildGraph, GraphData, GraphNode } from '@/lib/vault/graph-builder';
import { parseMarkdown, ParsedDocument, buildBacklinksMap } from '@/lib/vault/metadata';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  tags?: string[];
  frontmatter?: Record<string, any>;
}

interface SearchMatch {
  line: number;
  content: string;
  context: string;
}

interface SearchResult {
  path: string;
  name: string;
  matches: SearchMatch[];
  score: number;
  frontmatter?: Record<string, any>;
}

interface NoteData {
  path: string;
  content: string;
  body: string;
  frontmatter?: Record<string, any>;
  links: string[];
  stats: {
    size: number;
    lines: number;
    words: number;
  };
}

export interface VaultBrowserEnhancedProps {
  defaultView?: 'tree' | 'list' | 'graph' | 'search' | 'reader';
  maxHeight?: string;
  showStats?: boolean;
  className?: string;
}

export default function VaultBrowserEnhanced({
  defaultView = 'tree',
  maxHeight = '800px',
  showStats = true,
  className = '',
}: VaultBrowserEnhancedProps) {
  const [view, setView] = useState<'tree' | 'list' | 'graph' | 'search' | 'reader'>(defaultView);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [noteData, setNoteData] = useState<NoteData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [allDocuments, setAllDocuments] = useState<Map<string, { content: string; parsed: ParsedDocument }>>(new Map());
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [filterTags, setFilterTags] = useState<string[]>([]);

  // Fetch file tree on mount
  useEffect(() => {
    fetchFileTree();
  }, []);

  const fetchFileTree = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/obsidian/files');
      const data = await res.json();
      if (data.ok) {
        setFileTree(data.tree);
      }
    } catch (error) {
      console.error('Error fetching file tree:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch and parse all documents for graph view
  useEffect(() => {
    const fetchAllDocuments = async () => {
      if (view !== 'graph') return;

      try {
        const res = await fetch('/api/obsidian/files');
        const data = await res.json();

        if (data.ok) {
          const docs = new Map();
          await traverseAndFetch(data.tree, docs);
          setAllDocuments(docs);

          // Build graph
          const graph = buildGraph(Object.fromEntries(docs));
          setGraphData(graph);
        }
      } catch (error) {
        console.error('Error fetching documents for graph:', error);
      }
    };

    fetchAllDocuments();
  }, [view]);

  const traverseAndFetch = async (nodes: FileNode[], docs: Map<string, any>) => {
    for (const node of nodes) {
      if (node.type === 'directory' && node.children) {
        await traverseAndFetch(node.children, docs);
      } else if (node.type === 'file' && node.name.endsWith('.md')) {
        try {
          const res = await fetch(`/api/obsidian/read?path=${encodeURIComponent(node.path)}`);
          const data = await res.json();
          if (data.ok) {
            const parsed = parseMarkdown(data.content);
            docs.set(node.path, { content: data.content, parsed });
          }
        } catch (error) {
          console.error(`Error fetching ${node.path}:`, error);
        }
      }
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
        setNoteData(data);
        setView('reader');
      }
    } catch (error) {
      console.error('Error reading file:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(`/api/obsidian/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.ok) {
        setSearchResults(data.results);
        setView('search');
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleWikiLinkNavigate = async (linkText: string) => {
    // Find document by wiki-link text
    const matchingDoc = Array.from(allDocuments.entries()).find(([path, _]) => {
      const filename = path.split('/').pop()?.replace('.md', '').toLowerCase();
      return filename === linkText.toLowerCase();
    });

    if (matchingDoc) {
      await selectFile(matchingDoc[0]);
    } else {
      // Try to search for it
      setSearchQuery(linkText);
      await handleSearch();
    }
  };

  const handleGraphNodeClick = async (node: GraphNode) => {
    await selectFile(node.id);
  };

  // Get backlinks for current document
  const backlinks = useMemo(() => {
    if (!noteData || allDocuments.size === 0) return [];

    const backlinksMap = buildBacklinksMap(
      new Map(Array.from(allDocuments.entries()).map(([path, data]) => [path, data.parsed]))
    );

    return backlinksMap.get(noteData.path) || [];
  }, [noteData, allDocuments]);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    fileTree.forEach(node => {
      if (node.tags) {
        node.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags);
  }, [fileTree]);

  // Filter file tree by tags
  const filteredFileTree = useMemo(() => {
    if (filterTags.length === 0) return fileTree;

    const filterNode = (node: FileNode): FileNode | null => {
      if (node.type === 'directory') {
        const filteredChildren = node.children
          ?.map(filterNode)
          .filter((child): child is FileNode => child !== null);

        if (filteredChildren && filteredChildren.length > 0) {
          return { ...node, children: filteredChildren };
        }
        return null;
      } else {
        const hasTag = node.tags?.some(tag => filterTags.includes(tag));
        return hasTag ? node : null;
      }
    };

    return fileTree
      .map(filterNode)
      .filter((node): node is FileNode => node !== null);
  }, [fileTree, filterTags]);

  const renderFileTree = (nodes: FileNode[], depth: number = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedDirs.has(node.path);
      const isSelected = selectedFile === node.path;

      return (
        <div key={node.path} style={{ marginLeft: `${depth * 16}px` }}>
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
                  backgroundColor: isExpanded
                    ? `${designTokens.colors.accent.cyan}10`
                    : 'transparent',
                  borderLeft: isExpanded
                    ? `2px solid ${designTokens.colors.accent.cyan}`
                    : 'none',
                  transition: designTokens.transitions.fast,
                }}
                onMouseEnter={(e) => {
                  if (!isExpanded) {
                    e.currentTarget.style.backgroundColor = `${designTokens.colors.structure.surface.secondary}`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isExpanded) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" style={{ color: designTokens.colors.accent.cyan }} />
                ) : (
                  <ChevronRight className="w-4 h-4" style={{ color: designTokens.colors.text.tertiary }} />
                )}
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4" style={{ color: designTokens.colors.accent.cyan }} />
                ) : (
                  <Folder className="w-4 h-4" style={{ color: designTokens.colors.text.secondary }} />
                )}
                <span
                  style={{
                    fontFamily: designTokens.typography.fonts.mono,
                    fontSize: designTokens.typography.sizes.sm,
                    color: isExpanded
                      ? designTokens.colors.accent.cyan
                      : designTokens.colors.text.primary,
                    fontWeight: isExpanded
                      ? designTokens.typography.weights.semibold
                      : designTokens.typography.weights.normal,
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
                backgroundColor: isSelected
                  ? `${designTokens.colors.accent.magenta}15`
                  : 'transparent',
                borderLeft: isSelected
                  ? `2px solid ${designTokens.colors.accent.magenta}`
                  : 'none',
                transition: designTokens.transitions.fast,
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = `${designTokens.colors.structure.surface.secondary}`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <File className="w-4 h-4" style={{ color: designTokens.colors.text.tertiary }} />
              <span
                style={{
                  fontFamily: designTokens.typography.fonts.mono,
                  fontSize: designTokens.typography.sizes.sm,
                  color: isSelected
                    ? designTokens.colors.accent.magenta
                    : designTokens.colors.text.secondary,
                  fontWeight: isSelected
                    ? designTokens.typography.weights.semibold
                    : designTokens.typography.weights.normal,
                }}
              >
                {node.name.replace('.md', '')}
              </span>
              {node.tags && node.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '2px', marginLeft: 'auto' }}>
                  {node.tags.slice(0, 2).map((tag, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '10px',
                        padding: '2px 4px',
                        backgroundColor: `${designTokens.colors.accent.yellow}20`,
                        color: designTokens.colors.accent.yellow,
                        fontFamily: designTokens.typography.fonts.mono,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className={className} style={{ width: '100%' }}>
      {/* Header with view controls */}
      <GlassPanel
        bordered
        borderColor={designTokens.colors.accent.cyan}
        style={{
          padding: designTokens.spacing.md,
          marginBottom: designTokens.spacing.md,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.md, flexWrap: 'wrap' }}>
          {/* View toggle buttons */}
          <div style={{ display: 'flex', gap: designTokens.spacing.xs }}>
            <BrutalistButton
              variant={view === 'tree' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setView('tree')}
            >
              <Folder className="w-4 h-4" />
              <span>Tree</span>
            </BrutalistButton>
            <BrutalistButton
              variant={view === 'list' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setView('list')}
            >
              <ListIcon className="w-4 h-4" />
              <span>List</span>
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
              variant={view === 'search' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setView('search')}
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </BrutalistButton>
            {noteData && (
              <BrutalistButton
                variant={view === 'reader' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setView('reader')}
              >
                <BookOpen className="w-4 h-4" />
                <span>Reader</span>
              </BrutalistButton>
            )}
          </div>

          {/* Search input */}
          <div style={{ flex: 1, minWidth: '300px', maxWidth: '500px', display: 'flex', gap: designTokens.spacing.xs }}>
            <GlassInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search vault..."
              fullWidth
            />
            <BrutalistButton
              variant="accent"
              size="sm"
              onClick={handleSearch}
              disabled={!searchQuery.trim() || searching}
            >
              {searching ? 'Searching...' : 'Search'}
            </BrutalistButton>
          </div>

          {/* Tag filters */}
          {view !== 'graph' && allTags.length > 0 && (
            <div style={{ display: 'flex', gap: designTokens.spacing.xs, flexWrap: 'wrap' }}>
              {allTags.slice(0, 5).map(tag => (
                <BrutalistButton
                  key={tag}
                  variant={filterTags.includes(tag) ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    setFilterTags(prev =>
                      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                    );
                  }}
                >
                  <Tag className="w-3 h-3" />
                  <span>{tag}</span>
                </BrutalistButton>
              ))}
              {filterTags.length > 0 && (
                <BrutalistButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setFilterTags([])}
                >
                  <X className="w-3 h-3" />
                </BrutalistButton>
              )}
            </div>
          )}
        </div>
      </GlassPanel>

      {/* Main content area */}
      <GlassPanel
        bordered
        borderColor={designTokens.colors.structure.border.secondary}
        style={{
          padding: view === 'graph' ? 0 : designTokens.spacing.lg,
          maxHeight: view === 'graph' ? 'auto' : maxHeight,
          overflow: view === 'graph' ? 'visible' : 'auto',
        }}
      >
        {loading && view !== 'search' && view !== 'graph' ? (
          <div style={{ textAlign: 'center', padding: designTokens.spacing.xl }}>
            <p style={{ color: designTokens.colors.text.secondary, fontFamily: designTokens.typography.fonts.mono }}>
              Loading...
            </p>
          </div>
        ) : view === 'tree' ? (
          <div>{renderFileTree(filteredFileTree)}</div>
        ) : view === 'list' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: designTokens.spacing.xs }}>
            {filteredFileTree.flatMap(node => flattenTree(node)).map((node, index) => (
              <div
                key={index}
                onClick={() => selectFile(node.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: designTokens.spacing.sm,
                  padding: designTokens.spacing.sm,
                  cursor: 'pointer',
                  backgroundColor: selectedFile === node.path
                    ? `${designTokens.colors.accent.magenta}15`
                    : 'transparent',
                  borderLeft: selectedFile === node.path
                    ? `2px solid ${designTokens.colors.accent.magenta}`
                    : 'none',
                }}
              >
                <File className="w-4 h-4" style={{ color: designTokens.colors.text.tertiary }} />
                <span
                  style={{
                    fontFamily: designTokens.typography.fonts.mono,
                    fontSize: designTokens.typography.sizes.sm,
                    color: designTokens.colors.text.secondary,
                  }}
                >
                  {node.path}
                </span>
                {node.tags && node.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                    {node.tags.map((tag, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: '10px',
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
                )}
              </div>
            ))}
          </div>
        ) : view === 'graph' && graphData ? (
          <GraphView
            graph={graphData}
            onNodeClick={handleGraphNodeClick}
            selectedNodeId={selectedFile || undefined}
            width={1200}
            height={800}
          />
        ) : view === 'search' ? (
          <div>
            {searchResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: designTokens.spacing.xl }}>
                <Search className="w-12 h-12 mx-auto mb-4" style={{ color: designTokens.colors.text.tertiary }} />
                <p style={{ color: designTokens.colors.text.secondary, fontFamily: designTokens.typography.fonts.mono }}>
                  {searchQuery ? 'No results found' : 'Enter a search query'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: designTokens.spacing.md }}>
                <p style={{
                  color: designTokens.colors.text.secondary,
                  fontFamily: designTokens.typography.fonts.mono,
                  fontSize: designTokens.typography.sizes.sm,
                }}>
                  Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                </p>
                {searchResults.map((result, idx) => (
                  <GlassPanel
                    key={idx}
                    bordered
                    borderColor={designTokens.colors.structure.border.tertiary}
                    style={{
                      padding: designTokens.spacing.md,
                      cursor: 'pointer',
                      transition: designTokens.transitions.fast,
                    }}
                    onClick={() => selectFile(result.path)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.sm, marginBottom: designTokens.spacing.xs }}>
                      <File className="w-4 h-4" style={{ color: designTokens.colors.accent.cyan }} />
                      <h4 style={{
                        fontFamily: designTokens.typography.fonts.header,
                        fontSize: designTokens.typography.sizes.base,
                        fontWeight: designTokens.typography.weights.semibold,
                        color: designTokens.colors.text.primary,
                      }}>
                        {result.name.replace('.md', '')}
                      </h4>
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: designTokens.typography.sizes.xs,
                        fontFamily: designTokens.typography.fonts.mono,
                        color: designTokens.colors.text.tertiary,
                      }}>
                        Score: {result.score}
                      </span>
                    </div>
                    {result.matches.slice(0, 2).map((match, matchIdx) => (
                      <div
                        key={matchIdx}
                        style={{
                          marginTop: designTokens.spacing.xs,
                          padding: designTokens.spacing.sm,
                          backgroundColor: `${designTokens.colors.structure.bg.secondary}`,
                          borderLeft: `2px solid ${designTokens.colors.accent.yellow}`,
                        }}
                      >
                        <p style={{
                          fontFamily: designTokens.typography.fonts.mono,
                          fontSize: designTokens.typography.sizes.xs,
                          color: designTokens.colors.text.secondary,
                          whiteSpace: 'pre-wrap',
                        }}>
                          {match.content}
                        </p>
                      </div>
                    ))}
                  </GlassPanel>
                ))}
              </div>
            )}
          </div>
        ) : view === 'reader' && noteData ? (
          <DocumentReader
            path={noteData.path}
            frontmatter={noteData.frontmatter}
            content={noteData.body}
            links={noteData.links}
            backlinks={backlinks}
            stats={noteData.stats}
            onNavigate={handleWikiLinkNavigate}
            onClose={() => {
              setNoteData(null);
              setSelectedFile(null);
              setView('tree');
            }}
            showMetadata={true}
            showStats={showStats}
          />
        ) : null}
      </GlassPanel>
    </div>
  );
}

function flattenTree(node: FileNode): FileNode[] {
  if (node.type === 'directory' && node.children) {
    return node.children.flatMap(flattenTree);
  }
  return node.type === 'file' ? [node] : [];
}
