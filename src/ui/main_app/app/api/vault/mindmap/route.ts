import { NextResponse } from 'next/server';
import { getMindMapData } from '@/server/projects';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vaultPath = searchParams.get('path');

    if (!vaultPath) {
      return NextResponse.json({ error: 'Vault path is required' }, { status: 400 });
    }

    const mindmap = getMindMapData(vaultPath);
    return NextResponse.json(mindmap);
  } catch (error) {
    console.error('Error in /api/vault/mindmap:', error);
    return NextResponse.json({ error: 'Failed to generate mind map' }, { status: 500 });
  }
}
