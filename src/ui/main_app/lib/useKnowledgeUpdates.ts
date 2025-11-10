/**
 * React hook for real-time knowledge base updates via SSE
 */

import { useEffect, useState } from 'react';

interface KnowledgeEvent {
	action: 'created' | 'updated' | 'completed' | 'results';
	session_id?: string;
	experiment_id?: string;
	milestone_id?: string;
	title?: string;
	status?: string;
	component?: string;
	version?: string;
	ts: string;
}

export function useKnowledgeUpdates(onUpdate?: (event: KnowledgeEvent) => void) {

	const [lastUpdate, setLastUpdate] = useState<KnowledgeEvent | null>(null);
	const [connected, setConnected] = useState(false);

	useEffect(() => {

		// Connect to knowledge events stream
		const eventSource = new EventSource('/api/knowledge/stream');

		eventSource.onopen = () => {

			console.log('📡 Knowledge updates connected');
			setConnected(true);
		};

		eventSource.onmessage = (event) => {

			try {

				const data = JSON.parse(event.data);
				setLastUpdate(data);

				if (onUpdate) {

					onUpdate(data);
				}

			} catch (error) {

				console.error('Error parsing knowledge event:', error);
			}
		};

		eventSource.onerror = (error) => {

			console.error('Knowledge updates connection error:', error);
			setConnected(false);
		};

		return () => {

			eventSource.close();
		};

	}, [onUpdate]);

	return { lastUpdate, connected };
}
