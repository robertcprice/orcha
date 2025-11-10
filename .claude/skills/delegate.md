# Task Delegation Skill

This skill enables delegating work to specialized subagents using the Codex MCP server.

## When to Use This Skill

Use this skill when:
- A task requires sustained focus and multiple steps
- Work can be parallelized across multiple agents
- A specialized agent would be more efficient than doing the work yourself
- You need to delegate implementation while you focus on planning/coordination

## Codex MCP Integration

The Codex MCP server provides the ability to create and manage subagents that can:
- Execute tasks autonomously
- Use tools and make decisions
- Report back results
- Work in parallel with other agents

## Delegation Process

### 1. Identify Delegatable Work

Good candidates for delegation:
- ✅ Implementation tasks with clear specifications
- ✅ Testing and validation work
- ✅ Code refactoring with defined scope
- ✅ Documentation generation
- ✅ Data processing tasks
- ✅ Multiple independent subtasks that can run in parallel

Poor candidates for delegation:
- ❌ High-level planning (you should do this)
- ❌ User interaction and clarification
- ❌ Tasks requiring coordination across multiple systems
- ❌ Very simple tasks (overhead not worth it)

### 2. Create Subagent via Codex MCP

When creating a subagent:

1. **Define clear objectives**: What should the agent accomplish?
2. **Specify constraints**: What should it NOT do?
3. **Provide context**: What files, systems, or patterns should it be aware of?
4. **Set success criteria**: How will you know it succeeded?

Example subagent creation:
```
Create a subagent to implement the user authentication feature:

**Objective**:
- Implement JWT-based authentication
- Create login/logout endpoints
- Add authentication middleware

**Constraints**:
- Do NOT modify existing user model
- Do NOT change database schema
- Follow existing API patterns in app/api/

**Context**:
- See app/api/projects/ for API pattern examples
- Use JWT library already in package.json
- Follow TypeScript strict mode

**Success Criteria**:
- All endpoints tested and working
- Middleware properly protects routes
- No TypeScript errors
- Tests pass
```

### 3. Monitor and Debug Subagent Work

After delegating:

1. **Monitor progress**: Check subagent status periodically
2. **Review code**: Examine what the subagent produced
3. **Debug if needed**: Use the **debug skill** on the subagent's code
4. **Iterate**: Provide feedback and request revisions if needed

### 4. Apply Debug Skill to Subagent Code

**CRITICAL**: When a subagent's code has errors:

1. **First**: Try to understand and fix simple issues yourself (Attempt 1)
2. **Second**: Try a different approach if first fix didn't work (Attempt 2)
3. **Third**: Use debug skill's expert consultation protocol (Attempt 3)
4. **Fourth**: If still stuck, ask the subagent to revise with specific feedback

### 5. Integration and Validation

After subagent completes:

1. **Review all changes**: Read the code produced
2. **Test thoroughly**: Run tests, manual verification
3. **Check integration**: Ensure it works with existing code
4. **Document**: Update relevant documentation
5. **Commit**: Create appropriate git commits

## Parallelization Strategy

When you have multiple independent tasks:

1. **Identify parallel work**: What can run simultaneously?
2. **Create multiple subagents**: One per independent task
3. **Set clear boundaries**: Ensure agents won't conflict
4. **Monitor all agents**: Track progress of all parallel work
5. **Integrate results**: Combine outputs when agents complete

Example parallel delegation:
```
Task: Build weather dashboard

Parallel subtasks:
1. Subagent A: Implement weather API integration
2. Subagent B: Build UI components for weather display
3. Subagent C: Create weather data caching layer
4. You: Design overall architecture and coordinate

These can run in parallel because:
- Each has clear API boundaries
- No shared file conflicts
- Independent testing possible
```

## Best Practices

### DO:
- ✅ Provide clear, detailed instructions
- ✅ Specify file locations and patterns to follow
- ✅ Set explicit success criteria
- ✅ Use debug skill on subagent output
- ✅ Review and test subagent work
- ✅ Parallelize independent work

### DON'T:
- ❌ Delegate without clear specifications
- ❌ Assume subagent knows project context
- ❌ Skip reviewing subagent code
- ❌ Let buggy subagent code through
- ❌ Parallelize dependent tasks
- ❌ Create too many agents (coordination overhead)

## Common Patterns

### Pattern 1: Feature Implementation
```
You: Plan feature architecture
Subagent: Implement based on your plan
You: Review, debug with debug skill, integrate
```

### Pattern 2: Parallel Testing
```
Subagent A: Write unit tests
Subagent B: Write integration tests
Subagent C: Write E2E tests with Playwright
You: Coordinate and run full test suite
```

### Pattern 3: Refactoring
```
You: Identify refactoring strategy
Subagent A: Refactor module 1
Subagent B: Refactor module 2
You: Review, fix issues with debug skill, verify integration
```

## Error Handling

If a subagent fails or produces buggy code:

1. **Apply debug skill**: Follow the 3-attempt protocol
2. **Provide specific feedback**: Tell subagent exactly what's wrong
3. **Request revision**: Ask subagent to fix specific issues
4. **Escalate if needed**: Consult expert if debug skill reaches attempt 3

## Remember

- **Delegation is not abdication**: You're still responsible for quality
- **Debug subagent output**: Always use debug skill on code produced
- **Clear specs prevent rework**: Time spent on clear instructions saves debugging time
- **Parallelize wisely**: Only parallelize truly independent work
- **Integrate carefully**: Test how subagent work fits with existing code
