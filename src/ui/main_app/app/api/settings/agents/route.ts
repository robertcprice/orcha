/**
 * Agent Settings API
 *
 * Manages agent configuration including primary coder, fallback chain,
 * and other orchestration settings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// Path to Python script for agent config management
const PYTHON_SCRIPT = path.join(process.cwd(), '..', 'orchestrator', 'agent_config.py');
const PROJECT_ROOT = path.join(process.cwd(), '..');

/**
 * GET /api/settings/agents
 *
 * Get current agent configuration
 */
export async function GET() {
  try {
    const { stdout, stderr } = await execAsync(
      `cd "${PROJECT_ROOT}" && python3 -c "
import sys
import json
sys.path.insert(0, '.')
from orchestrator.agent_config import get_agent_config
config = get_agent_config()
print(json.dumps(config.to_dict()))
"`,
      { maxBuffer: 1024 * 1024 }
    );

    if (stderr && stderr.trim()) {
      console.warn('Agent config stderr:', stderr);
    }

    const config = JSON.parse(stdout.trim());

    return NextResponse.json({
      success: true,
      config: config
    });
  } catch (error: any) {
    console.error('Failed to get agent config:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get agent configuration'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/agents
 *
 * Update agent configuration
 *
 * Body:
 * {
 *   "primary_coder": "codex" | "deepseek" | "claude" | "chatgpt",
 *   "fallback_chain": ["deepseek", "claude"],
 *   "review_agent": "claude",
 *   "max_retries_per_agent": 2,
 *   "enable_fallback": true
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.primary_coder) {
      return NextResponse.json(
        {
          success: false,
          error: 'primary_coder is required'
        },
        { status: 400 }
      );
    }

    // Validate primary_coder value
    const validCoders = ['codex', 'deepseek', 'claude', 'chatgpt'];
    if (!validCoders.includes(body.primary_coder)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid primary_coder. Must be one of: ${validCoders.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Validate fallback_chain if provided
    if (body.fallback_chain && !Array.isArray(body.fallback_chain)) {
      return NextResponse.json(
        {
          success: false,
          error: 'fallback_chain must be an array'
        },
        { status: 400 }
      );
    }

    // Update configuration via Python
    const configJson = JSON.stringify(body);
    const { stdout, stderr } = await execAsync(
      `cd "${PROJECT_ROOT}" && python3 -c "
import sys
import json
sys.path.insert(0, '.')
from orchestrator.agent_config import get_agent_config_manager, AgentConfiguration
from orchestrator.agent_config import CodingAgent

# Load config
manager = get_agent_config_manager()
config = manager.get_config()

# Update from JSON
data = json.loads('${configJson.replace(/'/g, "\\'")}')

if 'primary_coder' in data:
    config.primary_coder = CodingAgent(data['primary_coder'])

if 'fallback_chain' in data:
    config.fallback_chain = [CodingAgent(agent) for agent in data['fallback_chain']]

if 'review_agent' in data:
    config.review_agent = CodingAgent(data['review_agent'])

if 'max_retries_per_agent' in data:
    config.max_retries_per_agent = int(data['max_retries_per_agent'])

if 'enable_fallback' in data:
    config.enable_fallback = bool(data['enable_fallback'])

if 'enable_cost_tracking' in data:
    config.enable_cost_tracking = bool(data['enable_cost_tracking'])

# Save configuration
success = manager.save_config(config)

print(json.dumps({
    'success': success,
    'config': config.to_dict()
}))
"`,
      { maxBuffer: 1024 * 1024 }
    );

    if (stderr && stderr.trim()) {
      console.warn('Agent config update stderr:', stderr);
    }

    const result = JSON.parse(stdout.trim());

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to save configuration'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Agent configuration updated successfully',
      config: result.config
    });
  } catch (error: any) {
    console.error('Failed to update agent config:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update agent configuration'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/agents/costs
 *
 * Update cost estimates for agents
 *
 * Body:
 * {
 *   "codex": 0.002,
 *   "deepseek": 0.001,
 *   "claude": 0.010,
 *   "chatgpt": 0.003
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Update costs via Python
    const costsJson = JSON.stringify(body);
    const { stdout, stderr } = await execAsync(
      `cd "${PROJECT_ROOT}" && python3 -c "
import sys
import json
sys.path.insert(0, '.')
from orchestrator.agent_config import get_agent_config_manager

# Load config
manager = get_agent_config_manager()
config = manager.get_config()

# Update costs
costs_data = json.loads('${costsJson.replace(/'/g, "\\'")}')

for agent, cost in costs_data.items():
    if hasattr(config.costs, agent):
        setattr(config.costs, agent, float(cost))

# Save configuration
success = manager.save_config(config)

print(json.dumps({
    'success': success,
    'costs': {
        'codex': config.costs.codex,
        'deepseek': config.costs.deepseek,
        'claude': config.costs.claude,
        'chatgpt': config.costs.chatgpt,
        'gemini': config.costs.gemini,
        'grok': config.costs.grok
    }
}))
"`,
      { maxBuffer: 1024 * 1024 }
    );

    if (stderr && stderr.trim()) {
      console.warn('Cost update stderr:', stderr);
    }

    const result = JSON.parse(stdout.trim());

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to save cost configuration'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cost estimates updated successfully',
      costs: result.costs
    });
  } catch (error: any) {
    console.error('Failed to update costs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update cost estimates'
      },
      { status: 500 }
    );
  }
}
