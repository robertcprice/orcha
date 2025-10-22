import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const VAULT_PATH = path.join(process.cwd(), '..', 'obsidian-vault');

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  tags?: string[];
  frontmatter?: Record<string, any>;
}

async function readFrontmatter(filePath: string): Promise<Record<string, any> | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    if (frontmatterMatch) {
      const yaml = frontmatterMatch[1];
      const frontmatter: Record<string, any> = {};

      // Simple YAML parsing
      yaml.split('\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          let value: any = line.substring(colonIndex + 1).trim();

          // Parse arrays
          if (value.startsWith('[')) {
            value = value.replace(/[\[\]]/g, '').split(',').map((v: string) => v.trim());
          }

          frontmatter[key] = value;
        }
      });

      return frontmatter;
    }
  } catch (error) {
    console.error('Error reading frontmatter:', error);
  }

  return null;
}

async function buildFileTree(dir: string, basePath: string = ''): Promise<FileNode[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    // Skip hidden files/directories except .obsidian
    if (entry.name.startsWith('.') && entry.name !== '.obsidian') {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      const children = await buildFileTree(fullPath, relativePath);
      nodes.push({
        name: entry.name,
        path: relativePath,
        type: 'directory',
        children
      });
    } else if (entry.name.endsWith('.md')) {
      const frontmatter = await readFrontmatter(fullPath);
      nodes.push({
        name: entry.name,
        path: relativePath,
        type: 'file',
        frontmatter: frontmatter || undefined,
        tags: frontmatter?.tags || []
      });
    }
  }

  return nodes.sort((a, b) => {
    // Directories first, then files
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filterType = searchParams.get('type');
    const filterTag = searchParams.get('tag');

    // Build complete file tree
    const tree = await buildFileTree(VAULT_PATH);

    // Apply filters if requested
    let files = tree;
    if (filterType || filterTag) {
      // Flatten tree for filtering
      const flatten = (nodes: FileNode[]): FileNode[] => {
        return nodes.flatMap(node => {
          if (node.type === 'directory' && node.children) {
            return flatten(node.children);
          }
          return [node];
        });
      };

      let flatFiles = flatten(tree);

      if (filterType) {
        flatFiles = flatFiles.filter(f =>
          f.frontmatter?.type === filterType
        );
      }

      if (filterTag) {
        flatFiles = flatFiles.filter(f =>
          f.tags?.includes(filterTag)
        );
      }

      files = flatFiles;
    }

    return NextResponse.json({
      ok: true,
      tree,
      count: tree.length,
      vault_path: VAULT_PATH
    });

  } catch (error: any) {
    console.error('Error reading vault:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
