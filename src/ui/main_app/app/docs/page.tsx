'use client';

import { useState, useEffect } from 'react';
import MinimalistTopBar from '@/components/orchestrator/MinimalistTopBar';
import { FileText, FolderOpen, Folder, Tag, Calendar, Link, ChevronRight, ChevronDown } from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface DocumentMetadata {
  title?: string;
  date?: string;
  tags?: string[];
  type?: string;
  related_docs?: string[];
}

interface ParsedDocument {
  metadata: DocumentMetadata;
  content: string;
  backlinks: string[];
}

export default function DocsPage() {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [document, setDocument] = useState<ParsedDocument | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));

  // Fetch file tree on mount
  useEffect(() => {
    fetch('/api/obsidian/files')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.tree) {
          setFileTree(data.tree);
          // Auto-select index.md if it exists
          if (!selectedFile) {
            setSelectedFile('index.md');
          }
        }
      })
      .catch(console.error);
  }, [selectedFile]);

  // Fetch document when selected
  useEffect(() => {
    if (!selectedFile) return;

    fetch(`/api/obsidian/read?path=${encodeURIComponent(selectedFile)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.ok) {
          setDocument({
            metadata: data.frontmatter || {},
            content: data.body || '',
            backlinks: [] // TODO: Implement backlinks search
          });
        }
      })
      .catch(console.error);
  }, [selectedFile]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedFolders.has(node.path);
      const isSelected = selectedFile === node.path;

      if (node.type === 'directory') {
        return (
          <div key={node.path}>
            <div
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--glass-backdrop)] rounded transition-colors"
              style={{ paddingLeft: `${level * 12 + 12}px` }}
              onClick={() => toggleFolder(node.path)}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
              <span className="text-sm">{node.name}</span>
            </div>
            {isExpanded && node.children && (
              <div>{renderFileTree(node.children, level + 1)}</div>
            )}
          </div>
        );
      } else {
        return (
          <div
            key={node.path}
            className={`flex items-center gap-2 px-3 py-2 cursor-pointer rounded transition-colors ${
              isSelected
                ? 'bg-[var(--accent-primary)] bg-opacity-20 text-[var(--accent-primary)]'
                : 'hover:bg-[var(--glass-backdrop)]'
            }`}
            style={{ paddingLeft: `${level * 12 + 28}px` }}
            onClick={() => setSelectedFile(node.path)}
          >
            <FileText size={16} />
            <span className="text-sm">{node.name}</span>
          </div>
        );
      }
    });
  };

  const renderWikiLinks = (text: string) => {
    // Convert [[Document Name]] to clickable links
    return text.replace(/\[\[(.+?)\]\]/g, (match, linkText) => {
      return `<span class="wiki-link" data-link="${linkText}">${linkText}</span>`;
    });
  };

  const renderMarkdown = (content: string) => {
    // Simple markdown rendering (you can use a library like react-markdown for better support)
    let html = content;

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 class="text-2xl font-semibold mt-8 mb-4">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold mt-10 mb-6">$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]+?)```/g, '<pre class="bg-[var(--glass-backdrop)] p-4 rounded-lg my-4 overflow-x-auto"><code>$2</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-[var(--glass-backdrop)] px-2 py-1 rounded text-sm">$1</code>');

    // Lists
    html = html.replace(/^- (.+)$/gm, '<li class="ml-6">$1</li>');

    // Wiki links
    html = renderWikiLinks(html);

    // Paragraphs
    html = html.split('\n\n').map(p =>
      p.trim().startsWith('<') ? p : `<p class="my-4">${p}</p>`
    ).join('\n');

    return html;
  };

  return (
    <div className="w-full h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      <MinimalistTopBar />

      <div className="flex h-[calc(100vh-64px)] mt-16">
        {/* Left sidebar - File tree */}
        <div className="w-80 border-r border-[var(--glass-border)] overflow-y-auto p-4">
          <h2 className="text-lg font-semibold mb-4 px-3">Knowledge Vault</h2>
          <div>{renderFileTree(fileTree)}</div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Document viewer */}
          <div className="flex-1 overflow-y-auto p-8">
            {document ? (
              <>
                {/* Metadata section */}
                {document.metadata && Object.keys(document.metadata).length > 0 && (
                  <div className="bg-[var(--glass-backdrop)] border border-[var(--glass-border)] rounded-lg p-6 mb-8">
                    {document.metadata.title && (
                      <h1 className="text-3xl font-bold mb-4">{document.metadata.title}</h1>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                      {document.metadata.date && (
                        <div className="flex items-center gap-2">
                          <Calendar size={16} />
                          <span>{document.metadata.date}</span>
                        </div>
                      )}
                      {document.metadata.type && (
                        <div className="flex items-center gap-2">
                          <FileText size={16} />
                          <span className="capitalize">{document.metadata.type}</span>
                        </div>
                      )}
                    </div>
                    {document.metadata.tags && document.metadata.tags.length > 0 && (
                      <div className="flex items-start gap-2 mt-4">
                        <Tag size={16} className="mt-1 text-[var(--accent-primary)]" />
                        <div className="flex flex-wrap gap-2">
                          {document.metadata.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-[var(--accent-primary)] bg-opacity-10 text-[var(--accent-primary)] rounded-full text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Document content */}
                <div
                  className="prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(document.content) }}
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
                <div className="text-center">
                  <FileText size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Select a document to view</p>
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar - Metadata and backlinks */}
          {document && (
            <div className="w-80 border-l border-[var(--glass-border)] overflow-y-auto p-6 space-y-6">
              {/* Related documents */}
              {document.metadata.related_docs && document.metadata.related_docs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Link size={16} />
                    Related Documents
                  </h3>
                  <div className="space-y-2">
                    {document.metadata.related_docs.map((doc, i) => {
                      // Remove [[ ]] from wiki links
                      const cleanDoc = doc.replace(/\[\[|\]\]/g, '');
                      return (
                        <div
                          key={i}
                          className="text-sm text-[var(--accent-primary)] cursor-pointer hover:underline"
                          onClick={() => {
                            // Try to find the file in the tree
                            const findFile = (nodes: FileNode[]): string | null => {
                              for (const node of nodes) {
                                if (node.type === 'file' && node.name.replace('.md', '') === cleanDoc) {
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
                            if (filePath) setSelectedFile(filePath);
                          }}
                        >
                          {cleanDoc}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Backlinks */}
              {document.backlinks && document.backlinks.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Link size={16} className="rotate-180" />
                    Backlinks
                  </h3>
                  <div className="space-y-2">
                    {document.backlinks.map((link, i) => (
                      <div
                        key={i}
                        className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] cursor-pointer"
                        onClick={() => setSelectedFile(link)}
                      >
                        {link.split('/').pop()?.replace('.md', '')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
