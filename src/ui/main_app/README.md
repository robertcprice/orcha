# AI Agent Orchestration Console - Web UI

A next-generation visual interface for the multi-AI orchestration system with real-time monitoring, agent coordination, and knowledge management.

## Overview

The Orchestration Console provides a unified dashboard for managing complex AI-powered development workflows across multiple AI providers. Built with Next.js 15, React 18, and a custom dark-themed design system combining liquid glass morphism and neo-brutalist aesthetics.

### Key Features

- **Real-Time Agent Monitoring**: Live tracking of Claude Code, Codex MCP, Gemini, Grok, and ChatGPT sessions
- **6-Phase Orchestration**: Enrichment → Execution → Review → Refinement → Documentation → Finalization
- **Unified Dashboard**: Consolidated components with multiple view modes (cards, list, feed, terminal)
- **Knowledge Vault**: Browse and search Obsidian vault with agent sessions, experiments, and architecture docs
- **WebSocket Live Updates**: Real-time event streaming from orchestrator backend
- **Dark Glass UI**: Frosted translucent panels with backdrop blur + bold brutalist borders
- **Local Weather Intelligence**: Offline-capable weather search with cached climate baselines, multi-day forecasts, and historical context

## Architecture

The web UI integrates with the hybrid orchestration backend through multiple channels:

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      WEB UI (Next.js 15)                        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Dashboard  │  │ Live Monitor │  │ Knowledge    │        │
│  │   Homepage   │  │   (ws:4000)  │  │    Vault     │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                  │                  │                 │
│  ┌──────┴──────────────────┴──────────────────┴────────┐      │
│  │          Unified Components Layer                     │      │
│  │  • UnifiedAgentDashboard (4 view modes)              │      │
│  │  • TaskOrchestrationPanel (5 agent types)            │      │
│  │  • LiveMonitorDashboard (WebSocket connection)       │      │
│  │  • VaultBrowser (file tree + search + reader)        │      │
│  └───────────────────────────┬───────────────────────────┘      │
│                              │                                  │
│  ┌───────────────────────────┴───────────────────────────┐    │
│  │              API Routes (Next.js)                      │    │
│  │  /api/agents  /api/sessions  /api/tasks               │    │
│  │  /api/obsidian  /api/hybrid-orchestrator              │    │
│  └───────────────────────────┬───────────────────────────┘    │
└────────────────────────────────┼──────────────────────────────┘
                                 │
    ┌────────────────────────────┼────────────────────────────┐
    │                            │                            │
    ▼                            ▼                            ▼
┌─────────┐              ┌──────────────┐          ┌─────────────┐
│  Redis  │◄─────────────┤   Hybrid     │          │  Obsidian   │
│ Pub/Sub │              │ Orchestrator │          │    Vault    │
└─────────┘              │   (Python)   │          └─────────────┘
                         └──────────────┘
                         6-Phase System:
                         • Enrichment
                         • Execution
                         • Review
                         • Refinement
                         • Documentation
                         • Finalization
