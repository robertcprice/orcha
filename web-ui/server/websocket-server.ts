import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { initDatabase, insertEvent, getFilterOptions, getRecentEvents, clearAllEvents, HookEvent } from './db';

// Initialize database
initDatabase();

// Create HTTP server
const server = createServer();

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store connected clients
const clients = new Set<WebSocket>();

// WebSocket connection handler
wss.on('connection', (ws: WebSocket) => {
  console.log('✅ New WebSocket client connected');
  clients.add(ws);

  // Send recent events to new client
  const recentEvents = getRecentEvents(50);
  ws.send(JSON.stringify({ type: 'initial', data: recentEvents }));

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
const PORT = 4000;
server.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on http://localhost:${PORT}`);
  console.log(`📊 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`📮 POST events to: http://localhost:${PORT}/events`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down WebSocket server...');
  clients.forEach(client => client.close());
  server.close(() => {
    console.log('✅ WebSocket server closed');
    process.exit(0);
  });
});
