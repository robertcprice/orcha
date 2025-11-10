'use client';

import React, { useEffect, useState, useRef } from 'react';
import { GlassPanel, BrutalistButton, designTokens } from '@/components/design-system';
import { FileText, Tag, Calendar, Link as LinkIcon, ArrowLeft, List, X } from 'lucide-react';
import {
  parseFrontmatter,
  extractWikiLinks,
  renderWikiLinks,
  generateTableOfContents,
  markdownToHtml,
  type Frontmatter,
  type TocItem,
} from '@/lib/vault-utils';

interface Backlink {
  path: string;
  filename: string;
  context: string;
}

interface DocumentReaderProps {
  filePath: string;
  content: string;
  onWikiLinkClick?: (linkText: string) => void;
  onClose?: () => void;
  backlinks?: Backlink[];
}

export default function DocumentReader({
  filePath,
  content,
  onWikiLinkClick,
  onClose,
  backlinks = [],
}: DocumentReaderProps) {
  const [frontmatter, setFrontmatter] = useState<Frontmatter>({});
  const [body, setBody] = useState<string>('');
  const [toc, setToc] = useState<TocItem[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [renderedHtml, setRenderedHtml] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parsed = parseFrontmatter(content);
    setFrontmatter(parsed.frontmatter);
    setBody(parsed.body);

    // Generate table of contents
    const tocItems = generateTableOfContents(parsed.body);
    setToc(tocItems);

    // Convert markdown to HTML with wiki-links
    let html = markdownToHtml(parsed.body);
    html = renderWikiLinks(html);
    setRenderedHtml(html);
  }, [content]);

  useEffect(() => {
    // Add click handlers to wiki-links
    if (!contentRef.current) return;

    const handleLinkClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('wiki-link')) {
        e.preventDefault();
        const linkText = target.getAttribute('data-wiki-link');
        if (linkText && onWikiLinkClick) {
          onWikiLinkClick(decodeURIComponent(linkText));
        }
      }
    };

    const links = contentRef.current.querySelectorAll('.wiki-link');
    links.forEach((link) => {
      link.addEventListener('click', handleLinkClick);
    });

    return () => {
      links.forEach((link) => {
        link.removeEventListener('click', handleLinkClick);
      });
    };
  }, [renderedHtml, onWikiLinkClick]);

  const filename = filePath.split('/').pop() || filePath;
  const displayName = filename.replace('.md', '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: designTokens.spacing.md }}>
      {/* Header */}
      <GlassPanel
        bordered
        borderColor={designTokens.colors.accent.cyan}
        style={{
          padding: designTokens.spacing.md,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ flex: 1 }}>
          <h2
            style={{
              fontFamily: designTokens.typography.fonts.header,
              fontSize: designTokens.typography.sizes['2xl'],
              fontWeight: designTokens.typography.weights.bold,
              color: designTokens.colors.text.primary,
              marginBottom: designTokens.spacing.xs,
            }}
          >
            {displayName}
          </h2>
          <p
            style={{
              fontFamily: designTokens.typography.fonts.mono,
              fontSize: designTokens.typography.sizes.xs,
              color: designTokens.colors.text.tertiary,
            }}
          >
            {filePath}
          </p>
        </div>

        <div style={{ display: 'flex', gap: designTokens.spacing.xs }}>
          <BrutalistButton variant="secondary" size="sm" onClick={() => setShowToc(!showToc)}>
            <List className="w-4 h-4" />
            <span>TOC</span>
          </BrutalistButton>
          {onClose && (
            <BrutalistButton variant="secondary" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
              <span>Close</span>
            </BrutalistButton>
          )}
        </div>
      </GlassPanel>

      <div style={{ display: 'flex', gap: designTokens.spacing.md, flex: 1, overflow: 'hidden' }}>
        {/* Main content area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: designTokens.spacing.md, overflow: 'auto' }}>
          {/* Frontmatter metadata */}
          {frontmatter && Object.keys(frontmatter).length > 0 && (
            <GlassPanel
              bordered
              borderColor={designTokens.colors.accent.purple}
              style={{
                padding: designTokens.spacing.md,
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: designTokens.spacing.sm }}>
                {Object.entries(frontmatter).map(([key, value]) => (
                  <div key={key}>
                    <span
                      style={{
                        fontFamily: designTokens.typography.fonts.mono,
                        fontSize: designTokens.typography.sizes.xs,
                        color: designTokens.colors.text.tertiary,
                        fontWeight: designTokens.typography.weights.semibold,
                      }}
                    >
                      {key}:
                    </span>
                    <div
                      style={{
                        marginTop: '2px',
                        fontFamily: designTokens.typography.fonts.mono,
                        fontSize: designTokens.typography.sizes.xs,
                        color: designTokens.colors.text.secondary,
                      }}
                    >
                      {Array.isArray(value) ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {value.map((item, i) => (
                            <span
                              key={i}
                              style={{
                                padding: '2px 6px',
                                backgroundColor: `${designTokens.colors.accent.yellow}20`,
                                color: designTokens.colors.accent.yellow,
                                borderRadius: '4px',
                                fontSize: '10px',
                              }}
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : (
                        String(value)
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          )}

          {/* Document body */}
          <GlassPanel
            bordered
            borderColor={designTokens.colors.structure.border.secondary}
            style={{
              padding: designTokens.spacing.lg,
              flex: 1,
            }}
          >
            <div
              ref={contentRef}
              style={{
                fontFamily: designTokens.typography.fonts.mono,
                fontSize: designTokens.typography.sizes.sm,
                color: designTokens.colors.text.secondary,
                lineHeight: designTokens.typography.lineHeights.relaxed,
              }}
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
              className="document-content"
            />

            <style jsx global>{`
              .document-content h1 {
                font-size: ${designTokens.typography.sizes['2xl']};
                font-family: ${designTokens.typography.fonts.header};
                font-weight: ${designTokens.typography.weights.bold};
                color: ${designTokens.colors.text.primary};
                margin: ${designTokens.spacing.lg} 0 ${designTokens.spacing.md} 0;
                padding-bottom: ${designTokens.spacing.sm};
                border-bottom: 2px solid ${designTokens.colors.structure.border.secondary};
              }

              .document-content h2 {
                font-size: ${designTokens.typography.sizes.xl};
                font-family: ${designTokens.typography.fonts.header};
                font-weight: ${designTokens.typography.weights.semibold};
                color: ${designTokens.colors.text.primary};
                margin: ${designTokens.spacing.md} 0 ${designTokens.spacing.sm} 0;
              }

              .document-content h3 {
                font-size: ${designTokens.typography.sizes.lg};
                font-family: ${designTokens.typography.fonts.header};
                font-weight: ${designTokens.typography.weights.semibold};
                color: ${designTokens.colors.text.primary};
                margin: ${designTokens.spacing.sm} 0;
              }

              .document-content p {
                margin: ${designTokens.spacing.sm} 0;
                line-height: ${designTokens.typography.lineHeights.relaxed};
              }

              .document-content ul,
              .document-content ol {
                margin: ${designTokens.spacing.sm} 0;
                padding-left: ${designTokens.spacing.lg};
              }

              .document-content li {
                margin: ${designTokens.spacing.xs} 0;
              }

              .document-content code {
                background-color: ${designTokens.colors.structure.bg.secondary};
                padding: 2px 6px;
                border-radius: 4px;
                font-family: ${designTokens.typography.fonts.mono};
                font-size: ${designTokens.typography.sizes.xs};
                color: ${designTokens.colors.accent.cyan};
              }

              .document-content pre {
                background-color: ${designTokens.colors.structure.bg.secondary};
                padding: ${designTokens.spacing.md};
                border-radius: ${designTokens.borders.radius};
                overflow-x: auto;
                margin: ${designTokens.spacing.md} 0;
              }

              .document-content pre code {
                background: none;
                padding: 0;
              }

              .document-content .wiki-link {
                color: ${designTokens.colors.accent.cyan};
                text-decoration: none;
                border-bottom: 1px dashed ${designTokens.colors.accent.cyan};
                cursor: pointer;
                transition: ${designTokens.transitions.fast};
              }

              .document-content .wiki-link:hover {
                color: ${designTokens.colors.accent.magenta};
                border-bottom-color: ${designTokens.colors.accent.magenta};
              }

              .document-content a {
                color: ${designTokens.colors.accent.blue};
                text-decoration: none;
                border-bottom: 1px solid ${designTokens.colors.accent.blue}40;
              }

              .document-content a:hover {
                border-bottom-color: ${designTokens.colors.accent.blue};
              }
            `}</style>
          </GlassPanel>

          {/* Backlinks */}
          {backlinks.length > 0 && (
            <GlassPanel
              bordered
              borderColor={designTokens.colors.accent.magenta}
              style={{
                padding: designTokens.spacing.md,
                backgroundColor: `${designTokens.colors.accent.magenta}10`,
              }}
            >
              <h3
                style={{
                  fontFamily: designTokens.typography.fonts.header,
                  fontSize: designTokens.typography.sizes.base,
                  fontWeight: designTokens.typography.weights.semibold,
                  color: designTokens.colors.accent.magenta,
                  marginBottom: designTokens.spacing.sm,
                  display: 'flex',
                  alignItems: 'center',
                  gap: designTokens.spacing.xs,
                }}
              >
                <LinkIcon className="w-4 h-4" />
                Backlinks ({backlinks.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: designTokens.spacing.sm }}>
                {backlinks.map((backlink, i) => (
                  <div
                    key={i}
                    style={{
                      padding: designTokens.spacing.sm,
                      backgroundColor: designTokens.colors.structure.surface.primary,
                      borderRadius: designTokens.borders.radiusSm,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onClick={() => onWikiLinkClick && onWikiLinkClick(backlink.filename.replace('.md', ''))}
                  >
                    <div
                      style={{
                        fontFamily: designTokens.typography.fonts.mono,
                        fontSize: designTokens.typography.sizes.sm,
                        color: designTokens.colors.accent.cyan,
                        fontWeight: designTokens.typography.weights.semibold,
                        marginBottom: '4px',
                      }}
                    >
                      {backlink.filename.replace('.md', '')}
                    </div>
                    <div
                      style={{
                        fontFamily: designTokens.typography.fonts.mono,
                        fontSize: designTokens.typography.sizes.xs,
                        color: designTokens.colors.text.tertiary,
                      }}
                    >
                      {backlink.context}
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          )}
        </div>

        {/* Table of Contents sidebar */}
        {showToc && toc.length > 0 && (
          <GlassPanel
            bordered
            borderColor={designTokens.colors.structure.border.secondary}
            style={{
              width: '250px',
              padding: designTokens.spacing.md,
              flexShrink: 0,
            }}
          >
            <h3
              style={{
                fontFamily: designTokens.typography.fonts.header,
                fontSize: designTokens.typography.sizes.base,
                fontWeight: designTokens.typography.weights.semibold,
                color: designTokens.colors.text.primary,
                marginBottom: designTokens.spacing.sm,
                display: 'flex',
                alignItems: 'center',
                gap: designTokens.spacing.xs,
              }}
            >
              <List className="w-4 h-4" />
              Contents
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {toc.map((item, i) => (
                <a
                  key={i}
                  href={`#${item.id}`}
                  style={{
                    paddingLeft: `${(item.level - 1) * 12}px`,
                    fontFamily: designTokens.typography.fonts.mono,
                    fontSize: designTokens.typography.sizes.xs,
                    color: designTokens.colors.text.secondary,
                    textDecoration: 'none',
                    transition: designTokens.transitions.fast,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = designTokens.colors.accent.cyan;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = designTokens.colors.text.secondary;
                  }}
                >
                  {item.text}
                </a>
              ))}
            </div>
          </GlassPanel>
        )}
      </div>
    </div>
  );
}
