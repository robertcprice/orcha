import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = path.join(process.cwd(), '..');

// Directories to exclude
const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'venv',
  '__pycache__',
  '.cache',
  'build',
  'dist',
  'logs',
  'tmp',
]);

// Build file tree recursively
function buildTree(dirPath: string, maxDepth: number = 3, currentDepth: number = 0): any | null {
  if (currentDepth >= maxDepth) return null;

  try {
    const stats = fs.statSync(dirPath);
    const name = path.basename(dirPath);

    if (stats.isDirectory()) {
      if (EXCLUDE_DIRS.has(name)) return null;

      const children: any[] = [];
      const entries = fs.readdirSync(dirPath);

      for (const entry of entries) {
        const childPath = path.join(dirPath, entry);
        const childNode = buildTree(childPath, maxDepth, currentDepth + 1);
        if (childNode) {
          children.push(childNode);
        }
      }

      // Sort: directories first, then files, alphabetically
      children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      return {
        name,
        path: path.relative(PROJECT_ROOT, dirPath) || 'root',
        type: 'directory',
        children,
      };
    } else if (stats.isFile()) {
      return {
        name,
        path: path.relative(PROJECT_ROOT, dirPath),
        type: 'file',
        size: stats.size,
      };
    }
  } catch (error) {
    // Ignore permission errors
    return null;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const tree = buildTree(PROJECT_ROOT);
    return NextResponse.json({ tree });
  } catch (error) {
    console.error('Failed to build file tree:', error);
    return NextResponse.json({ tree: null, error: String(error) });
  }
}
