# Orchestration System - Web UI

A visual interface for the multi-agent orchestration system with real-time monitoring and task management.

## Overview

This web application provides a graphical user interface for the Orchestration System, featuring:

- **Real-time Agent Monitoring**: Live updates of manager agent activity (Database, Frontend, Backend, Infrastructure, Testing, Documentation)
- **Session Tracking**: Monitor active orchestration sessions with progress through 4 phases
- **Task Submission**: Submit complex development tasks through an intuitive web form
- **Event Streaming**: Server-Sent Events (SSE) for real-time updates from Redis pub/sub

## Architecture

The web UI integrates with the Orchestration-System's backend through:

1. **Redis Event Publishing**: The `enhanced_orchestrator.py` publishes events at key workflow points
2. **API Routes**: Next.js API routes expose agent status, task submission, and event streaming
3. **React Components**: Real-time UI components (adapted from AlgoMind-PPM) for monitoring
4. **SSE Connection**: Persistent connection to Redis for live event streaming

### Workflow Visualization

```
User Request (Web UI)
        ↓
    Task Submission API
        ↓
Enhanced Orchestrator ← Redis Event Publisher
    │                         ↓
    ├─ Phase 0: Planning      Redis Pub/Sub Channel
    ├─ Phase 1: Decomposition      ↓
    ├─ Phase 2: Execution      SSE Endpoint
    └─ Phase 3: Validation         ↓
        │                      Dashboard (Live Updates)
        ↓
    Results & Artifacts
```

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- **Redis** server running on `localhost:6379` (or configure via `REDIS_URL`)
- **OpenAI API Key** for GPT-4 task decomposition and validation

## Setup

### 1. Install Dependencies

```bash
cd web-ui
npm install
```

### 2. Start Redis Server

```bash
# Install Redis if not already installed
# macOS:
brew install redis

# Start Redis server
redis-server
```

### 3. Configure Environment Variables

Create a `.env.local` file in the `web-ui` directory:

```bash
# Redis connection URL
REDIS_URL=redis://localhost:6379/0

# Optional: Custom port for Next.js dev server (default: 3002)
PORT=3002
```

For the orchestrator (in parent directory), ensure you have:

```bash
# .env file in Orchestration-System root
OPENAI_API_KEY=your_openai_api_key_here
REDIS_URL=redis://localhost:6379/0
```

### 4. Start the Development Server

```bash
npm run dev
```

The web UI will be available at `http://localhost:3002`

## Usage

### Submitting a Task

1. Navigate to **Tasks** page
2. Fill in the task submission form:
   - **Title**: Short description (e.g., "Build a Twitter-like social media platform")
   - **Description**: Detailed requirements, tech stack, and features
   - **Priority**: low | normal | high | critical
3. Click **Submit Task**
4. The system will queue your task and begin orchestration

### Monitoring Execution

1. Navigate to **Dashboard** page
2. **Manager Agents** panel shows real-time agent activity:
   - Status (idle/processing/offline)
   - Current task
   - Tasks completed/in progress
3. **Active Sessions** panel displays:
   - Running orchestration sessions
   - Progress through 4 phases
   - Uptime and phase completion

### Understanding the Workflow

Each task goes through 4 phases:

1. **Planning Phase** (Phase 0)
   - Architectural analysis
   - Component identification (Frontend, Backend, Database, etc.)

2. **Task Decomposition** (Phase 1)
   - GPT-4 breaks down task into hyper-specific subtasks
   - Exact specifications for schemas, endpoints, components

3. **Manager-Coordinated Execution** (Phase 2)
   - Manager agents coordinate Claude agents
   - Parallel/sequential execution based on strategy
   - Real-time status updates

4. **Validation** (Phase 3)
   - GPT-4 validates work against requirements
   - Quality assessment and alignment score

## API Endpoints

### Task Submission
```http
POST /api/tasks/submit
Content-Type: application/json

{
  "title": "Build authentication system",
  "description": "Create JWT-based auth with login/logout",
  "priority": "high",
  "context": {
    "tech_stack": ["Next.js", "PostgreSQL"]
  }
}
```

### Task Status
```http
GET /api/tasks/status
GET /api/tasks/status?task_id=<uuid>
```

