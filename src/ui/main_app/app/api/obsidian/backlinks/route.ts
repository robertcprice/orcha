import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface Backlink {
  path: string;
  filename: string;
  context: string;
}

// Extract wiki-links with positions
function extractWikiLinksWithContext(content: string): Array<{ text: string; position: number }> {
  const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
  const links: Array<{ text: string; position: number }> = [];
  let match;

  while ((match = wikiLinkRegex.exec(content)) !== null) {
    const fullText = match[1];
    const pipeIndex = fullText.indexOf('|');
    const linkText = pipeIndex !== -1 ? fullText.substring(0, pipeIndex).trim() : fullText.trim();
    links.push({
      text: linkText,
      position: match.index,
    });
  }

  return links;
}

// Collect all files
async function collectFiles(
  dirPath: string,
  relativePath: string = ''
): Promise<Array<{ path: string; content: string; name: string }>> {
  const files: Array<{ path: string; content: string; name: string }> = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const subFiles = await collectFiles(fullPath, relPath);
      files.push(...subFiles);
    } else if (entry.name.endsWith('.md')) {
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        files.push({
          path: relPath,
          content,
          name: entry.name,
        });
      } catch (error) {
        console.error(`Error reading file ${fullPath}:`, error);
      }
    }
  }

  return files;
}

// Find backlinks
function findBacklinks(
  targetFilename: string,
  allFiles: Array<{ path: string; content: string; name: string }>
): Backlink[] {
  const backlinks: Backlink[] = [];
  const searchPattern = targetFilename.replace('.md', '');

  allFiles.forEach((file) => {
    const links = extractWikiLinksWithContext(file.content);
    const matchingLinks = links.filter((link) => link.text === searchPattern);

    if (matchingLinks.length > 0) {
      matchingLinks.forEach((link) => {
        // Extract context around the link
        const lines = file.content.split('\n');
        let charCount = 0;
        let context = '';

        for (const line of lines) {
          if (charCount + line.length >= link.position) {
            context = line.trim();
            break;
          }
          charCount += line.length + 1;
        }

        backlinks.push({
          path: file.path,
          filename: file.name,
          context: context || 'No context available',
        });
      });
    }
  });

  return backlinks;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { ok: false, error: 'Filename is required' },
        { status: 400 }
      );
    }

    const vaultPath = path.join(
      process.cwd(),
      '..',
      'projects',
      'Smart Market Solutions',
      'obsidian-vault'
    );

    // Check if vault exists
    try {
      await fs.access(vaultPath);
    } catch {
      return NextResponse.json({
        ok: false,
        error: 'Vault directory not found',
        backlinks: [],
      });
    }

    const files = await collectFiles(vaultPath);
    const backlinks = findBacklinks(filename, files);

    return NextResponse.json({
      ok: true,
      filename,
      backlinks,
      count: backlinks.length,
    });
  } catch (error) {
    console.error('Error finding backlinks:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        backlinks: [],
      },
      { status: 500 }
    );
  }
}