```

### Data Flow

1. **Task Submission**: User submits task via TaskOrchestrationPanel
2. **Orchestration**: Hybrid orchestrator executes 6-phase workflow
3. **Event Publishing**: Redis pub/sub broadcasts events to WebSocket server
4. **Live Updates**: WebSocket (ws://localhost:4000) streams to LiveMonitorDashboard
5. **Agent Tracking**: UnifiedAgentDashboard polls /api/agents for session data
6. **Knowledge Storage**: Completed sessions stored in Obsidian vault

### Weather Intelligence Module

The weather dashboard runs fully offline using simulated climate baselines:

- `/api/weather` synthesizes current conditions, five-day forecasts, and recent history with a five-minute cache
- `/api/weather/search` provides case-insensitive lookup with curated fallbacks for agent-friendly defaults
- `lib/weather/service.ts` manages nearest-city resolution, unit conversion, and cache controls
- Node.js tests live in `tests/unit/weather-service.test.ts` and `tests/integration/weather-api.test.ts`

## Pages

### 1. Dashboard (`/`)
**Main landing page with unified console**

- 2-column layout: Task submission (left) + Agent dashboard (right)
- TaskOrchestrationPanel in compact mode
- UnifiedAgentDashboard with cards view
- System statistics overview
- Quick start guide

### 2. Live Monitor (`/monitor`)
**Real-time agent event streaming**

- LiveMonitorDashboard with split view (feed + terminal)
- WebSocket connection to ws://localhost:4000
- Session filtering and event type filtering
- Live statistics: events/sec, active sessions, event counts
- Auto-scrolling feed and terminal output

### 3. Agents (`/agents`)
**Agent session tracking and history**

- UnifiedAgentDashboard with cards view
- 4 view modes: Cards, List, Feed, Terminal
- Filter by agent type, phase, date range
- Session metrics and phase indicators
- Event type legend (SessionStart, PreToolUse, PostToolUse, SessionEnd)

### 4. Tasks (`/tasks`)
**Task management and submission**

- Task history with status tracking
- Completed/active/failed task filtering
- Task detail view with artifacts
- Task resubmission and cancellation

### 5. Knowledge Vault (`/vault`)
**Obsidian vault browser**

- VaultBrowser component with 3 modes: Tree, Search, Reader
- Hierarchical file tree navigation
- Full-text search with context highlighting
- Markdown reader with frontmatter display
- Wiki-link tracking and statistics
- Vault structure:
  - 01-Architecture: System design docs
  - 02-Components: Code components
  - 03-Experiments: A/B tests & trials
  - 04-Decisions: ADRs & architectural choices
  - 05-Agent-Sessions: AI session logs
  - 09-Milestones: Major achievements

### 6. Settings (`/settings`)
**System configuration**

- API key management
- Orchestrator preferences
- UI theme customization
- WebSocket connection settings

## Components

### Consolidated Components (Phase 2)

#### UnifiedAgentDashboard
**Consolidates 5 legacy components**: SessionMonitor, LiveAgentCard, AgentFeed, AgentTerminal, IndividualAgentMonitor

**Features**:
- 4 view modes: Cards (grid overview), List (compact), Feed (event stream), Terminal (log output)
- Real-time updates with configurable refresh intervals
- Metrics dashboard with session counts, event counts, tool usage
- Phase tracking (6-phase system visualization)
- Agent type filtering (Claude Code, Codex, Gemini, Grok, ChatGPT)
- Auto-scroll for feed and terminal views

#### TaskOrchestrationPanel
**Consolidates 3 legacy components**: HybridOrchestratorPanel, DirectClaudePanel, TaskSubmissionForm

**Features**:
- 5 agent type selectors: Hybrid, Claude, Codex, Gemini, ChatGPT
- Visual agent picker with color-coded cards
- Task submission with validation
- Live status tracking with phase indicators
- Terminal output view (optional)
- Compact mode for dashboard integration

#### LiveMonitorDashboard
**Consolidates 3 legacy components**: AgentFeed, AgentTerminal, SessionSplitView

**Features**:
- 3 view modes: Split (feed + terminal), Feed only, Terminal only
- WebSocket real-time connection (ws://localhost:4000)
- Session filtering (all sessions or specific session ID)
- Event type filtering
- Live statistics dashboard
- Auto-reconnect on connection loss

#### VaultBrowser
**New component for Obsidian vault browsing**

**Features**:
- 3 view modes: Tree (file browser), Search (full-text), Reader (markdown viewer)
- Hierarchical file tree with expand/collapse
- Full-text search with relevance scoring
- Markdown reader with frontmatter metadata
- Wiki-link tracking and display
- Tag filtering and frontmatter extraction

### Design System Components

#### GlassPanel
Liquid glass panel with frosted backdrop blur, configurable opacity, and optional borders.

#### BrutalistButton
Bold button component with thick borders, no border-radius, and stark contrasts. Variants: primary (cyan), secondary (white), accent (magenta).

#### GlassInput
Glass-styled input field with focus effects and validation states.

#### MetricCard
Statistics card with icon, value, label, and trend indicator.

#### PhaseIndicator
6-phase workflow visualizer with progress tracking.

## Design System

### Color Palette

**Backgrounds**: `#0a0a0a` (primary), `#1a1a1a` (secondary), `#0f0f0f` (tertiary)

**Accents**:
- Cyan: `#00ffff`
- Magenta: `#ff00ff`
- Yellow: `#ffff00`
- Green: `#00ff00`

