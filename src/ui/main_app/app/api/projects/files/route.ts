import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dirPath = searchParams.get('path') || '.';
    const ext = searchParams.get('ext');
    
    // Resolve directory path relative to project root
    const projectRoot = process.cwd().replace('/web-ui', '');
    const fullPath = path.resolve(projectRoot, dirPath);
    
    // Security check: ensure path is within project root
    if (!fullPath.startsWith(projectRoot)) {
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 403 }
      );
    }
    
    // Check if directory exists
    try {
      const stats = await fs.stat(fullPath);
      if (!stats.isDirectory()) {
        return NextResponse.json(
          { error: 'Path is not a directory' },
          { status: 400 }
        );
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return NextResponse.json(
          { error: 'Directory not found' },
          { status: 404 }
        );
      }
      throw error;
    }
    
    // Recursively find files
    const files: string[] = [];
    
    async function findFiles(dir: string, baseDir: string) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullEntryPath = path.join(dir, entry.name);
          const relativePath = path.relative(baseDir, fullEntryPath);
          
          if (entry.isDirectory()) {
            // Skip node_modules, .git, etc.
            if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
              await findFiles(fullEntryPath, baseDir);
            }
          } else if (entry.isFile()) {
            // Filter by extension if provided
            if (!ext || entry.name.toLowerCase().endsWith(`.${ext.toLowerCase()}`)) {
              files.push(relativePath);
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
        console.warn(`Cannot read directory ${dir}:`, error);
      }
    }
    
    await findFiles(fullPath, fullPath);
    
    return NextResponse.json({
      files: files.sort(),
      count: files.length,
    });
  } catch (error: any) {
    console.error('Error listing files:', error);
    return NextResponse.json(
      { error: 'Failed to list files', details: error.message },
      { status: 500 }
    );
  }
}

