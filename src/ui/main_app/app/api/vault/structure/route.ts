import { NextResponse } from 'next/server';
import { getVaultStructure } from '@/server/projects';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vaultPath = searchParams.get('path');

    if (!vaultPath) {
      return NextResponse.json({ error: 'Vault path is required' }, { status: 400 });
    }

    const structure = getVaultStructure(vaultPath);

    if (!structure) {
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
    }

    return NextResponse.json(structure);
  } catch (error) {
    console.error('Error in /api/vault/structure:', error);
    return NextResponse.json({ error: 'Failed to read vault structure' }, { status: 500 });
  }
}