**Agent Colors**:
- Claude: `#8b5cf6` (purple)
- Codex: `#3b82f6` (blue)
- ChatGPT: `#10b981` (green)
- Deepseek: `#ef4444` (red)
- Grok: `#f59e0b` (orange)
- Gemini: `#06b6d4` (cyan)

### Typography

- **Headers**: Rajdhani (bold, uppercase for emphasis)
- **Body/Mono**: Share Tech Mono (monospace for technical content)

### Effects

- **Glass Morphism**: `backdrop-filter: blur(20px)`, `rgba(26, 26, 26, 0.7)`
- **Neo-Brutalism**: `border: 4px solid`, `border-radius: 0px`
- **Glow Effects**: `box-shadow: 0 0 20px rgba(0, 255, 255, 0.3)`

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+ (for orchestrator backend)
- **Redis** server (for event pub/sub)
- **WebSocket Server** on port 4000 (for live monitoring)
- **Obsidian Vault** (optional, for knowledge management)

## Setup

### 1. Install Dependencies

```bash
cd web-ui
npm install
```

### 2. Environment Variables

Create `.env.local` in the `web-ui` directory:

```bash
# Redis connection
REDIS_URL=redis://localhost:6379/0

# WebSocket server (optional, defaults to ws://localhost:4000)
WEBSOCKET_URL=ws://localhost:4000

# Next.js port (optional, defaults to 3002)
PORT=3002
```

### 3. Start Services

```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start WebSocket server (if using live monitoring)
cd .. && python websocket_server.py

# Terminal 3: Start Next.js dev server
cd web-ui && npm run dev
```

The web UI will be available at `http://localhost:3002`

## Development

### Project Structure

```
web-ui/
├── app/
│   ├── api/                      # API Routes
│   │   ├── agents/               # Agent status endpoints
│   │   ├── sessions/             # Session management
│   │   ├── tasks/                # Task submission & status
│   │   ├── obsidian/             # Vault API (files, search, read, graph)
│   │   ├── hybrid-orchestrator/  # Orchestrator integration
│   │   └── stats/                # System statistics
│   ├── page.tsx                  # Dashboard homepage
│   ├── monitor/page.tsx          # Live monitor page
│   ├── agents/page.tsx           # Agent sessions page
│   ├── tasks/page.tsx            # Task management page
│   ├── vault/page.tsx            # Knowledge vault page
│   ├── settings/page.tsx         # Settings page
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── components/
│   ├── design-system/            # Design system components
│   │   ├── GlassPanel.tsx
│   │   ├── BrutalistButton.tsx
│   │   ├── GlassInput.tsx
│   │   ├── MetricCard.tsx
│   │   ├── PhaseIndicator.tsx
│   │   └── index.ts
│   ├── UnifiedAgentDashboard.tsx # Consolidated agent dashboard
│   ├── TaskOrchestrationPanel.tsx# Consolidated task submission
│   ├── LiveMonitorDashboard.tsx  # Consolidated live monitoring
│   ├── VaultBrowser.tsx          # Obsidian vault browser
│   ├── StatsOverview.tsx         # System statistics
│   ├── SessionMonitor.tsx        # Legacy (to be deprecated)
│   └── ColorPicker.tsx           # Utility component
├── lib/
│   ├── obsidian.ts               # Obsidian vault utilities
│   └── redis.ts                  # Redis client utilities
├── styles/
│   └── design-tokens.ts          # Design system tokens
├── server/
│   └── projects.ts               # Project management utilities
├── package.json
├── tsconfig.json
├── next.config.ts
└── tailwind.config.ts
```

### Running Tests

```bash
# TypeScript compilation
npx tsc --noEmit

# Linting
npm run lint

# Production build
npm run build
```

### Adding New Components

1. Use design system components from `@/components/design-system`
2. Import design tokens: `import { designTokens } from '@/styles/design-tokens'`
3. Follow naming convention: `ComponentName.tsx`
4. Export from appropriate index file

## API Endpoints

### Agents

```http
GET /api/agents/active
# Returns list of active agent sessions

GET /api/agents/unified-logs
# Returns consolidated event logs from all agents
```

### Sessions

