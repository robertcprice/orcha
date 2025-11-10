import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from 'redis';
import { initDatabase, insertEvent, getFilterOptions, getRecentEvents, clearAllEvents, HookEvent } from './db';

type RawEvent = Record<string, any>;

// Map backend agent IDs to frontend node IDs
function normalizeAgentId(backendId: string | undefined): string {
  if (!backendId) return 'unknown';

  const idStr = String(backendId).toLowerCase();

  // Backend IDs like "deepseek-planner" → Frontend IDs like "planning-deepseek"
  if (idStr.includes('deepseek') && (idStr.includes('planner') || idStr.includes('reviewer'))) {
    return 'planning-deepseek';
  }
  if (idStr.includes('grok') && (idStr.includes('planner') || idStr.includes('reviewer'))) {
    return 'planning-grok';
  }
  if (idStr.includes('gemini') && (idStr.includes('planner') || idStr.includes('reviewer'))) {
    return 'planning-gemini';
  }
  if (idStr.includes('claude') && (idStr.includes('planner') || idStr.includes('reviewer'))) {
    return 'planning-claude';
  }
  if (idStr.includes('chatgpt') && (idStr.includes('planner') || idStr.includes('reviewer'))) {
    return 'planning-chatgpt';
  }
  if (idStr.includes('orchestrator') || idStr.includes('hybrid')) {
    return 'orchestrator-root';
  }

  // Return as-is if no mapping found
  return idStr;
}

function normalizeEvent(raw: RawEvent): HookEvent {
  const payload = raw.payload ?? raw;
  const data = payload.data ?? payload;

  const eventType =
    payload.hook_event_type ||
    payload.event_type ||
    payload.type ||
    data.event_type ||
    data.type ||
    'agent_event';

  const sourceApp =
    payload.source_app ||
    payload.actor ||
    data.source_app ||
    data.actor ||
    'orchestrator';

  // Get agent_id or ai_name and normalize it for frontend
  let rawAgentId = payload.agent_id || data.agent_id;

  // If no agent_id, try to construct one from ai_name
  if (!rawAgentId && payload.ai_name) {
    const aiName = String(payload.ai_name).toLowerCase();
    rawAgentId = `${aiName}-planner`; // Convert "Claude" → "claude-planner"
  }

  const normalizedAgentId = normalizeAgentId(rawAgentId);

  const sessionId =
    normalizedAgentId ||  // Use normalized agent ID first
    payload.session_id ||
    payload.task_id ||
    data.session_id ||
    data.task_id ||
    sourceApp;

  const timestampRaw = payload.timestamp || raw.timestamp || Date.now();
  const timestamp = typeof timestampRaw === 'string' ? Date.parse(timestampRaw) : Number(timestampRaw);

  // Add normalized agent_id to payload for frontend routing
  const enrichedPayload = {
    ...payload,
    agent_id: normalizedAgentId,  // Override with normalized ID
    original_agent_id: rawAgentId  // Keep original for debugging
  };

  return {
    source_app: String(sourceApp),
    session_id: String(sessionId ?? 'unknown'),
    hook_event_type: String(eventType),
    payload: enrichedPayload,
    chat: payload.chat,
    summary: payload.summary,
    timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
    model_name: payload.model_name || data.model_name || raw.model_name,
  };
}

// Initialize database
initDatabase();

// Create HTTP server
const server = createServer();

// Create WebSocket server with path option
const wss = new WebSocketServer({
  server,
  path: '/ws'
});

// Store connected clients
const clients = new Set<WebSocket>();

// Initialize Redis subscriber
const redisSubscriber = createClient({ url: 'redis://localhost:6379' });
const redisPublisher = createClient({ url: 'redis://localhost:6379' });

