/**
 * API endpoint for serving planning data from CURRENT_PROJECT_STATUS.md
 */

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

interface Task {
  id: number;
  title: string;
  status: 'completed' | 'in_progress' | 'pending';
  details?: Record<string, string>;
  detailsList?: string[];
}

interface LatestIteration {
  iteration: number;
  timestamp: string;
  experiment: string;
  results: {
    train_f1: number;
    val_f1: number;
    test_f1: number;
  };
  decision: {
    type: string;
    priority: string;
    reasoning: string;
    next_steps: string[];
  };
}

export async function GET() {
  try {
    // Read the CURRENT_PROJECT_STATUS.md file
    const statusFilePath = path.join(
      process.cwd(),
      '..',
      'obsidian-vault',
      '00-Index',
      'CURRENT_PROJECT_STATUS.md'
    );

    const content = await readFile(statusFilePath, 'utf-8');

    // Parse the file to extract tasks and latest iteration
    const tasks = parseTasks(content);
    const latestIteration = parseLatestIteration(content);
    const metadata = parseMetadata(content);

    return NextResponse.json({
      ok: true,
      tasks,
      latestIteration,
      metadata,
    });
  } catch (error) {
    console.error('Failed to read CURRENT_PROJECT_STATUS.md:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to load planning data' },
      { status: 500 }
    );
  }
}

function parseMetadata(content: string) {
  const lastUpdatedMatch = content.match(/> \*\*Last Updated\*\*: ([^\n]+)/);
  const activeSessionsMatch = content.match(/> \*\*Active Sessions\*\*: ([^\n]+)/);
  const criticalTaskMatch = content.match(/> \*\*Critical Task\*\*: ([^\n]+)/);

  return {
    lastUpdated: lastUpdatedMatch ? lastUpdatedMatch[1].trim() : 'Unknown',
    activeSessions: activeSessionsMatch ? activeSessionsMatch[1].trim() : (criticalTaskMatch ? criticalTaskMatch[1].trim() : 'Unknown'),
  };
}

