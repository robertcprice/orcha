import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // In a real implementation, fetch from database/Redis
    // For now, return mock events
    const mockEvents = [
      {
        id: 1,
        timestamp: new Date(Date.now() - 60000).toISOString(),
        source_app: "orchestrator",
        session_id: "sess-abc123",
        hook_event_type: "SessionStart",
        payload: { user: "system", task: "Initialize orchestration" }
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 45000).toISOString(),
        source_app: "database-manager",
        session_id: "sess-abc123",
        hook_event_type: "manager_started",
        payload: { manager: "DatabaseManager", task: "Setup database schema" }
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 30000).toISOString(),
        source_app: "frontend-manager",
        session_id: "sess-abc123",
        hook_event_type: "agent_spawned",
        payload: { agent: "FrontendAgent", task: "Build UI components" }
      },
      {
        id: 4,
        timestamp: new Date(Date.now() - 15000).toISOString(),
        source_app: "database-manager",
        session_id: "sess-abc123",
        hook_event_type: "manager_complete",
        payload: { manager: "DatabaseManager", status: "success", duration: "15s" }
      },
      {
        id: 5,
        timestamp: new Date(Date.now() - 5000).toISOString(),
        source_app: "backend-manager",
        session_id: "sess-abc123",
        hook_event_type: "task_assigned",
        payload: { task: "API endpoint creation", priority: "high" }
      },
    ];

    return NextResponse.json(mockEvents.slice(0, limit));
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
