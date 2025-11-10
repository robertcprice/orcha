import { NextResponse } from 'next/server';
import { getExperiments } from '@/lib/obsidian';

export async function GET(request: Request) {

	try {

		const { searchParams } = new URL(request.url);
		const limit = searchParams.get('limit');

		const experiments = await getExperiments(limit ? parseInt(limit) : undefined);

		return NextResponse.json({
			success: true,
			data: experiments,
			count: experiments.length,
		});

	} catch (error) {

		console.error('Error fetching experiments:', error);

		return NextResponse.json(
			{ success: false, error: 'Failed to fetch experiments' },
			{ status: 500 }
		);
	}
}