function parseTasks(content: string): Task[] {
  const tasks: Task[] = [];

  // Try parsing "Current Development Plan (Priority Order)" section with ### headings
  const startIdx = content.indexOf('## 📋 Current Development Plan (Priority Order)');

  if (startIdx !== -1) {
    // Extract section from heading to next ## heading or end of file
    const afterStart = content.substring(startIdx + 50); // Skip past the heading
    const nextSectionIdx = afterStart.search(/\n## /);
    const sectionText = nextSectionIdx === -1 ? afterStart : afterStart.substring(0, nextSectionIdx);

    // Split into task sections (everything between ### headings)
    const taskSections = sectionText.split(/(?=### \d+\.)/);

    for (const section of taskSections) {
      if (!section.trim()) continue;

      // Parse task heading
      const headingMatch = section.match(/### (\d+)\. (.*?)$/m);
      if (!headingMatch) continue;

      const [, number, titleLine] = headingMatch;

      let status: Task['status'] = 'pending';
      let title = titleLine.trim();

      // Determine status from emoji
      if (titleLine.includes('✅')) {
        status = 'completed';
        title = title.replace(/✅\s*/, '');
      } else if (titleLine.includes('🔄')) {
        status = 'in_progress';
        title = title.replace(/🔄\s*/, '');
      } else if (titleLine.includes('⏳')) {
        status = 'pending';
        title = title.replace(/⏳\s*/, '');
      }

      // Parse details (bullet points with **Key**: Value format)
      const details: Record<string, string> = {};
      const detailsList: string[] = [];

      const detailMatches = section.matchAll(/^- \*\*(.+?)\*\*: (.+)$/gm);
      for (const match of detailMatches) {
        const [, key, value] = match;
        details[key] = value.trim();
      }

      // Also capture plain bullet points (for nested lists)
      const plainBullets = section.matchAll(/^  - (.+)$/gm);
      for (const match of plainBullets) {
        detailsList.push(match[1].trim());
      }

      tasks.push({
        id: parseInt(number, 10),
        title: title.trim(),
        status,
        details: Object.keys(details).length > 0 ? details : undefined,
        detailsList: detailsList.length > 0 ? detailsList : undefined,
      });
    }
  }

  // Fallback: Try old "Progress" section format
  if (tasks.length === 0) {
    const progressSection = content.match(
      /\*\*Progress\*\* \((\d+)\/(\d+) core components complete - (\d+)%\):([\s\S]*?)(?=\n\n(?:✅|---|\*\*Files))/
    );

    if (progressSection) {
      const [, , , , tasksText] = progressSection;

      // Parse completed tasks (✅)
      const completedMatches = tasksText.matchAll(/✅ \*\*Completed\*\*:\n([\s\S]*?)(?=\n\n(?:✅|⏳|🔄|$))/g);
      for (const match of completedMatches) {
        const taskItems = match[1].match(/\d+\. (.+?)(?:\n|$)/g);
        if (taskItems) {
          for (const item of taskItems) {
            const taskMatch = item.match(/\d+\. (.+)/);
            if (taskMatch) {
              tasks.push({
                id: tasks.length + 1,
                title: taskMatch[1].trim(),
                status: 'completed',
              });
            }
          }
        }
      }

      // Parse in-progress tasks (🔄)
      const inProgressMatches = tasksText.matchAll(/🔄 (.+?)(?:\n|$)/g);
      for (const match of inProgressMatches) {
        tasks.push({
          id: tasks.length + 1,
          title: match[1].trim(),
          status: 'in_progress',
        });
      }

      // Parse remaining tasks (⏳)
      const remainingMatches = tasksText.matchAll(/⏳ (.+?)(?:\n|$)/g);
      for (const match of remainingMatches) {
        tasks.push({
          id: tasks.length + 1,
          title: match[1].trim(),
          status: 'pending',
        });
      }
    }
  }

  // Final fallback: Simple "Next Steps" format
  if (tasks.length === 0) {
    const nextStepsSection = content.match(/\*\*Next Steps\*\*:\n([\s\S]*?)(?=\n\n---)/);
    if (nextStepsSection) {
      const steps = nextStepsSection[1].match(/\d+\. (.+)/g);
      if (steps) {
        steps.forEach((step, index) => {
          const match = step.match(/\d+\. (.+)/);
          if (match) {
            tasks.push({
              id: index + 1,
              title: match[1].trim(),
              status: 'pending',
            });
          }
        });
      }
    }
  }

  return tasks;
}

function parseLatestIteration(content: string): LatestIteration | null {
  // Find the latest iteration section (search for the heading)
  const startIdx = content.indexOf('## 🤖 Latest Orchestration Iteration');
  if (startIdx === -1) {
    return null;
  }

  // Extract a reasonable chunk after the heading
  const sectionText = content.substring(startIdx, startIdx + 2000);

  // Parse iteration number
  const iterationMatch = sectionText.match(/\*\*Iteration\*\*: (\d+)/);
  const timestampMatch = sectionText.match(/\*\*Timestamp\*\*: ([^\n]+)/);
  const experimentMatch = sectionText.match(/\*\*Experiment\*\*: ([^\n]+)/);

  // Parse results
  const trainF1Match = sectionText.match(/- Train F1: ([\d.]+)/);
  const valF1Match = sectionText.match(/- Val F1: ([\d.]+)/);
  const testF1Match = sectionText.match(/- Test F1: ([\d.]+)/);

  // Parse decision
  const decisionMatch = sectionText.match(/- \*\*Decision\*\*: ([^\n]+)/);
  const priorityMatch = sectionText.match(/- \*\*Priority\*\*: ([^\n]+)/);
  const reasoningMatch = sectionText.match(/- \*\*Reasoning\*\*: ([^\n]+)/);

  // Parse next steps
  const nextStepsSection = sectionText.match(/### Next Steps\n([\s\S]*?)(?=\n---|\n##|$)/);
  const nextSteps: string[] = [];

  if (nextStepsSection) {
    const stepMatches = nextStepsSection[1].matchAll(/\d+\. (.+?)(?=\n\d+\.|\n*$)/g);
    for (const match of stepMatches) {
      nextSteps.push(match[1].trim());
    }
  }

  // Return null if we couldn't parse the essential fields
  if (!iterationMatch || !timestampMatch || !experimentMatch) {
    return null;
  }

  return {
    iteration: parseInt(iterationMatch[1], 10),
    timestamp: timestampMatch[1],
    experiment: experimentMatch[1],
    results: {
      train_f1: trainF1Match ? parseFloat(trainF1Match[1]) : 0,
      val_f1: valF1Match ? parseFloat(valF1Match[1]) : 0,
      test_f1: testF1Match ? parseFloat(testF1Match[1]) : 0,
    },
    decision: {
      type: decisionMatch ? decisionMatch[1] : 'unknown',
      priority: priorityMatch ? priorityMatch[1] : 'unknown',
      reasoning: reasoningMatch ? reasoningMatch[1] : '',
      next_steps: nextSteps,
    },
  };
}
