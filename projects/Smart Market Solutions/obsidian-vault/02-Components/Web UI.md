---
title: Web UI
tags: [component, frontend, react, nextjs]
created: 2025-11-02
updated: 2025-11-02
type: component
status: active
tech_stack: [Next.js 14, React, TypeScript, TailwindCSS]
---

# Web UI

Modern React-based dashboard for monitoring and interacting with the AI Orchestration System.

## Overview

Built with Next.js 14, the Web UI provides a comprehensive interface for:

- Submitting tasks to agents
- Monitoring real-time session progress
- Browsing the [[Obsidian Vault]]
- Viewing agent states and metrics

## Key Pages

### Home Dashboard
- Task submission form
- Quick stats overview
- Recent sessions list

### Sessions Monitor
Real-time monitoring of agent sessions with:
- Live event streaming
- Terminal-style output
- Filtering by session ID

### Knowledge Vault
Browse the [[Obsidian Vault]] with:
- Tree view of all documents
- Search across content
- Document reader with wiki-links
- Graph visualization

### Agents Page
View registered agents and their capabilities.

## Design System

The UI uses a soft glass aesthetic with brown/blue color scheme:
- Taupe accents: #D2B48C, #C19A6B
- Sky blues: #3b82f6, #60a5fa
- High transparency (0.85)
- Rounded corners (12px)
- Subtle borders (1-2px)

## Related

- [[System Overview]]
- [[Redis Publisher]]
- [[Knowledge Vault]]
