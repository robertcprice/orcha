# Debug Skill

This skill implements the mandatory error resolution protocol from CLAUDE.md.

## When to Use This Skill

Use this skill when you encounter ANY error during development, testing, or debugging.

## Protocol

**CRITICAL**: Follow this protocol exactly. No exceptions.

### Attempt 1: Document + Try
1. Document the error in a temporary error log (or in your working notes)
2. Try ONE solution based on your knowledge
3. If using Playwright for browser automation issues, consider using the Playwright MCP server
4. Document the result

### Attempt 2: Update + Try Different Solution
1. Update your error documentation (note this is Attempt 2)
2. Try ONE different solution (NOT the same approach)
3. If browser/UI testing related, use Playwright MCP for automated testing
4. Document the second attempt

### Attempt 3: STOP and CONSULT EXTERNAL EXPERT
- **STOP trying random solutions**
- **MANDATORY**: Consult an external expert (ChatGPT-5, Hybrid orchestrator, or user)
- If you have access to the hybrid orchestrator, use it for complex architectural issues
- Update error documentation with expert recommendation
- Implement expert solution
- Document outcome

## Red Flags (Immediate Expert Consultation Required)

If ANY of these are true, **SKIP to expert consultation immediately**:
- Same error seen before in documentation
- Tried >2 different solutions without success
- Reducing same parameter repeatedly (batch size, learning rate, etc.)
- Stuck on problem for >30 minutes
- Error blocking critical work
- Browser automation failures (consider Playwright MCP first)

## Example: WRONG Approach

```
❌ Hit error → try fix A
❌ Error persists → try fix A again with slight variation
❌ Error persists → try fix A again
❌ Error persists → try random fix B
❌ Error persists → try fix A again
[Never consults expert, wastes hours]
```

## Example: CORRECT Approach

```
✅ Attempt 1: Hit error → Document → Try fix A → Fails
✅ Attempt 2: Update notes → Try fix B (different approach) → Fails
✅ Attempt 3: CONSULT EXPERT → Get expert solution
✅ Implement expert solution → Success
✅ Document resolution
```

## Playwright MCP Integration

When debugging browser/UI issues:
1. Use Playwright MCP server for automated browser testing
2. Create test scripts to reproduce the issue
3. Use Playwright's debugging tools (screenshots, video, traces)
4. If Playwright tests fail after 2 attempts, escalate to expert

## Expert Consultation Template

When consulting an expert (ChatGPT-5, Hybrid, or user):

```
I'm hitting [ERROR] and need expert guidance:

**Error Message**:
```
[full error with stack trace]
```

**What I've Tried** (2 failed attempts):
1. [Attempt 1 and why it failed]
2. [Attempt 2 and why it failed]

**Context**:
- Component/Module: [details]
- Environment: [browser, Node version, etc.]
- Configuration: [relevant settings]

**Questions**:
1. What is the root cause?
2. What is the PROPER fix (not workarounds)?
3. How can I prevent this in future?

I need the proper solution, not band-aids.
```

## Why This Protocol is MANDATORY

**Without this protocol**:
- Waste hours on solved problems
- Repeat documented mistakes
- Try same approach repeatedly
- Delay critical work
- Frustrate user

**With this protocol**:
- Quick resolution with expert help
- Learn from documented solutions
- Avoid repeating errors
- Make consistent progress

## Remember

"If you've tried twice and it didn't work, ASK FOR HELP."

Never try more than 2 different solutions before consulting an expert.
