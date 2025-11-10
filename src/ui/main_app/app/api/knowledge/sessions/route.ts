import { NextResponse } from 'next/server';
import { getSessions } from '@/lib/obsidian';

export async function GET(request: Request) {

	try {

		const { searchParams } = new URL(request.url);
		const limit = searchParams.get('limit');

		const sessions = await getSessions(limit ? parseInt(limit) : undefined);

		return NextResponse.json({
			success: true,
			data: sessions,
			count: sessions.length,
		});

	} catch (error) {

		console.error('Error fetching sessions:', error);

		return NextResponse.json(
			{ success: false, error: 'Failed to fetch sessions' },
			{ status: 500 }
		);
	}
}
