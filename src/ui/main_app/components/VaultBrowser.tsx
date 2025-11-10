'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Folder, File, Search, Tag, Calendar, Hash, ChevronRight, ChevronDown, BookOpen, X, FolderOpen } from 'lucide-react';
import { GlassPanel, GlassInput, BrutalistButton, designTokens } from '@/components/design-system';

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

export interface VaultBrowserProps {
  defaultView?: 'tree' | 'search' | 'reader' | 'graph';
  maxHeight?: string;
  showStats?: boolean;
  className?: string;
}

export default function VaultBrowser({
  defaultView = 'tree',
  maxHeight = '800px',
  showStats = true,
  className = '',
}: VaultBrowserProps) {
  const [view, setView] = useState<'tree' | 'search' | 'reader' | 'graph'>(defaultView);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [noteData, setNoteData] = useState<NoteData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

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
        </div>
      </GlassPanel>

      {/* Main content area */}
      <GlassPanel
        bordered
        borderColor={designTokens.colors.structure.border.secondary}
        style={{
          padding: designTokens.spacing.lg,
          maxHeight,
          overflow: 'auto',
        }}
      >
        {loading && view !== 'search' ? (
          <div style={{ textAlign: 'center', padding: designTokens.spacing.xl }}>
            <p style={{ color: designTokens.colors.text.secondary, fontFamily: designTokens.typography.fonts.mono }}>
              Loading...
            </p>
          </div>
        ) : view === 'tree' ? (
          <div>{renderFileTree(fileTree)}</div>
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
          <div>
            {/* Note header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: designTokens.spacing.lg,
              paddingBottom: designTokens.spacing.md,
              borderBottom: `1px solid ${designTokens.colors.structure.border.tertiary}`,
            }}>
              <div>
                <h2 style={{
                  fontFamily: designTokens.typography.fonts.header,
                  fontSize: designTokens.typography.sizes['2xl'],
                  fontWeight: designTokens.typography.weights.bold,
                  color: designTokens.colors.text.primary,
                  marginBottom: designTokens.spacing.xs,
                }}>
                  {noteData.path.split('/').pop()?.replace('.md', '')}
                </h2>
                <p style={{
                  fontFamily: designTokens.typography.fonts.mono,
                  fontSize: designTokens.typography.sizes.xs,
                  color: designTokens.colors.text.tertiary,
                }}>
                  {noteData.path}
                </p>
              </div>
              <BrutalistButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  setNoteData(null);
                  setSelectedFile(null);
                  setView('tree');
                }}
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </BrutalistButton>
            </div>

            {/* Frontmatter */}
            {noteData.frontmatter && Object.keys(noteData.frontmatter).length > 0 && (
              <GlassPanel
                bordered
                borderColor={designTokens.colors.accent.purple}
                style={{
                  padding: designTokens.spacing.md,
                  marginBottom: designTokens.spacing.lg,
                  backgroundColor: `${designTokens.colors.accent.purple}10`,
                }}
              >
                <h3 style={{
                  fontFamily: designTokens.typography.fonts.header,
                  fontSize: designTokens.typography.sizes.base,
                  fontWeight: designTokens.typography.weights.semibold,
                  color: designTokens.colors.accent.purple,
                  marginBottom: designTokens.spacing.sm,
                }}>
                  Metadata
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: designTokens.spacing.sm }}>
                  {Object.entries(noteData.frontmatter).map(([key, value]) => (
                    <div key={key}>
                      <span style={{
                        fontFamily: designTokens.typography.fonts.mono,
                        fontSize: designTokens.typography.sizes.xs,
                        color: designTokens.colors.text.tertiary,
                      }}>
                        {key}:
                      </span>
                      <span style={{
                        marginLeft: designTokens.spacing.xs,
                        fontFamily: designTokens.typography.fonts.mono,
                        fontSize: designTokens.typography.sizes.xs,
                        color: designTokens.colors.text.secondary,
                      }}>
                        {Array.isArray(value) ? value.join(', ') : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            )}

            {/* Stats */}
            {showStats && (
              <div style={{
                display: 'flex',
                gap: designTokens.spacing.md,
                marginBottom: designTokens.spacing.lg,
                flexWrap: 'wrap',
              }}>
                <div style={{
                  padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}`,
                  backgroundColor: `${designTokens.colors.accent.cyan}15`,
                  borderLeft: `2px solid ${designTokens.colors.accent.cyan}`,
                }}>
                  <span style={{
                    fontFamily: designTokens.typography.fonts.mono,
                    fontSize: designTokens.typography.sizes.xs,
                    color: designTokens.colors.text.secondary,
                  }}>
                    {noteData.stats.words} words
                  </span>
                </div>
                <div style={{
                  padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}`,
                  backgroundColor: `${designTokens.colors.accent.magenta}15`,
                  borderLeft: `2px solid ${designTokens.colors.accent.magenta}`,
                }}>
                  <span style={{
                    fontFamily: designTokens.typography.fonts.mono,
                    fontSize: designTokens.typography.sizes.xs,
                    color: designTokens.colors.text.secondary,
                  }}>
                    {noteData.stats.lines} lines
                  </span>
                </div>
                <div style={{
                  padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}`,
                  backgroundColor: `${designTokens.colors.accent.yellow}15`,
                  borderLeft: `2px solid ${designTokens.colors.accent.yellow}`,
                }}>
                  <span style={{
                    fontFamily: designTokens.typography.fonts.mono,
                    fontSize: designTokens.typography.sizes.xs,
                    color: designTokens.colors.text.secondary,
                  }}>
                    {noteData.links.length} links
                  </span>
                </div>
              </div>
            )}

            {/* Note body */}
            <div style={{
              fontFamily: designTokens.typography.fonts.mono,
              fontSize: designTokens.typography.sizes.sm,
              color: designTokens.colors.text.secondary,
              lineHeight: designTokens.typography.lineHeights.relaxed,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {noteData.body}
            </div>
          </div>
        ) : null}
      </GlassPanel>
    </div>
  );
}
