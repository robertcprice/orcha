import { NextResponse } from 'next/server';
import { getVaultStats } from '@/lib/obsidian';

export async function GET() {

	try {

		const stats = await getVaultStats();

		return NextResponse.json({
			success: true,
			data: stats,
		});

	} catch (error) {

		console.error('Error fetching vault stats:', error);

		return NextResponse.json(
			{ success: false, error: 'Failed to fetch vault stats' },
			{ status: 500 }
		);
	}
}
