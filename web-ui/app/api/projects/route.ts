import { NextResponse } from 'next/server';
import { discoverProjects } from '@/server/projects';

export async function GET() {
  try {
    const projects = discoverProjects();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error in /api/projects:', error);
    return NextResponse.json({ error: 'Failed to discover projects' }, { status: 500 });
  }
}
