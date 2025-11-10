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
        // If it's a directory, look for index.html
        const indexPath = path.join(fullPath, 'index.html');
        try {
          await fs.stat(indexPath);
          const content = await fs.readFile(indexPath, 'utf-8');
          return new NextResponse(content, {
            headers: {
              'Content-Type': 'text/html',
            },
          });
        } catch {
          return NextResponse.json(
            { error: 'No index.html found in directory' },
            { status: 404 }
          );
        }
      }
      
      // Read file content
      const content = await fs.readFile(fullPath, 'utf-8');
      
      // Determine content type
      const ext = path.extname(fullPath).toLowerCase();
      const contentTypeMap: Record<string, string> = {
        '.html': 'text/html',
        '.htm': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
      };
      
      return new NextResponse(content, {
        headers: {
          'Content-Type': contentTypeMap[ext] || 'text/plain',
        },
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
    console.error('Error serving preview:', error);
    return NextResponse.json(
      { error: 'Failed to serve preview', details: error.message },
      { status: 500 }
    );
  }
}

