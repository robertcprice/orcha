"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { X, ExternalLink, Calendar, Tag, FileText } from "lucide-react";

interface MarkdownViewerProps {
  filePath: string;
  onClose: () => void;
}

interface FileData {
  ok: boolean;
  path: string;
  content: string;
  body: string;
  frontmatter: Record<string, any> | null;
  links: string[];
  stats: {
    size: number;
    lines: number;
    words: number;
  };
}

export default function MarkdownViewer({ filePath, onClose }: MarkdownViewerProps) {
  const [data, setData] = useState<FileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFile();
  }, [filePath]);

  async function fetchFile() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/obsidian/read?path=${encodeURIComponent(filePath)}`);
      const result = await res.json();

      if (result.ok) {
        setData(result);
      } else {
        setError(result.error || 'Failed to load file');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load file');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {filePath.split('/').pop()?.replace('.md', '')}
            </h2>

            {data?.frontmatter && (
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {data.frontmatter.date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {data.frontmatter.date}
                  </div>
                )}
                {data.frontmatter.type && (
                  <div className="px-2 py-0.5 rounded bg-secondary text-xs">
                    {data.frontmatter.type}
                  </div>
                )}
                {data.frontmatter.status && (
                  <div className={`px-2 py-0.5 rounded text-xs ${
                    data.frontmatter.status === 'completed' ? 'bg-success/20 text-success' :
                    data.frontmatter.status === 'in-progress' ? 'bg-warning/20 text-warning' :
                    'bg-secondary'
                  }`}>
                    {data.frontmatter.status}
                  </div>
                )}
              </div>
            )}

            {data?.frontmatter?.tags && Array.isArray(data.frontmatter.tags) && (
              <div className="flex flex-wrap gap-1 mt-2">
                {data.frontmatter.tags.map((tag: string) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
              Error: {error}
            </div>
          )}

          {data && !loading && !error && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  // Customize link rendering for wiki-links
                  a: ({ node, href, children, ...props }) => {
                    const isWikiLink = href?.startsWith('[[') && href?.endsWith(']]');
                    if (isWikiLink && href) {
                      const linkText = href.slice(2, -2);
                      return (
                        <span className="text-primary font-medium cursor-pointer hover:underline">
                          {linkText}
                        </span>
                      );
                    }
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                        {...props}
                      >
                        {children}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    );
                  },
                  // Better code blocks
                  code: ({ node, className, children, ...props }: any) => {
                    const inline = !className;
                    if (inline) {
                      return (
                        <code className="px-1.5 py-0.5 rounded bg-secondary text-sm font-mono" {...props}>
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {data.body}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer with stats */}
        {data && (
          <div className="p-4 border-t border-border bg-secondary/20">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex gap-4">
                <span>{data.stats.words} words</span>
                <span>{data.stats.lines} lines</span>
                {data.links.length > 0 && (
                  <span>{data.links.length} internal links</span>
                )}
              </div>
              <div className="text-xs font-mono">
                {filePath}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
