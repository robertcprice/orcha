import { NextResponse } from 'next/server';
import { getKnowledgeGraph } from '@/lib/obsidian';

export async function GET() {

	try {

		const graph = await getKnowledgeGraph();

		return NextResponse.json({
			success: true,
			data: graph,
			stats: {
				nodes: graph.nodes.length,
				links: graph.links.length,
			},
		});

	} catch (error) {

		console.error('Error fetching knowledge graph:', error);

		return NextResponse.json(
			{ success: false, error: 'Failed to fetch knowledge graph' },
			{ status: 500 }
		);
	}
}
