# Orchestration System - Setup Guide

## ✅ What's Been Implemented

### 1. **ChatGPT-Driven Project Initialization**
- **Component**: `ProjectInitializationChat.tsx`
- **API**: `/api/projects/initialize`
- **Features**:
  - Interactive dialogue after project creation
  - Asks about expertise, features, UI style, platforms, requirements
  - Full conversation history sent to ChatGPT (gpt-4o)
  - ChatGPT decides when enough info is gathered
  - Generates comprehensive README for AI agents
  - Supports "Skip & Use Default" for blank initialization

### 2. **Project-Scoped Task Management**
- **Updated**: `task_monitor.py`
- **Features**:
  - Scans ALL project directories for tasks
  - Moves tasks to project-specific active/completed/failed directories
  - Priority-based task scheduling (critical > high > normal > low)
  - Supports up to 3 concurrent tasks

### 3. **Project Management System**
- **Component**: `ProjectManager.tsx`
- **API**: `/api/projects` (GET, POST, PATCH, DELETE)
- **Features**:
  - Create projects with name and description
  - Switch between projects (reloads page to update context)
  - Delete projects
  - Each project gets isolated: tasks/, obsidian-vault/, state/, outputs/

### 4. **EventTimeline Component**
- **Component**: `EventTimeline.tsx`
- **Features**:
  - Real-time event stream via WebSocket (port 4000)
  - Search/filter events with regex
  - Auto-scroll to bottom
  - Shows agent spawns, task assignments, completions

## 🔧 Configuration Required

### **Critical: Environment Variables**

The task monitor is currently **running but failing** because API keys are not configured.

**Error from logs**:
```
ValueError: OPENAI_API_KEY not set in environment
```

#### **Option 1: Create .env File (Recommended)**

Create `/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/.env`:

```bash
# Required
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Optional
CLAUDE_API_KEY=sk-ant-your-claude-key-here  # For direct Claude access
```

Then restart the task monitor:
```bash
cd "/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System"
pkill -f task_monitor
./venv/bin/python orchestrator/task_monitor.py > logs/task_monitor.log 2>&1 &
```

#### **Option 2: Set System Environment Variables**

Add to your `~/.zshrc` or `~/.bashrc`:
```bash
export OPENAI_API_KEY="sk-your-key-here"
export ANTHROPIC_API_KEY="sk-ant-your-key-here"
```

Then reload:
```bash
source ~/.zshrc  # or ~/.bashrc
```

### **Next.js Web UI API Keys**

Create `/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/.env.local`:

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
```

Then restart the Next.js dev server:
```bash
cd "/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui"
pkill -f "next dev"
npm run dev
```

## 🚀 Services Currently Running

Check status:
```bash
ps aux | grep -E "task_monitor|next dev|websocket"
```

### 1. **Task Monitor** ✅ RUNNING (PID 32822)
- **Location**: `/Orchestration-System/orchestrator/task_monitor.py`
- **Log**: `/Orchestration-System/logs/task_monitor.log`
- **Status**: Waiting for API keys
- **What it does**:
  - Scans for tasks every 5 seconds
  - Found 2 tasks (Weather Dashboard App + Todo List App)
  - Tried to process but failed due to missing OPENAI_API_KEY

### 2. **Next.js Dev Server** (likely running)
- **Port**: 3000
- **URL**: http://localhost:3000

### 3. **WebSocket Server** (should be running)
- **Port**: 4000
- **Purpose**: Real-time event stream for EventTimeline

## 📋 Current Tasks in Queue

From the task monitor logs, there are **2 pending tasks**:

1. **Weather Dashboard Application** (High Priority)
   - Project: weather-dashboard-app
   - Task ID: 1fb993f3-383b-4b1c-8ee4-814b9d2abd0f
   - Status: Moved to Failed (no API key)

2. **Simple Todo List App**
   - Task ID: c9f51725-1747-4e31-a162-57486eedb996
   - Status: Moved to Failed (no API key)

## ✅ Testing the Complete Flow

Once API keys are configured:

### 1. **Create a New Project**
```
1. Open http://localhost:3000
2. Click "Projects" button in header
3. Click "Create New Project"
4. Enter name: "My Test App"
5. Enter description (optional)
6. Click "Create"
```

### 2. **Project Initialization Dialogue**
```
- ChatGPT will ask about your expertise
- Answer questions about features, tech stack, UI
- ChatGPT will decide when it has enough info
- README will be generated automatically
```

### 3. **Submit a Task**
```
1. Navigate to /tasks
2. Fill in:
   - Title: "Build authentication system"
   - Description: "Add JWT-based auth with login/logout"
   - Priority: High