// Connect to Redis and subscribe to agent events
(async () => {
  try {
    await redisSubscriber.connect();
    await redisPublisher.connect();

    console.log('✅ Connected to Redis');

    // Subscribe to agent events channel
    await redisSubscriber.subscribe('algomind.agent.events', (message) => {
      try {
        const raw: RawEvent = JSON.parse(message);
        const hookEvent = normalizeEvent(raw);
        console.log(`📨 Received Redis event: ${hookEvent.hook_event_type} from ${hookEvent.source_app}`);

        const savedEvent = insertEvent(hookEvent);

        broadcastEvent({ ...hookEvent, id: savedEvent.id, timestamp: savedEvent.timestamp });
      } catch (error) {
        console.error('❌ Failed to process Redis message:', error);
      }
    });

    console.log('📡 Subscribed to Redis channel: algomind.agent.events');
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
  }
})();

// WebSocket connection handler
wss.on('connection', (ws: WebSocket) => {
  console.log('✅ New WebSocket client connected');
  clients.add(ws);

  // Send recent events to new client - but filter out old manager_started events
  const recentEvents = getRecentEvents(50);

  // Filter out duplicate manager_started events older than 5 seconds
  const now = Date.now();
  const filteredEvents = recentEvents.filter(event => {
    // Keep non-manager_started events
    if (event.hook_event_type !== 'manager_started') {
      return true;
    }
    // Only keep manager_started events from last 5 seconds
    const eventAge = now - event.timestamp;
    return eventAge < 5000; // 5 seconds
  });

  ws.send(JSON.stringify({ type: 'initial', data: filteredEvents }));

  // Handle client messages
  ws.on('message', (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('📩 Received message:', data.type);
    } catch (error) {
      console.error('❌ Failed to parse message:', error);
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log('❌ WebSocket client disconnected');
    clients.delete(ws);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    clients.delete(ws);
  });
});

// Broadcast event to all connected clients
function broadcastEvent(event: HookEvent) {
  const message = JSON.stringify({ type: 'event', data: event });
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error('❌ Failed to send to client:', error);
        clients.delete(client);
      }
    }
  });
}

// Create simple HTTP server for REST endpoints
server.on('request', (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url || '', `http://${req.headers.host}`);

  // POST /events - Receive new events
  if (url.pathname === '/events' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const event: HookEvent = JSON.parse(body);

        // Validate required fields
        if (!event.source_app || !event.session_id || !event.hook_event_type || !event.payload) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing required fields' }));
          return;
        }

        // Insert event into database
        const savedEvent = insertEvent(event);
        console.log(`📝 Saved event: ${event.hook_event_type} from ${event.source_app}`);

        // Broadcast to all WebSocket clients
        broadcastEvent(savedEvent);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(savedEvent));
      } catch (error) {
        console.error('❌ Error processing event:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  // GET /events/filter-options - Get available filter options
  if (url.pathname === '/events/filter-options' && req.method === 'GET') {
    const options = getFilterOptions();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(options));
    return;
  }

  // GET /events/recent - Get recent events
  if (url.pathname === '/events/recent' && req.method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const events = getRecentEvents(limit);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(events));
    return;
  }

  // DELETE /events/clear - Clear all events
  if (url.pathname === '/events/clear' && req.method === 'DELETE') {
    clearAllEvents();

    // Broadcast clear to all clients
    const message = JSON.stringify({ type: 'clear' });
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Default response
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Multi-Agent Orchestration Event Server');
});

// Start server
const PORT = Number(process.env.WEBSOCKET_SERVER_PORT || 4000);
server.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on http://localhost:${PORT}`);
  console.log(`📊 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`📮 POST events to: http://localhost:${PORT}/events`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down WebSocket server...');
  clients.forEach(client => client.close());

  try {
    await redisSubscriber.quit();
    await redisPublisher.quit();
    console.log('✅ Redis connections closed');
  } catch (error) {
    console.error('❌ Error closing Redis:', error);
  }

  server.close(() => {
    console.log('✅ WebSocket server closed');
    process.exit(0);
  });
});