```http
GET /api/sessions/stream
# Server-Sent Events (SSE) stream for legacy compatibility

# Note: Modern implementation uses WebSocket (ws://localhost:4000)
```

### Tasks

```http
POST /api/hybrid-orchestrator/submit
Content-Type: application/json

{
  "task_title": "Build authentication system",
  "task_description": "Create JWT-based auth with login/logout",
  "agent_type": "hybrid"
}

GET /api/hybrid-orchestrator/status/:taskId
# Returns task status and progress
```

### Obsidian Vault

```http
GET /api/obsidian/files
# Returns hierarchical file tree

GET /api/obsidian/search?q=query
# Full-text search with context

GET /api/obsidian/read?path=relative/path.md
# Read individual note with frontmatter

GET /api/obsidian/graph
# Returns knowledge graph connections
```

## WebSocket Events

The live monitoring system uses WebSocket (ws://localhost:4000) for real-time updates.

### Event Types

**Connection Events**:
- `initial` - Initial data on connection
- `event` - New event from orchestrator

**Agent Events**:
- `SessionStart` - Agent session begins
- `PreToolUse` - Before tool execution
- `PostToolUse` - After tool execution
- `SessionEnd` - Agent session complete

**Event Structure**:
```typescript
{
  type: 'event',
  sessionId: string,
  agentName: string,
  eventType: 'SessionStart' | 'PreToolUse' | 'PostToolUse' | 'SessionEnd',
  timestamp: string,
  data: {
    thinking?: string,
    tool?: string,
    result?: string,
    phase?: number,
    // ... additional metadata
  }
}
```

## Troubleshooting

### Connection Issues

**Redis not connecting**:
```bash
# Check Redis is running
redis-cli ping
# Should return PONG

# Check Redis URL
echo $REDIS_URL
```

**WebSocket connection failing**:
- Ensure WebSocket server is running on port 4000
- Check firewall settings
- Verify `WEBSOCKET_URL` in `.env.local`

**No live updates appearing**:
- Check browser console for WebSocket errors
- Verify orchestrator is publishing events to Redis
- Check WebSocket server logs

### Build Errors

**TypeScript errors**:
```bash
# Clean Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check for type errors
npx tsc --noEmit
```

**Port already in use**:
```bash
# Find process using port 3002
lsof -i :3002

# Kill process
kill -9 <PID>

# Or use different port
npm run dev -- -p 3003
```

## Performance Notes

- **Polling Intervals**: UnifiedAgentDashboard polls every 3-5 seconds (configurable)
- **WebSocket Auto-Reconnect**: 5-second delay with exponential backoff
- **Event Buffering**: LiveMonitorDashboard buffers up to 500 events (configurable)
- **API Caching**: Obsidian file tree cached for 5 minutes
- **Search Optimization**: Vault search limits to 20 results by default

## Migration from Legacy

The redesign consolidates 10+ legacy components into 4 unified components:

**Consolidated**:
- SessionMonitor, LiveAgentCard, AgentFeed, AgentTerminal, IndividualAgentMonitor → **UnifiedAgentDashboard**
- HybridOrchestratorPanel, DirectClaudePanel, TaskSubmissionForm → **TaskOrchestrationPanel**
- AgentFeed, AgentTerminal, SessionSplitView → **LiveMonitorDashboard**

**Removed**:
- Task Tracker feature (page, components, lib)
- Legacy orchestrators V4/V5 (archived)

**New**:
- VaultBrowser for Obsidian knowledge management
- Design system with design tokens
- 6-phase workflow visualization

## Contributing

When adding new features:

1. **Use Design System**: Import components from `@/components/design-system`
2. **Follow Design Tokens**: Use `designTokens` for colors, spacing, typography
3. **Update API Routes**: Add new endpoints to appropriate `/api` directory
4. **Document Events**: Update WebSocket event types if adding new events
5. **Test Components**: Verify TypeScript compilation and HTTP responses

## License

Part of the Orchestration-System project.

## Related Documentation

- [Hybrid Orchestrator V3](../HYBRID_ORCHESTRATOR_V3.md)
- [Multi-AI Research](../MULTI_AI_RESEARCH.md)
- [Streaming Integration](../STREAMING_INTEGRATION.md)
- [Project README](../README.md)
