import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const VAULT_PATH = path.join(process.cwd(), '..', 'obsidian-vault');

interface GraphNode {
  id: string;
  label: string;
  path: string;
  type?: string;
  tags?: string[];
  group?: string;
}

interface GraphLink {
  source: string;
  target: string;
  type: 'wiki-link' | 'tag' | 'backlink';
}

interface Graph {
  nodes: GraphNode[];
  links: GraphLink[];
}

async function buildGraph(dir: string, basePath: string = ''): Promise<Graph> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const fileMap = new Map<string, string>(); // filename -> path

  // First pass: collect all files
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'templates') {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      const subGraph = await buildGraph(fullPath, relativePath);
      nodes.push(...subGraph.nodes);
      links.push(...subGraph.links);

      // Update file map
      subGraph.nodes.forEach(node => {
        const filename = path.basename(node.path, '.md');
        fileMap.set(filename, node.id);
      });

    } else if (entry.name.endsWith('.md')) {
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const filename = entry.name.replace('.md', '');

        // Parse frontmatter for metadata
        let frontmatter: Record<string, any> | null = null;
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

        if (frontmatterMatch) {
          frontmatter = {};
          frontmatterMatch[1].split('\n').forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
              const key = line.substring(0, colonIndex).trim();
              let value: any = line.substring(colonIndex + 1).trim();
              if (value.startsWith('[')) {
                value = value.replace(/[\[\]]/g, '').split(',').map((v: string) => v.trim());
              }
              frontmatter![key] = value;
            }
          });
        }

        // Determine node group based on directory
        let group = 'default';
        if (relativePath.includes('01-Architecture')) group = 'architecture';
        else if (relativePath.includes('02-Components')) group = 'components';
        else if (relativePath.includes('03-Experiments')) group = 'experiments';
        else if (relativePath.includes('04-Decisions')) group = 'decisions';
        else if (relativePath.includes('05-Agent-Sessions')) group = 'sessions';
        else if (relativePath.includes('06-Research')) group = 'research';
        else if (relativePath.includes('09-Milestones')) group = 'milestones';

        const nodeId = relativePath;
        nodes.push({
          id: nodeId,
          label: filename,
          path: relativePath,
          type: frontmatter?.type,
          tags: frontmatter?.tags || [],
          group
        });

        fileMap.set(filename, nodeId);

        // Extract wiki-links [[Note Name]]
        const linkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
        let match;
        while ((match = linkRegex.exec(content)) !== null) {
          const targetName = match[1].trim();
          // We'll resolve these in second pass after all nodes are collected
          links.push({
            source: nodeId,
            target: targetName, // temporary - will resolve to ID
            type: 'wiki-link'
          });
        }

        // Extract tag relationships
        if (frontmatter?.tags) {
          const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [frontmatter.tags];
          tags.forEach((tag: string) => {
            links.push({
              source: nodeId,
              target: `tag:${tag}`,
              type: 'tag'
            });
          });
        }

      } catch (error) {
        console.error(`Error processing file ${fullPath}:`, error);
      }
    }
  }

  // Second pass: resolve wiki-link targets
  const resolvedLinks = links.map(link => {
    if (link.type === 'wiki-link') {
      const targetId = fileMap.get(link.target as string);
      if (targetId) {
        return { ...link, target: targetId };
      }
      // Link to non-existent note - skip
      return null;
    }
    return link;
  }).filter((link): link is GraphLink => link !== null);

  return { nodes, links: resolvedLinks };
}

export async function GET(request: NextRequest) {
  try {
    const graph = await buildGraph(VAULT_PATH);

    // Add tag nodes
    const tagSet = new Set<string>();
    graph.links.forEach(link => {
      if (link.type === 'tag' && typeof link.target === 'string' && link.target.startsWith('tag:')) {
        tagSet.add(link.target);
      }
    });

    tagSet.forEach(tag => {
      graph.nodes.push({
        id: tag,
        label: tag.replace('tag:', '#'),
        path: '',
        group: 'tag'
      });
    });

    return NextResponse.json({
      ok: true,
      graph,
      stats: {
        nodes: graph.nodes.length,
        links: graph.links.length,
        groups: [...new Set(graph.nodes.map(n => n.group))]
      }
    });

  } catch (error: any) {
    console.error('Error building graph:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
