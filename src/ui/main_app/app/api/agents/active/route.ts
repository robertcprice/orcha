import { NextResponse } from 'next/server';
import { getRecentEvents } from '@/server/db';

export const dynamic = 'force-dynamic';

function inferSessionName(events: any[]): string {
  // Try to infer what the agent is working on from its events
  const toolUseEvents = events.filter(e => e.hook_event_type === 'PreToolUse');

  if (toolUseEvents.length === 0) return 'Claude Agent';

  // Look at the most common files or patterns
  const filesMentioned = new Set<string>();
  const commandsRun = new Set<string>();

  toolUseEvents.forEach(event => {
    try {
      const payload = event.payload;
      const input = payload.tool_input
        ? (typeof payload.tool_input === 'string' ? JSON.parse(payload.tool_input) : payload.tool_input)
        : {};

      if (input.file_path) {
        const fileName = input.file_path.split('/').pop() || input.file_path;
        filesMentioned.add(fileName);
      }
      if (input.command) {
        const cmd = input.command.split(' ')[0];
        commandsRun.add(cmd);
      }
    } catch {}
  });

  // Generate a descriptive name
  if (filesMentioned.size > 0) {
    const files = Array.from(filesMentioned).slice(0, 2);
    return files.length === 1
      ? `Working on ${files[0]}`
      : `Editing ${files.length} files`;
  }

  if (commandsRun.size > 0) {
    return `Running ${Array.from(commandsRun)[0]}`;
  }

  return `Claude Agent (${toolUseEvents.length} actions)`;
}

export async function GET() {
  try {
    // Get recent events to identify active sessions
    const events = getRecentEvents(200);

    // Group events by session_id to find active agent sessions
    const sessionMap = new Map<string, {
      sessionId: string;
      source: string;
      lastActivity: number;
      status: 'running' | 'completed' | 'idle';
      events: any[];
    }>();

    events.forEach((event) => {
      if (!event.session_id) return;

      const existing = sessionMap.get(event.session_id) || {
        sessionId: event.session_id,
        source: event.source_app || 'unknown',
        lastActivity: event.timestamp || 0,
        status: 'idle' as const,
        events: [],
      };

      // Update status based on event type
      if (event.hook_event_type === 'SessionStart' || event.hook_event_type === 'PreToolUse') {
        existing.status = 'running';
      } else if (event.hook_event_type === 'SessionEnd') {
        existing.status = 'completed';
      }

      existing.lastActivity = Math.max(existing.lastActivity, event.timestamp || 0);
      existing.events.push(event);

      sessionMap.set(event.session_id, existing);
    });

    // Filter to sessions with activity in last 10 minutes and infer names
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    const activeSessions = Array.from(sessionMap.values())
      .filter(session => session.lastActivity > tenMinutesAgo)
      .map(session => ({
        ...session,
        source: inferSessionName(session.events), // Replace generic source with inferred name
      }))
      .sort((a, b) => b.lastActivity - a.lastActivity);

    return NextResponse.json({
      ok: true,
      sessions: activeSessions,
      count: activeSessions.length,
    });
  } catch (error) {
    console.error('Error fetching active agents:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch active agents' },
      { status: 500 }
    );
  }
}
