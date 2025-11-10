'use client';

import React from 'react';
import { designTokens } from '@/components/design-system';

export interface WikiLinkProps {
  text: string;
  display?: string;
  onNavigate?: (linkText: string) => void;
  className?: string;
}

/**
 * WikiLink Component
 *
 * Renders a clickable wiki-style link [[Link Text]]
 */
export function WikiLink({ text, display, onNavigate, className = '' }: WikiLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(text);
    }
  };

  return (
    <a
      href="#"
      onClick={handleClick}
      className={className}
      style={{
        color: designTokens.colors.accent.cyan,
        textDecoration: 'none',
        fontFamily: designTokens.typography.fonts.mono,
        fontSize: 'inherit',
        fontWeight: designTokens.typography.weights.medium,
        borderBottom: `1px dotted ${designTokens.colors.accent.cyan}`,
        transition: designTokens.transitions.fast,
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = designTokens.colors.accent.magenta;
        e.currentTarget.style.borderBottomColor = designTokens.colors.accent.magenta;
        e.currentTarget.style.borderBottomStyle = 'solid';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = designTokens.colors.accent.cyan;
        e.currentTarget.style.borderBottomColor = designTokens.colors.accent.cyan;
        e.currentTarget.style.borderBottomStyle = 'dotted';
      }}
    >
      {display || text}
    </a>
  );
}

export interface WikiLinkParserProps {
  content: string;
  onNavigate?: (linkText: string) => void;
}

/**
 * WikiLinkParser Component
 *
 * Parses markdown content and replaces wiki-links with clickable components
 */
export function WikiLinkParser({ content, onNavigate }: WikiLinkParserProps) {
  const parseContent = (text: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    const regex = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;

    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        nodes.push(
          <span key={`text-${key++}`}>
            {text.substring(lastIndex, match.index)}
          </span>
        );
      }

      // Add the wiki link
      const linkText = match[1].trim();
      const displayText = match[2]?.trim();

      nodes.push(
        <WikiLink
          key={`link-${key++}`}
          text={linkText}
          display={displayText}
          onNavigate={onNavigate}
        />
      );

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      nodes.push(
        <span key={`text-${key++}`}>
          {text.substring(lastIndex)}
        </span>
      );
    }

    return nodes.length > 0 ? nodes : [<span key="empty">{text}</span>];
  };

  return <>{parseContent(content)}</>;
}

/**
 * Parse markdown with wiki-links and return React elements
 */
export function parseMarkdownWithWikiLinks(
  markdown: string,
  onNavigate?: (linkText: string) => void
): React.ReactNode {
  // Split by line breaks to preserve formatting
  const lines = markdown.split('\n');

  return lines.map((line, index) => (
    <React.Fragment key={index}>
      <WikiLinkParser content={line} onNavigate={onNavigate} />
      {index < lines.length - 1 && <br />}
    </React.Fragment>
  ));
}

/**
 * Extract all wiki-links from content
 */
export function extractAllWikiLinks(content: string): Array<{ text: string; display?: string }> {
  const links: Array<{ text: string; display?: string }> = [];
  const regex = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    links.push({
      text: match[1].trim(),
      display: match[2]?.trim()
    });
  }

  return links;
}

/**
 * Check if content contains wiki-links
 */
export function hasWikiLinks(content: string): boolean {
  return /\[\[([^\]]+)\]\]/.test(content);
}

/**
 * Replace wiki-links with plain text (for exports)
 */
export function stripWikiLinks(content: string, keepDisplay: boolean = true): string {
  return content.replace(
    /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g,
    (_, linkText, displayText) => {
      if (keepDisplay && displayText) {
        return displayText;
      }
      return linkText;
    }
  );
}
