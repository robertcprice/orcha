import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PROJECTS_BASE = path.join(process.cwd(), "..", "projects");

/**
 * POST /api/projects/initialize
 *
 * Project initialization with ChatGPT dialogue.
 * Actions: start, continue, generate_readme, skip
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, projectName, action, messages } = body;

    if (!projectId || !projectName) {
      return NextResponse.json(
        { ok: false, error: "Missing projectId or projectName" },
        { status: 400 }
      );
    }

    const projectPath = path.join(PROJECTS_BASE, projectId);

    switch (action) {
      case "start":
        return await handleStart(projectName);

      case "continue":
        return await handleContinue(messages, projectName);

      case "generate_readme":
        return await handleGenerateReadme(messages, projectPath, projectName);

      case "skip":
        return await handleSkip(projectPath, projectName);

      default:
        return NextResponse.json(
          { ok: false, error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Project initialization error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to initialize project",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

async function handleStart(projectName: string) {
  const systemPrompt = `You are helping initialize a new project called "${projectName}".

Your goal is to gather enough information to create a comprehensive project README that will be used by AI agents (Claude Code and Codex) to build the project foundation.

Ask specific questions about:
1. User's expertise level (beginner, intermediate, expert)
2. Type of project (web app, mobile app, API, library, tool, game, etc.)
3. Main features and functionality they want
4. Tech stack preferences (or ask to recommend based on their needs)
5. UI/UX style preferences (if applicable)
6. Target platforms (web, iOS, Android, desktop, etc.)
7. Any specific requirements or constraints

Be conversational and friendly. Ask 2-3 questions at a time, not all at once.

When you have enough information to create a solid README (usually after 3-5 exchanges), respond with exactly:
"INITIALIZATION_COMPLETE: I have enough information to set up your project!"

This signals the system to generate the README.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `I want to create a new project called "${projectName}". Help me set it up.`,
      },
    ],
    temperature: 0.7,
  });

  const message = completion.choices[0].message.content || "";

  return NextResponse.json({
    ok: true,
    message,
    isComplete: false,
  });
}

async function handleContinue(
  messages: Array<{ role: string; content: string }>,
  projectName: string
) {
  const systemPrompt = `You are helping initialize a new project called "${projectName}".

Your goal is to gather enough information to create a comprehensive project README that will be used by AI agents (Claude Code and Codex) to build the project foundation.

Ask specific questions about:
1. User's expertise level (beginner, intermediate, expert)
2. Type of project (web app, mobile app, API, library, tool, game, etc.)
3. Main features and functionality they want
4. Tech stack preferences (or ask to recommend based on their needs)
5. UI/UX style preferences (if applicable)
6. Target platforms (web, iOS, Android, desktop, etc.)
7. Any specific requirements or constraints

Be conversational and friendly. Ask 2-3 questions at a time, not all at once.

When you have enough information to create a solid README (usually after 3-5 exchanges), respond with exactly:
"INITIALIZATION_COMPLETE: I have enough information to set up your project!"

This signals the system to generate the README.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
    ],
    temperature: 0.7,
  });

  const message = completion.choices[0].message.content || "";
  const isComplete = message.includes("INITIALIZATION_COMPLETE:");

  return NextResponse.json({
    ok: true,
    message: isComplete
      ? message.replace("INITIALIZATION_COMPLETE:", "").trim()
      : message,
    isComplete,
  });
}

async function handleGenerateReadme(
  messages: Array<{ role: string; content: string }>,
  projectPath: string,
  projectName: string
) {
  const systemPrompt = `You are creating a comprehensive project README based on a conversation with the user.

The README will be used by AI agents (Claude Code and Codex) to build the initial project structure and implement core functionality.

Create a detailed README that includes:

# ${projectName}

## Project Overview
[Brief description of the project]

## User Profile
- **Expertise Level**: [beginner/intermediate/expert]
- **Role**: [developer/designer/other]

## Project Type
[Web app/Mobile app/API/Library/Tool/Game/Other]

## Core Features
- Feature 1
- Feature 2
- Feature 3

## Tech Stack
### Frontend (if applicable)
- Framework: [React/Vue/Angular/other]
- Styling: [Tailwind/CSS/SASS/other]
- State Management: [Redux/Context/Zustand/other]

### Backend (if applicable)
- Runtime: [Node.js/Python/Go/other]
- Framework: [Express/FastAPI/other]
- Database: [PostgreSQL/MongoDB/other]

### Mobile (if applicable)
- Platform: [iOS/Android/Cross-platform]
- Framework: [React Native/Flutter/Native]

## UI/UX Requirements
- Design style: [Modern/Minimal/Playful/Professional/other]
- Color scheme: [if specified]
- Target audience: [if specified]

## Target Platforms
- [ ] Web
- [ ] iOS
- [ ] Android
- [ ] Desktop
- [ ] Other: [specify]

## Development Priorities
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

## Initial Setup Tasks
- [ ] Initialize project structure
- [ ] Set up development environment
- [ ] Install core dependencies
- [ ] Create basic file structure
- [ ] Set up routing (if applicable)
- [ ] Create initial components/modules

## Next Steps
[What should be implemented first]

---
*This README was generated from a project initialization dialogue and will be used by AI agents to build the project foundation.*

Base the content on the conversation history. Be specific and actionable.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      {
        role: "user",
        content:
          "Based on our conversation, please create a comprehensive README for this project.",
      },
    ],
    temperature: 0.7,
  });

  const readme = completion.choices[0].message.content || "";

  // Save README to project directory
  const readmePath = path.join(projectPath, "README.md");
  await fs.writeFile(readmePath, readme, "utf-8");

  console.log(`✓ README generated for project: ${projectName}`);

  return NextResponse.json({
    ok: true,
    readme,
  });
}

async function handleSkip(projectPath: string, projectName: string) {
  // Create minimal README
  const readme = `# ${projectName}

## Project Overview
This project was created using the Multi-Agent Orchestration System.

## Getting Started
This is a new project. The README will be populated as development progresses.

## Tech Stack
To be determined based on project requirements.

## Development
Initial setup and configuration pending.

---
*This is a minimal README. Use the project initialization dialogue for a more comprehensive setup.*
`;

  const readmePath = path.join(projectPath, "README.md");
  await fs.writeFile(readmePath, readme, "utf-8");

  console.log(`✓ Minimal README created for project: ${projectName}`);

  return NextResponse.json({
    ok: true,
    readme,
  });
}
