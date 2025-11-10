import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('path');
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'Path parameter is required' },
        { status: 400 }
      );
    }
    
    // Resolve file path relative to project root
    const projectRoot = process.cwd().replace('/web-ui', '');
    const fullPath = path.resolve(projectRoot, filePath);
    
    // Security check: ensure path is within project root
    if (!fullPath.startsWith(projectRoot)) {
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 403 }
      );
    }
    
    // Check if file exists
    try {
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        return NextResponse.json(
          { error: 'Path is a directory, not a file' },
          { status: 400 }
        );
      }
      
      // Read file content
      const content = await fs.readFile(fullPath, 'utf-8');
      
      return NextResponse.json({
        content,
        lastModified: stats.mtime.toISOString(),
        size: stats.size,
      });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error reading file:', error);
    return NextResponse.json(
      { error: 'Failed to read file', details: error.message },
      { status: 500 }
    );
  }
}

