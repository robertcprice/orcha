/**
 * Utility functions for Obsidian vault operations
 */

export interface Frontmatter {
  [key: string]: any;
}

export interface ParsedMarkdown {
  frontmatter: Frontmatter;
  body: string;
  fullContent: string;
}

export interface WikiLink {
  text: string;
  display?: string;
  start: number;
  end: number;
}

/**
 * Parse YAML frontmatter from markdown content
 */
export function parseFrontmatter(content: string): ParsedMarkdown {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return {
      frontmatter: {},
      body: content,
      fullContent: content,
    };
  }

  const [, frontmatterText, body] = match;
  const frontmatter: Frontmatter = {};

  // Parse YAML-like frontmatter
  const lines = frontmatterText.split('\n');
  let currentKey = '';
  let currentValue: any = null;
  let inArray = false;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Handle key-value pairs
    if (trimmed.includes(':') && !inArray) {
      const colonIndex = trimmed.indexOf(':');
      currentKey = trimmed.substring(0, colonIndex).trim();
      const valueStr = trimmed.substring(colonIndex + 1).trim();

      if (valueStr === '') {
        // Empty value, might be array or object
        currentValue = null;
      } else if (valueStr.startsWith('[')) {
        // Inline array
        const arrayMatch = valueStr.match(/\[(.*)\]/);
        if (arrayMatch) {
          currentValue = arrayMatch[1]
            .split(',')
            .map((v) => v.trim().replace(/['"]/g, ''))
            .filter((v) => v);
          frontmatter[currentKey] = currentValue;
          inArray = false;
        } else {
          inArray = true;
          currentValue = [];
        }
      } else {
        // Regular value
        currentValue = valueStr.replace(/['"]/g, '');
        frontmatter[currentKey] = currentValue;
      }
    } else if (trimmed.startsWith('-')) {
      // Array item
      if (currentKey) {
        if (!Array.isArray(currentValue)) {
          currentValue = [];
          frontmatter[currentKey] = currentValue;
        }
        currentValue.push(trimmed.substring(1).trim().replace(/['"]/g, ''));
        inArray = true;
      }
    } else if (inArray && !trimmed.startsWith('[')) {
      // Continue array
      if (Array.isArray(currentValue)) {
        currentValue.push(trimmed.replace(/['"]/g, ''));
      }
    }
  });

  return {
    frontmatter,
    body: body.trim(),
    fullContent: content,
  };
}

/**
 * Extract wiki-links from markdown content
 */
export function extractWikiLinks(content: string): WikiLink[] {
  const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
  const links: WikiLink[] = [];
  let match;

  while ((match = wikiLinkRegex.exec(content)) !== null) {
    const fullText = match[1];
    const pipeIndex = fullText.indexOf('|');

    if (pipeIndex !== -1) {
      // Has display text: [[link|display]]
      links.push({
        text: fullText.substring(0, pipeIndex).trim(),
        display: fullText.substring(pipeIndex + 1).trim(),
        start: match.index,
        end: match.index + match[0].length,
      });
    } else {
      // No display text: [[link]]
      links.push({
        text: fullText.trim(),
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  return links;
}

/**
 * Convert wiki-links to HTML anchor tags
 */
export function renderWikiLinks(
  content: string,
  onLinkClick?: (linkText: string) => void
): string {
  const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;

  return content.replace(wikiLinkRegex, (match, linkContent) => {
    const pipeIndex = linkContent.indexOf('|');
    let linkText, displayText;

    if (pipeIndex !== -1) {
      linkText = linkContent.substring(0, pipeIndex).trim();
      displayText = linkContent.substring(pipeIndex + 1).trim();
    } else {
      linkText = linkContent.trim();
      displayText = linkText;
    }

    const encodedLink = encodeURIComponent(linkText);
    return `<a href="#" data-wiki-link="${encodedLink}" class="wiki-link">${displayText}</a>`;
  });
}

/**
 * Find all files that link to a given document (backlinks)
 */
export interface BacklinkMatch {
  path: string;
  filename: string;
  context: string;
}

export function findBacklinks(
  targetFilename: string,
  allFiles: { path: string; content: string }[]
): BacklinkMatch[] {
  const backlinks: BacklinkMatch[] = [];
  const searchPattern = targetFilename.replace('.md', '');

  allFiles.forEach((file) => {
    const links = extractWikiLinks(file.content);
    const matchingLinks = links.filter((link) => link.text === searchPattern);

    if (matchingLinks.length > 0) {
      matchingLinks.forEach((link) => {
        // Extract context around the link
        const contentLines = file.content.split('\n');
        let context = '';
        let charCount = 0;

        for (const line of contentLines) {
          if (charCount + line.length >= link.start) {
            context = line;
            break;
          }
          charCount += line.length + 1; // +1 for newline
        }

        backlinks.push({
          path: file.path,
          filename: file.path.split('/').pop() || file.path,
          context: context.trim(),
        });
      });
    }
  });

  return backlinks;
}

/**
 * Build a graph data structure from vault files
 */
export interface GraphNode {
  id: string;
  label: string;
  path: string;
  type: 'file' | 'directory';
  tags?: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'wiki-link' | 'tag' | 'parent';
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function buildGraph(files: { path: string; content: string }[]): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeMap = new Map<string, GraphNode>();

  // Create nodes for all files
  files.forEach((file) => {
    const filename = file.path.split('/').pop() || file.path;
    const nodeId = filename.replace('.md', '');
    const parsed = parseFrontmatter(file.content);

    const node: GraphNode = {
      id: nodeId,
      label: nodeId,
      path: file.path,
      type: 'file',
      tags: Array.isArray(parsed.frontmatter.tags) ? parsed.frontmatter.tags : [],
    };

    nodes.push(node);
    nodeMap.set(nodeId, node);
  });

  // Create edges for wiki-links
  files.forEach((file) => {
    const filename = file.path.split('/').pop() || file.path;
    const sourceId = filename.replace('.md', '');
    const links = extractWikiLinks(file.content);

    links.forEach((link) => {
      const targetId = link.text;
      if (nodeMap.has(targetId)) {
        edges.push({
          source: sourceId,
          target: targetId,
          type: 'wiki-link',
        });
      }
    });
  });

  // Create edges for shared tags
  const tagGroups = new Map<string, string[]>();
  nodes.forEach((node) => {
    if (node.tags) {
      node.tags.forEach((tag) => {
        if (!tagGroups.has(tag)) {
          tagGroups.set(tag, []);
        }
        tagGroups.get(tag)!.push(node.id);
      });
    }
  });

  // Add tag edges (connect nodes with same tags)
  tagGroups.forEach((nodeIds) => {
    if (nodeIds.length > 1) {
      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          edges.push({
            source: nodeIds[i],
            target: nodeIds[j],
            type: 'tag',
          });
        }
      }
    }
  });

  return { nodes, edges };
}

/**
 * Simple markdown to HTML converter (basic support)
 */
export function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Lists
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*<\/li>)/g, '<ul>$1</ul>');

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';

  return html;
}

/**
 * Generate table of contents from markdown headers
 */
export interface TocItem {
  level: number;
  text: string;
  id: string;
}

export function generateTableOfContents(markdown: string): TocItem[] {
  const headerRegex = /^(#{1,6})\s+(.+)$/gm;
  const toc: TocItem[] = [];
  let match;

  while ((match = headerRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');

    toc.push({ level, text, id });
  }

  return toc;
}
