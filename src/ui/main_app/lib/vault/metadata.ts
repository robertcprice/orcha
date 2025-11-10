/**
 * Vault Metadata Utilities
 *
 * Utilities for parsing and working with Obsidian vault metadata,
 * including frontmatter, wiki-links, and document relationships.
 */

import matter from 'gray-matter';

export interface Frontmatter {
  title?: string;
  date?: string;
  tags?: string[];
  type?: string;
  related_docs?: string[];
  [key: string]: any;
}

export interface ParsedDocument {
  frontmatter: Frontmatter;
  content: string;
  excerpt?: string;
  links: WikiLink[];
  tags: string[];
  backlinks?: string[];
}

export interface WikiLink {
  text: string;
  display?: string;
  line: number;
  column: number;
}

/**
 * Parse markdown file with frontmatter
 */
export function parseMarkdown(content: string): ParsedDocument {
  // Parse frontmatter using gray-matter
  const { data, content: body, excerpt } = matter(content, {
    excerpt: true,
    excerpt_separator: '<!-- more -->'
  });

  // Extract wiki-links
  const links = extractWikiLinks(content);

  // Extract tags from frontmatter and content
  const tags = extractTags(data, body);

  return {
    frontmatter: data as Frontmatter,
    content: body,
    excerpt,
    links,
    tags
  };
}

/**
 * Extract wiki-links from markdown content
 * Supports: [[Link]], [[Link|Display]], [[Link#Section]]
 */
export function extractWikiLinks(content: string): WikiLink[] {
  const links: WikiLink[] = [];
  const regex = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;

  const lines = content.split('\n');
  lines.forEach((line, lineIndex) => {
    let match;
    while ((match = regex.exec(line)) !== null) {
      links.push({
        text: match[1].trim(),
        display: match[2]?.trim(),
        line: lineIndex + 1,
        column: match.index
      });
    }
  });

  return links;
}

/**
 * Extract tags from frontmatter and content
 * Supports: #tag in content and tags: [] in frontmatter
 */
export function extractTags(frontmatter: any, content: string): string[] {
  const tags = new Set<string>();

  // Get tags from frontmatter
  if (frontmatter.tags) {
    const fmTags = Array.isArray(frontmatter.tags)
      ? frontmatter.tags
      : [frontmatter.tags];
    fmTags.forEach((tag: unknown) => tags.add(String(tag).toLowerCase()));
  }

  // Get inline tags from content
  const inlineTagRegex = /#([a-zA-Z0-9_-]+)/g;
  let match;
  while ((match = inlineTagRegex.exec(content)) !== null) {
    // Avoid matching in code blocks
    const line = content.substring(0, match.index).split('\n').pop() || '';
    if (!line.includes('```') && !line.includes('`#')) {
      tags.add(match[1].toLowerCase());
    }
  }

  return Array.from(tags);
}

/**
 * Extract related documents from frontmatter
 */
export function getRelatedDocs(frontmatter: Frontmatter): string[] {
  if (!frontmatter.related_docs) return [];

  const related = Array.isArray(frontmatter.related_docs)
    ? frontmatter.related_docs
    : [frontmatter.related_docs];

  // Extract link text from wiki-link format
  return related.map(doc => {
    const match = doc.match(/\[\[([^\]]+)\]\]/);
    return match ? match[1] : doc;
  });
}

/**
 * Convert wiki-link text to file path
 */
export function wikiLinkToPath(linkText: string): string {
  // Remove any section anchors
  const cleanText = linkText.split('#')[0].trim();

  // Convert to filename (add .md extension if not present)
  return cleanText.endsWith('.md') ? cleanText : `${cleanText}.md`;
}

/**
 * Convert file path to wiki-link text
 */
export function pathToWikiLink(path: string): string {
  // Remove .md extension
  const name = path.replace(/\.md$/, '');

  // Remove directory path, keep just filename
  return name.split('/').pop() || name;
}

/**
 * Generate document excerpt
 */
export function generateExcerpt(content: string, maxLength: number = 200): string {
  // Remove frontmatter
  const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n/, '');

  // Remove markdown formatting
  let plain = withoutFrontmatter
    .replace(/#{1,6}\s/g, '') // headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1') // italic
    .replace(/\[\[([^\]]+)\]\]/g, '$1') // wiki-links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // markdown links
    .replace(/```[\s\S]*?```/g, '') // code blocks
    .replace(/`([^`]+)`/g, '$1') // inline code
    .trim();

  // Take first paragraph or maxLength characters
  const firstPara = plain.split('\n\n')[0];
  if (firstPara.length <= maxLength) {
    return firstPara;
  }

  return firstPara.substring(0, maxLength).trim() + '...';
}

/**
 * Build backlinks map from document set
 */
export function buildBacklinksMap(documents: Map<string, ParsedDocument>): Map<string, string[]> {
  const backlinks = new Map<string, string[]>();

  documents.forEach((doc, sourcePath) => {
    doc.links.forEach(link => {
      const targetPath = wikiLinkToPath(link.text);

      if (!backlinks.has(targetPath)) {
        backlinks.set(targetPath, []);
      }

      backlinks.get(targetPath)!.push(sourcePath);
    });
  });

  return backlinks;
}

/**
 * Calculate document similarity based on shared tags and links
 */
export function calculateSimilarity(doc1: ParsedDocument, doc2: ParsedDocument): number {
  let score = 0;

  // Shared tags (weight: 2)
  const sharedTags = doc1.tags.filter(tag => doc2.tags.includes(tag));
  score += sharedTags.length * 2;

  // Shared links (weight: 3)
  const doc1Links = new Set(doc1.links.map(l => l.text));
  const doc2Links = new Set(doc2.links.map(l => l.text));
  const sharedLinks = [...doc1Links].filter(link => doc2Links.has(link));
  score += sharedLinks.length * 3;

  // Related docs reference each other (weight: 5)
  const doc1Related = getRelatedDocs(doc1.frontmatter);
  const doc2Related = getRelatedDocs(doc2.frontmatter);
  if (doc1Related.some(r => doc2Related.includes(r))) {
    score += 5;
  }

  return score;
}

/**
 * Format date from frontmatter
 */
export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'Unknown date';

  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Validate frontmatter structure
 */
export function validateFrontmatter(frontmatter: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields
  if (!frontmatter.title) {
    errors.push('Missing required field: title');
  }

  if (!frontmatter.date) {
    errors.push('Missing required field: date');
  }

  // Validate date format
  if (frontmatter.date && isNaN(Date.parse(frontmatter.date))) {
    errors.push('Invalid date format');
  }

  // Validate tags
  if (frontmatter.tags && !Array.isArray(frontmatter.tags)) {
    errors.push('Tags must be an array');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
