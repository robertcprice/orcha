import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const VAULT_PATH = path.join(process.cwd(), '..', 'obsidian-vault');

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json(
        { ok: false, error: 'Missing path parameter' },
        { status: 400 }
      );
    }

    // Security: Prevent directory traversal
    const safePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.join(VAULT_PATH, safePath);

    // Ensure the resolved path is still within the vault
    if (!fullPath.startsWith(VAULT_PATH)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid path' },
        { status: 403 }
      );
    }

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json(
        { ok: false, error: 'File not found' },
        { status: 404 }
      );
    }

    // Read file content
    const content = await fs.readFile(fullPath, 'utf-8');

    // Parse frontmatter
    let frontmatter: Record<string, any> | null = null;
    let body = content;

    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (frontmatterMatch) {
      const yaml = frontmatterMatch[1];
      body = frontmatterMatch[2];

      frontmatter = {};
      yaml.split('\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          let value: any = line.substring(colonIndex + 1).trim();

          // Parse arrays
          if (value.startsWith('[')) {
            value = value.replace(/[\[\]]/g, '').split(',').map((v: string) => v.trim());
          }

          frontmatter![key] = value;
        }
      });
    }

    // Extract internal links for graph
    const linkRegex = /\[\[([^\]]+)\]\]/g;
    const links: string[] = [];
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      links.push(match[1]);
    }

    return NextResponse.json({
      ok: true,
      path: safePath,
      content,
      body,
      frontmatter,
      links,
      stats: {
        size: content.length,
        lines: content.split('\n').length,
        words: body.split(/\s+/).length
      }
    });

  } catch (error: any) {
    console.error('Error reading file:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
