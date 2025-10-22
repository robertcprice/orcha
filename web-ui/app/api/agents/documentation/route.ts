/**
 * API endpoint to get agent documentation and session outputs
 * Reads from obsidian-vault/05-Agent-Sessions/
 */

import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

interface SessionDoc {
  filename: string;
  title: string;
  date: string;
  agent?: string;
  summary?: string;
  content: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role'); // Filter by agent role
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get project root (parent of ui-agent-console)
    const projectRoot = path.resolve(process.cwd(), '..');
    const sessionsDir = path.join(projectRoot, 'obsidian-vault', '05-Agent-Sessions');

    let files: string[] = [];
    try {
      files = await readdir(sessionsDir);
    } catch {
      // Directory doesn't exist yet
      return NextResponse.json({ sessions: [] });
    }

    // Filter for markdown files
    const mdFiles = files.filter(f => f.endsWith('.md'));

    // Read and parse each file
    const sessions: SessionDoc[] = [];

    for (const file of mdFiles) {
      try {
        const filePath = path.join(sessionsDir, file);
        const content = await readFile(filePath, 'utf-8');

        // Parse frontmatter
        const { data, content: markdown } = matter(content);

        // Extract basic info
        const session: SessionDoc = {
          filename: file,
          title: data.title || file.replace('.md', ''),
          date: data.date || '',
          agent: data.agent || undefined,
          summary: data.summary || undefined,
          content: markdown.substring(0, 500), // First 500 chars as preview
        };

        // Filter by role if specified
        if (role && session.agent && session.agent !== role) {
          continue;
        }

        sessions.push(session);
      } catch (error) {
        console.error(`Failed to read session file ${file}:`, error);
      }
    }

    // Sort by date (newest first)
    sessions.sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Return last N sessions
    const recentSessions = sessions.slice(0, limit);

    return NextResponse.json({
      sessions: recentSessions,
      total: sessions.length,
    });
  } catch (error) {
    console.error('Failed to get agent documentation:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