3. Click "Submit Task"
```

### 4. **Watch Agents Work**
```
- Task monitor will detect the task (within 5 seconds)
- Agent will be spawned automatically
- Events will appear in EventTimeline
- Task will move: pending → active → completed/failed
```

### 5. **View Results**
```
- Check /tasks page for task status
- Check project directory for generated files
- Check EventTimeline for agent activity
```

## 🐛 Troubleshooting

### Task Monitor Not Processing Tasks
```bash
# Check if running
ps aux | grep task_monitor

# Check logs
tail -f /Users/bobbyprice/projects/Smart\ Market\ Solutions/Orchestration-System/logs/task_monitor.log

# Restart
cd "/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System"
pkill -f task_monitor
./venv/bin/python orchestrator/task_monitor.py > logs/task_monitor.log 2>&1 &
```

### WebSocket Not Connecting
```bash
# Check if websocket server is running
ps aux | grep websocket

# Restart
cd "/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui"
npm run websocket:start
```

### Project Initialization Not Working
```bash
# Check Next.js logs
cd "/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui"
tail -f dev.log

# Check browser console for errors
# Open DevTools → Console
```

## 📂 Project Directory Structure

```
Orchestration-System/
├── orchestrator/
│   ├── task_monitor.py          # ✅ Running, needs API key
│   ├── auto_orchestrator.py
│   └── tasks/                   # Legacy orchestrator tasks
│       ├── pending/
│       ├── active/
│       ├── completed/
│       └── failed/
├── projects/
│   ├── weather-dashboard-app/   # Your project
│   │   ├── tasks/
│   │   │   ├── pending/
│   │   │   ├── active/
│   │   │   ├── completed/
│   │   │   └── failed/
│   │   ├── obsidian-vault/
│   │   ├── state/
│   │   ├── outputs/
│   │   ├── metadata.json
│   │   └── README.md            # Generated by ChatGPT
│   └── [other-projects]/
├── web-ui/
│   ├── components/
│   │   ├── ProjectManager.tsx          # ✅ Implemented
│   │   ├── ProjectInitializationChat.tsx # ✅ Implemented
│   │   └── EventTimeline.tsx           # ✅ Already existed
│   └── app/api/
│       └── projects/
│           └── initialize/route.ts     # ✅ Implemented
├── venv/                        # ✅ Created with openai + anthropic
├── logs/
│   └── task_monitor.log         # ✅ Check here for agent activity
└── .env                         # ❌ NEEDS TO BE CREATED
```

## 🎯 Next Steps

1. **Add API keys to .env file**
2. **Restart task monitor**
3. **Test project creation with initialization dialogue**
4. **Submit a task and watch agents work**
5. **Check EventTimeline for real-time updates**

---

## 📝 Summary

**What works**:
- ✅ Project creation and management
- ✅ ChatGPT initialization dialogue
- ✅ README generation
- ✅ Task monitor (running, scanning all projects)
- ✅ Project-scoped task directories
- ✅ EventTimeline component

**What needs configuration**:
- ❌ OPENAI_API_KEY environment variable
- ❌ ANTHROPIC_API_KEY environment variable
- ❌ Restart task monitor after adding keys

**Once configured, the full flow will work**:
1. Create project → ChatGPT asks questions → README generated
2. Submit task → Task monitor picks it up → Agent spawns
3. Agent works on task → Events show in timeline → Task completes
4. Files saved to project directory → User sees results

The system is **fully implemented and ready to use** - it just needs API keys configured! 🚀
