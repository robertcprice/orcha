import { NextResponse } from 'next/server';
import { searchVault } from '@/lib/obsidian';

export async function GET(request: Request) {

	try {

		const { searchParams } = new URL(request.url);
		const query = searchParams.get('q');
		const limit = searchParams.get('limit');

		if (!query) {

			return NextResponse.json(
				{ success: false, error: 'Query parameter "q" is required' },
				{ status: 400 }
			);
		}

		const results = await searchVault(query, limit ? parseInt(limit) : 20);

		return NextResponse.json({
			success: true,
			data: results,
			count: results.length,
			query,
		});

	} catch (error) {

		console.error('Error searching vault:', error);

		return NextResponse.json(
			{ success: false, error: 'Failed to search vault' },
			{ status: 500 }
		);
	}
}
