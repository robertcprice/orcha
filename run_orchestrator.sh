#!/bin/bash
# Quick wrapper for ChatGPT + Claude CLI orchestrator

set -e

cd "$(dirname "$0")"
source venv/bin/activate

# Default to gpt-5 (OpenAI's latest and best model as of August 2025)
REASONING_MODEL="${REASONING_MODEL:-gpt-5}"

echo "🤖 ChatGPT + Claude CLI Orchestrator"
echo "   Reasoning Model: $REASONING_MODEL"
echo ""

python orchestrator/chatgpt_claude_cli_orchestrator.py \
  --reasoning-model "$REASONING_MODEL" \
  "$@"
