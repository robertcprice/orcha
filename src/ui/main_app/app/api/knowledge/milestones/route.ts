import { NextResponse } from 'next/server';
import { getMilestones } from '@/lib/obsidian';

export async function GET(request: Request) {

	try {

		const { searchParams } = new URL(request.url);
		const limit = searchParams.get('limit');

		const milestones = await getMilestones(limit ? parseInt(limit) : undefined);

		return NextResponse.json({
			success: true,
			data: milestones,
			count: milestones.length,
		});

	} catch (error) {

		console.error('Error fetching milestones:', error);

		return NextResponse.json(
			{ success: false, error: 'Failed to fetch milestones' },
			{ status: 500 }
		);
	}
}