### Agent Status
```http
GET /api/agents
GET /api/agents?agent=database
```

### Event Stream (SSE)
```http
GET /api/sessions/stream
```

Returns Server-Sent Events in this format:
```javascript
data: {
  "ts": "2025-01-...",
  "actor": "Database Manager",
  "task_id": "uuid",
  "action": "manager_started",
  "status": "started",
  "meta": { ... }
}
```

## Real-Time Event Types

Events published by the orchestrator:

- `orchestrator_start` - Orchestration begins
- `planning_complete` - Architectural planning finished
- `task_decomposed` - Task breakdown complete
- `manager_started` - Manager agent begins work
- `manager_complete` - Manager agent finishes
- `agent_spawned` - Claude agent spawned
- `agent_complete` - Claude agent finishes
- `validation_start` - Validation phase begins
- `validation_complete` - Validation finished
- `orchestrator_complete` - Full orchestration done
- `error` - Error occurred

## Components

### AgentActivityMonitor
Displays real-time status of all manager agents:
- Database Manager
- Frontend Manager
- Backend Manager
- Infrastructure Manager
- Testing Manager
- Documentation Manager

### SessionMonitor
Shows active orchestration sessions with:
- Session uptime
- Current phase (0-4)
- Progress percentage
- Status indicator

### TaskSubmissionForm
Form interface for submitting new tasks with:
- Title and description inputs
- Priority selector
- Validation feedback
- Example task reference

## Development

### Project Structure
```
web-ui/
├── app/
│   ├── api/
│   │   ├── agents/route.ts          # Agent status API
│   │   ├── tasks/
│   │   │   ├── submit/route.ts      # Task submission
│   │   │   └── status/route.ts      # Task status
│   │   └── sessions/
│   │       └── stream/route.ts      # SSE event stream
│   ├── dashboard/page.tsx           # Main dashboard
│   ├── agents/page.tsx              # Agent management
│   ├── tasks/page.tsx               # Task submission
│   ├── layout.tsx                   # Root layout
│   ├── page.tsx                     # Homepage
│   └── globals.css                  # Global styles
├── components/
│   ├── AgentActivityMonitor.tsx     # Agent monitoring
│   ├── SessionMonitor.tsx           # Session tracking
│   └── TaskSubmissionForm.tsx       # Task submission
├── package.json
├── tsconfig.json
├── next.config.ts
└── tailwind.config.ts
```

### Running Tests
```bash
npm run lint
npm run build
```

### Production Build
```bash
npm run build
npm run start
```

## Troubleshooting

### Redis Connection Issues
- Ensure Redis server is running: `redis-cli ping` should return `PONG`
- Check `REDIS_URL` environment variable is set correctly
- Verify no firewall blocking port 6379

### No Events Appearing
- Check browser console for SSE connection errors
- Verify `enhanced_orchestrator.py` has Redis publisher integrated
- Ensure task is running (check `orchestrator/tasks/active/`)

### Port Conflicts
- Change port in `package.json`: `"dev": "next dev -p 3003"`
- Update any hardcoded port references

## Integration with Orchestration-System

The web UI is designed to work alongside the Python orchestration backend:

1. **Backend** (`../orchestrator/`):
   - `enhanced_orchestrator.py` - Main orchestrator with Redis events
   - `redis_publisher.py` - Event publisher module
   - `task_decomposer.py` - GPT-4 task breakdown
   - `manager_agents.py` - Domain-specific managers

2. **Web UI** (`web-ui/`):
   - Next.js frontend with React components
   - API routes for backend communication
   - SSE for real-time event streaming

Both systems communicate via:
- **Redis**: Pub/sub for real-time events
- **File System**: Shared task directories
- **API**: REST endpoints for status queries

## Contributing

When adding new features:

1. Update event types in `redis_publisher.py`
2. Handle new events in `components/AgentActivityMonitor.tsx` and `components/SessionMonitor.tsx`
3. Update API routes if needed
4. Test real-time event flow

## License

Part of the Orchestration-System project.

## Related Documentation

- [Enhanced Orchestrator Architecture](../ENHANCED_ARCHITECTURE.md)
- [Orchestration Quick Start](../ORCHESTRATION_QUICK_START.md)
- [Project README](../README.md)
