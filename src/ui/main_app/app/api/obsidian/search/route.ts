import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const VAULT_PATH = path.join(process.cwd(), '..', 'obsidian-vault');

interface SearchResult {
  path: string;
  name: string;
  matches: Array<{
    line: number;
    content: string;
    context: string;
  }>;
  score: number;
  frontmatter?: Record<string, any>;
}

async function searchFiles(query: string, dir: string, basePath: string = ''): Promise<SearchResult[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();

  for (const entry of entries) {
    // Skip hidden and utility directories
    if (entry.name.startsWith('.') || entry.name === 'templates') {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      const subResults = await searchFiles(query, fullPath, relativePath);
      results.push(...subResults);
    } else if (entry.name.endsWith('.md')) {
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const lines = content.split('\n');
        const matches: Array<{line: number; content: string; context: string}> = [];

        // Parse frontmatter
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

        // Search through lines
        lines.forEach((line, index) => {
          if (line.toLowerCase().includes(queryLower)) {
            // Get context (surrounding lines)
            const contextStart = Math.max(0, index - 1);
            const contextEnd = Math.min(lines.length, index + 2);
            const context = lines.slice(contextStart, contextEnd).join('\n');

            matches.push({
              line: index + 1,
              content: line,
              context
            });
          }
        });

        if (matches.length > 0) {
          // Calculate relevance score
          let score = matches.length;

          // Bonus for title/filename matches
          if (entry.name.toLowerCase().includes(queryLower)) {
            score += 10;
          }

          // Bonus for tag matches
          if (frontmatter?.tags?.some((tag: string) =>
            tag.toLowerCase().includes(queryLower)
          )) {
            score += 5;
          }

          results.push({
            path: relativePath,
            name: entry.name,
            matches: matches.slice(0, 5), // Limit to 5 matches per file
            score,
            frontmatter: frontmatter || undefined
          });
        }
      } catch (error) {
        console.error(`Error searching file ${fullPath}:`, error);
      }
    }
  }

  return results;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Missing or empty query parameter' },
        { status: 400 }
      );
    }

    const results = await searchFiles(query.trim(), VAULT_PATH);

    // Sort by score (descending)
    results.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      ok: true,
      query,
      results,
      count: results.length
    });

  } catch (error: any) {
    console.error('Error searching vault:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
