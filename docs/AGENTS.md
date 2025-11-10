# Repository Guidelines

This repo runs Smart Market Solutions' multi-agent orchestrator, pairing ChatGPT planning with Claude Code execution. Use these notes to keep Claude-driven workflows predictable.

## Project Structure & Module Organization
Core orchestration logic lives in `orchestrator/` (planning layer, manager agents, validators) with durable state under `orchestrator/state/`. Root scripts (`example_twitter_orchestration.py`, `run_orchestrator.sh`) kick off local runs. `web-ui/` hosts the Next.js dashboard. `tests/` houses pytest suites plus shell harnesses for multi-agent journeys, and `scripts/` covers helper automation. Update `agent_config.json` whenever agent roles or cost tracking rules shift so Claude stays aligned with the coordinator.

## Build, Test, and Development Commands
- `python example_twitter_orchestration.py --breakdown` generates the ChatGPT plan without invoking Claude.
- `./run_orchestrator.sh` launches the enhanced orchestrator; export `OPENAI_API_KEY` and keep the `claude` CLI on PATH.
- `pytest` or `pytest -k <pattern>` executes the Python battery configured via `pytest.ini`.
- `tests/test_enhanced_orchestration.sh` is the authoritative multi-agent regression and must pass before merging orchestrator changes.
- `cd web-ui && npm run dev|build|test` handles the dashboard (Next.js/TypeScript) workflows.

## Coding Style & Naming Conventions
Target Python 3.10+, 4-space indentation, and descriptive module names such as `*_agent.py`. Run `black . && isort .` before committing and keep type hints current; new orchestration APIs should add docstrings that clarify inputs and Claude outputs. Frontend code follows ESLint/Next defaults: PascalCase components, camelCase hooks, kebab-case assets, with `npm run lint` as the preflight.

## Testing Guidelines
Each new orchestrator behavior needs a pytest named `test_<feature>.py` under `tests/`; async flows should use `pytest.mark.asyncio` and mock Claude transcripts when possible. Maintain roughly 80% line coverage for novel modules and add shell harnesses beside existing `test_*.sh` scripts when reproducing multi-agent flows. For the dashboard, pair `npm run test` with targeted Playwright or websocket checks before shipping UI updates.

## Commit & Pull Request Guidelines
Commits follow Conventional Commits (`feat:`, `chore(logs):`, `test:`) as shown in `git log`; keep subjects imperative and under 72 characters with meaningful scope tags. Pull requests must describe the scenario, affected agents/modules, linked issues, and include evidence (pytest output, `tests/test_enhanced_orchestration.sh` logs, UI screenshots when relevant). Capture Claude execution summaries whenever the agent performs substantive work.

## Claude Agent & Configuration Notes
`agent_config.json` currently assigns DeepSeek as the primary coder with Claude as fallback executor/reviewer and Gemini for documentation; keep `enable_cost_tracking` true. Before running agent workflows, set `OPENAI_API_KEY`, verify `claude --print --dangerously-skip-permissions` accepts stdin, and document any model override in `orchestrator/planning_layer.py` so downstream managers inherit the same settings.
