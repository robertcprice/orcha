'use client';

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { X, Calendar, Tag, Link as LinkIcon, ArrowLeft, Clock, FileText } from 'lucide-react';
import { GlassPanel, BrutalistButton, designTokens } from '@/components/design-system';
import { WikiLink } from './WikiLinkParser';
import { Frontmatter, formatDate } from '@/lib/vault/metadata';

export interface DocumentReaderProps {
  path: string;
  frontmatter?: Frontmatter;
  content: string;
  links?: string[];
  backlinks?: string[];
  stats?: {
    size: number;
    lines: number;
    words: number;
  };
  onNavigate?: (linkText: string) => void;
  onClose?: () => void;
  showMetadata?: boolean;
  showStats?: boolean;
  className?: string;
}

/**
 * DocumentReader Component
 *
 * Renders markdown documents with:
 * - Frontmatter display
 * - Wiki-link support
 * - Code syntax highlighting
 * - Backlinks
 * - Breadcrumb navigation
 */
export default function DocumentReader({
  path,
  frontmatter = {},
  content,
  links = [],
  backlinks = [],
  stats,
  onNavigate,
  onClose,
  showMetadata = true,
  showStats = true,
  className = ''
}: DocumentReaderProps) {
  const filename = useMemo(() => path.split('/').pop() || path, [path]);
  const displayTitle = useMemo(
    () => frontmatter.title || filename.replace('.md', ''),
    [frontmatter.title, filename]
  );

  // Breadcrumb from path
  const breadcrumbs = useMemo(() => {
    const parts = path.split('/');
    return parts.slice(0, -1);
  }, [path]);

  // Custom renderers for ReactMarkdown
  const components = useMemo(
    () => ({
      // Render wiki-links
      text: ({ children }: any) => {
        const text = String(children);
        const wikiLinkRegex = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;

        if (!wikiLinkRegex.test(text)) {
          return <>{text}</>;
        }

        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;
        let key = 0;

        const regex = new RegExp(wikiLinkRegex);
        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
          }

          parts.push(
            <WikiLink
              key={`link-${key++}`}
              text={match[1].trim()}
              display={match[2]?.trim()}
              onNavigate={onNavigate}
            />
          );

          lastIndex = regex.lastIndex;
        }

        if (lastIndex < text.length) {
          parts.push(text.substring(lastIndex));
        }

        return <>{parts}</>;
      },

      // Style code blocks
      code: ({ inline, className, children, ...props }: any) => {
        return inline ? (
          <code
            style={{
              fontFamily: designTokens.typography.fonts.mono,
              fontSize: designTokens.typography.sizes.sm,
              backgroundColor: `${designTokens.colors.accent.cyan}20`,
              color: designTokens.colors.accent.cyan,
              padding: '2px 6px',
              borderRadius: '3px',
            }}
            {...props}
          >
            {children}
          </code>
        ) : (
          <code
            className={className}
            style={{
              fontFamily: designTokens.typography.fonts.mono,
              fontSize: designTokens.typography.sizes.sm,
            }}
            {...props}
          >
            {children}
          </code>
        );
      },

      // Style headers
      h1: ({ children }: any) => (
        <h1
          style={{
            fontFamily: designTokens.typography.fonts.header,
            fontSize: designTokens.typography.sizes['3xl'],
            fontWeight: designTokens.typography.weights.bold,
            color: designTokens.colors.text.primary,
            marginTop: designTokens.spacing.xl,
            marginBottom: designTokens.spacing.md,
            paddingBottom: designTokens.spacing.sm,
            borderBottom: `2px solid ${designTokens.colors.accent.cyan}`,
          }}
        >
          {children}
        </h1>
      ),

      h2: ({ children }: any) => (
        <h2
          style={{
            fontFamily: designTokens.typography.fonts.header,
            fontSize: designTokens.typography.sizes['2xl'],
            fontWeight: designTokens.typography.weights.semibold,
            color: designTokens.colors.text.primary,
            marginTop: designTokens.spacing.lg,
            marginBottom: designTokens.spacing.sm,
          }}
        >
          {children}
        </h2>
      ),

      h3: ({ children }: any) => (
        <h3
          style={{
            fontFamily: designTokens.typography.fonts.header,
            fontSize: designTokens.typography.sizes.xl,
            fontWeight: designTokens.typography.weights.semibold,
            color: designTokens.colors.text.primary,
            marginTop: designTokens.spacing.md,
            marginBottom: designTokens.spacing.sm,
          }}
        >
          {children}
        </h3>
      ),

      // Style paragraphs
      p: ({ children }: any) => (
        <p
          style={{
            fontFamily: designTokens.typography.fonts.mono,
            fontSize: designTokens.typography.sizes.base,
            color: designTokens.colors.text.secondary,
            lineHeight: designTokens.typography.lineHeights.relaxed,
            marginBottom: designTokens.spacing.md,
          }}
        >
          {children}
        </p>
      ),

      // Style lists
      ul: ({ children }: any) => (
        <ul
          style={{
            fontFamily: designTokens.typography.fonts.mono,
            fontSize: designTokens.typography.sizes.base,
            color: designTokens.colors.text.secondary,
            marginLeft: designTokens.spacing.lg,
            marginBottom: designTokens.spacing.md,
          }}
        >
          {children}
        </ul>
      ),

      ol: ({ children }: any) => (
        <ol
          style={{
            fontFamily: designTokens.typography.fonts.mono,
            fontSize: designTokens.typography.sizes.base,
            color: designTokens.colors.text.secondary,
            marginLeft: designTokens.spacing.lg,
            marginBottom: designTokens.spacing.md,
          }}
        >
          {children}
        </ol>
      ),

      // Style blockquotes
      blockquote: ({ children }: any) => (
        <blockquote
          style={{
            borderLeft: `4px solid ${designTokens.colors.accent.yellow}`,
            paddingLeft: designTokens.spacing.md,
            marginLeft: 0,
            marginBottom: designTokens.spacing.md,
            fontStyle: 'italic',
            color: designTokens.colors.text.tertiary,
          }}
        >
          {children}
        </blockquote>
      ),
    }),
    [onNavigate]
  );

  return (
    <div className={className}>
      {/* Header with breadcrumbs and close button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: designTokens.spacing.lg,
          paddingBottom: designTokens.spacing.md,
          borderBottom: `1px solid ${designTokens.colors.structure.border.tertiary}`,
        }}
      >
        <div style={{ flex: 1 }}>
          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: designTokens.spacing.xs,
                marginBottom: designTokens.spacing.sm,
                flexWrap: 'wrap',
              }}
            >
              <ArrowLeft
                className="w-3 h-3"
                style={{ color: designTokens.colors.text.tertiary }}
              />
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  <span
                    style={{
                      fontFamily: designTokens.typography.fonts.mono,
                      fontSize: designTokens.typography.sizes.xs,
                      color: designTokens.colors.text.tertiary,
                    }}
                  >
                    {crumb}
                  </span>
                  {index < breadcrumbs.length - 1 && (
                    <span style={{ color: designTokens.colors.text.tertiary }}>/</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Document title */}
          <h1
            style={{
              fontFamily: designTokens.typography.fonts.header,
              fontSize: designTokens.typography.sizes['3xl'],
              fontWeight: designTokens.typography.weights.bold,
              color: designTokens.colors.text.primary,
              marginBottom: designTokens.spacing.xs,
            }}
          >
            {displayTitle}
          </h1>

          {/* Path */}
          <p
            style={{
              fontFamily: designTokens.typography.fonts.mono,
              fontSize: designTokens.typography.sizes.xs,
              color: designTokens.colors.text.tertiary,
            }}
          >
            {path}
          </p>
        </div>

        {onClose && (
          <BrutalistButton variant="secondary" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
            <span>Close</span>
          </BrutalistButton>
        )}
      </div>

      {/* Metadata panel */}
      {showMetadata && frontmatter && Object.keys(frontmatter).length > 0 && (
        <GlassPanel
          bordered
          borderColor={designTokens.colors.accent.purple}
          style={{
            padding: designTokens.spacing.md,
            marginBottom: designTokens.spacing.lg,
            backgroundColor: `${designTokens.colors.accent.purple}10`,
          }}
        >
          <h3
            style={{
              fontFamily: designTokens.typography.fonts.header,
              fontSize: designTokens.typography.sizes.base,
              fontWeight: designTokens.typography.weights.semibold,
              color: designTokens.colors.accent.purple,
              marginBottom: designTokens.spacing.sm,
              display: 'flex',
              alignItems: 'center',
              gap: designTokens.spacing.xs,
            }}
          >
            <FileText className="w-4 h-4" />
            Metadata
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: designTokens.spacing.md,
            }}
          >
            {frontmatter.date && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: designTokens.spacing.xs,
                    marginBottom: designTokens.spacing.xs,
                  }}
                >
                  <Calendar className="w-3 h-3" style={{ color: designTokens.colors.accent.cyan }} />
                  <span
                    style={{
                      fontFamily: designTokens.typography.fonts.mono,
                      fontSize: designTokens.typography.sizes.xs,
                      color: designTokens.colors.text.tertiary,
                    }}
                  >
                    Date
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: designTokens.typography.fonts.mono,
                    fontSize: designTokens.typography.sizes.sm,
                    color: designTokens.colors.text.secondary,
                  }}
                >
                  {formatDate(frontmatter.date)}
                </span>
              </div>
            )}

            {frontmatter.type && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: designTokens.spacing.xs,
                    marginBottom: designTokens.spacing.xs,
                  }}
                >
                  <FileText className="w-3 h-3" style={{ color: designTokens.colors.accent.yellow }} />
                  <span
                    style={{
                      fontFamily: designTokens.typography.fonts.mono,
                      fontSize: designTokens.typography.sizes.xs,
                      color: designTokens.colors.text.tertiary,
                    }}
                  >
                    Type
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: designTokens.typography.fonts.mono,
                    fontSize: designTokens.typography.sizes.sm,
                    color: designTokens.colors.text.secondary,
                  }}
                >
                  {frontmatter.type}
                </span>
              </div>
            )}

            {frontmatter.tags && frontmatter.tags.length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: designTokens.spacing.xs,
                    marginBottom: designTokens.spacing.xs,
                  }}
                >
                  <Tag className="w-3 h-3" style={{ color: designTokens.colors.accent.magenta }} />
                  <span
                    style={{
                      fontFamily: designTokens.typography.fonts.mono,
                      fontSize: designTokens.typography.sizes.xs,
                      color: designTokens.colors.text.tertiary,
                    }}
                  >
                    Tags
                  </span>
                </div>
                <div style={{ display: 'flex', gap: designTokens.spacing.xs, flexWrap: 'wrap' }}>
                  {frontmatter.tags.map((tag, index) => (
                    <span
                      key={index}
                      style={{
                        fontSize: designTokens.typography.sizes.xs,
                        padding: '4px 8px',
                        backgroundColor: `${designTokens.colors.accent.yellow}20`,
                        color: designTokens.colors.accent.yellow,
                        fontFamily: designTokens.typography.fonts.mono,
                        borderRadius: '3px',
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </GlassPanel>
      )}

      {/* Stats */}
      {showStats && stats && (
        <div
          style={{
            display: 'flex',
            gap: designTokens.spacing.md,
            marginBottom: designTokens.spacing.lg,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}`,
              backgroundColor: `${designTokens.colors.accent.cyan}15`,
              borderLeft: `2px solid ${designTokens.colors.accent.cyan}`,
              display: 'flex',
              alignItems: 'center',
              gap: designTokens.spacing.xs,
            }}
          >
            <FileText className="w-4 h-4" style={{ color: designTokens.colors.accent.cyan }} />
            <span
              style={{
                fontFamily: designTokens.typography.fonts.mono,
                fontSize: designTokens.typography.sizes.xs,
                color: designTokens.colors.text.secondary,
              }}
            >
              {stats.words} words
            </span>
          </div>

          <div
            style={{
              padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}`,
              backgroundColor: `${designTokens.colors.accent.magenta}15`,
              borderLeft: `2px solid ${designTokens.colors.accent.magenta}`,
              display: 'flex',
              alignItems: 'center',
              gap: designTokens.spacing.xs,
            }}
          >
            <Clock className="w-4 h-4" style={{ color: designTokens.colors.accent.magenta }} />
            <span
              style={{
                fontFamily: designTokens.typography.fonts.mono,
                fontSize: designTokens.typography.sizes.xs,
                color: designTokens.colors.text.secondary,
              }}
            >
              {stats.lines} lines
            </span>
          </div>

          {links && links.length > 0 && (
            <div
              style={{
                padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}`,
                backgroundColor: `${designTokens.colors.accent.yellow}15`,
                borderLeft: `2px solid ${designTokens.colors.accent.yellow}`,
                display: 'flex',
                alignItems: 'center',
                gap: designTokens.spacing.xs,
              }}
            >
              <LinkIcon className="w-4 h-4" style={{ color: designTokens.colors.accent.yellow }} />
              <span
                style={{
                  fontFamily: designTokens.typography.fonts.mono,
                  fontSize: designTokens.typography.sizes.xs,
                  color: designTokens.colors.text.secondary,
                }}
              >
                {links.length} links
              </span>
            </div>
          )}
        </div>
      )}

      {/* Document content */}
      <GlassPanel
        bordered
        borderColor={designTokens.colors.structure.border.secondary}
        style={{
          padding: designTokens.spacing.lg,
          marginBottom: designTokens.spacing.lg,
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </GlassPanel>

      {/* Backlinks section */}
      {backlinks && backlinks.length > 0 && (
        <GlassPanel
          bordered
          borderColor={designTokens.colors.accent.cyan}
          style={{
            padding: designTokens.spacing.md,
            backgroundColor: `${designTokens.colors.accent.cyan}10`,
          }}
        >
          <h3
            style={{
              fontFamily: designTokens.typography.fonts.header,
              fontSize: designTokens.typography.sizes.base,
              fontWeight: designTokens.typography.weights.semibold,
              color: designTokens.colors.accent.cyan,
              marginBottom: designTokens.spacing.sm,
              display: 'flex',
              alignItems: 'center',
              gap: designTokens.spacing.xs,
            }}
          >
            <LinkIcon className="w-4 h-4" />
            Backlinks ({backlinks.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: designTokens.spacing.xs }}>
            {backlinks.map((backlink, index) => (
              <WikiLink
                key={index}
                text={backlink}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
