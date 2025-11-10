import { NextResponse } from 'next/server';
import { readVaultFile } from '@/server/projects';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vaultPath = searchParams.get('vaultPath');
    const filePath = searchParams.get('filePath');

    if (!vaultPath || !filePath) {
      return NextResponse.json({ error: 'Both vaultPath and filePath are required' }, { status: 400 });
    }

    const content = readVaultFile(vaultPath, filePath);

    if (content === null) {
      return NextResponse.json({ error: 'File not found or cannot be read' }, { status: 404 });
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error in /api/vault/file:', error);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
