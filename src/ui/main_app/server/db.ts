export interface HookEvent {
  id?: number;
  source_app: string;
  session_id: string;
  hook_event_type: string;
  payload: any;
  chat?: any;
  summary?: string;
  timestamp?: number;
  model_name?: string;
}

export interface FilterOptions {
  source_apps: string[];
  session_ids: string[];
  hook_event_types: string[];
}

// ✅ FIX: Use in-memory storage instead of better-sqlite3 (incompatible with Node.js 25)
let memoryEvents: HookEvent[] = [];
let nextId = 1;

export function initDatabase(): void {
  console.log('✅ Using in-memory event storage (better-sqlite3 disabled due to Node.js 25 compatibility)');
  memoryEvents = [];
  nextId = 1;
}

export function insertEvent(event: HookEvent): HookEvent {
  const timestamp = event.timestamp || Date.now();
  const newEvent: HookEvent = {
    ...event,
    id: nextId++,
    timestamp
  };

  memoryEvents.push(newEvent);

  // Keep only last 1000 events to prevent memory issues
  if (memoryEvents.length > 1000) {
    memoryEvents = memoryEvents.slice(-1000);
  }

  return newEvent;
}

export function getFilterOptions(): FilterOptions {
  const sourceAppsSet = new Set<string>();
  const sessionIdsSet = new Set<string>();
  const hookEventTypesSet = new Set<string>();

  memoryEvents.forEach(event => {
    sourceAppsSet.add(event.source_app);
    sessionIdsSet.add(event.session_id);
    hookEventTypesSet.add(event.hook_event_type);
  });

  return {
    source_apps: Array.from(sourceAppsSet).sort(),
    session_ids: Array.from(sessionIdsSet).slice(-100), // Last 100 sessions
    hook_event_types: Array.from(hookEventTypesSet).sort()
  };
}

export function getRecentEvents(limit: number = 100): HookEvent[] {
  return memoryEvents
    .slice(-limit)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .reverse();
}

export function getEventsBySession(sessionId: string, limit: number = 100): HookEvent[] {
  return memoryEvents
    .filter(e => e.session_id === sessionId)
    .slice(-limit)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .reverse();
}

export function clearAllEvents(): void {
  memoryEvents = [];
  nextId = 1;
  console.log('✅ All events cleared from memory');
}

export const db = null; // For backwards compatibility
