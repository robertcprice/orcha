# Task Planning Skill

This skill ensures proper task planning with focus on parallelization and delegation opportunities.

## When to Use This Skill

**AUTOMATIC TRIGGER**: Use this skill when the user asks you to perform ANY action that involves:
- Multiple steps or subtasks
- Code implementation requiring design decisions
- Coordination across multiple files or systems
- Work that could benefit from parallelization
- Tasks that might be delegatable to subagents

**IMPORTANT**: If the user hasn't already enabled plan mode, you should proactively enter planning mode for complex tasks.

## Planning Process

### 1. Understand the Request

Before planning:
- ✅ Clarify ambiguous requirements with user
- ✅ Identify core objectives
- ✅ Understand constraints and dependencies
- ✅ Determine success criteria

### 2. Break Down the Task

Decompose the work into:

1. **High-level phases** (sequential)
2. **Tasks within each phase** (potentially parallel)
3. **Dependencies** between tasks
4. **Delegation opportunities** (what can subagents do?)

### 3. Identify Parallelization Opportunities

For each task, ask:
- Can this run simultaneously with other tasks?
- Are there file conflicts if run in parallel?
- Are there data dependencies blocking parallelization?
- Would parallel execution save significant time?

#### Good Parallelization Candidates:
- ✅ Independent file modifications
- ✅ Multiple API endpoints/routes
- ✅ Separate UI components
- ✅ Different test suites
- ✅ Documentation for different modules
- ✅ Data processing on separate datasets

#### Poor Parallelization Candidates:
- ❌ Tasks modifying the same file
- ❌ Tasks with data dependencies (A needs B's output)
- ❌ Tasks requiring sequential coordination
- ❌ Tasks sharing mutable state

### 4. Identify Delegation Opportunities

For each task, evaluate:

**Delegate to subagent if**:
- Clear specifications can be written
- Success criteria are measurable
- Task is substantial (>30 min of work)
- You can review/debug the output

**Keep yourself if**:
- Requires user interaction/clarification
- Needs high-level architectural decisions
- Very simple (<10 min of work)
- Requires coordination across systems

### 5. Create the Plan

Your plan should include:

```markdown
## Objective
[Clear statement of what we're building/fixing]

## Phases

### Phase 1: [Name]
**Why**: [Rationale for this phase]

**Tasks**:
1. [Task 1] - **[SELF/DELEGATE]** - **[SERIAL/PARALLEL with #X]**
   - Success criteria: [...]
   - Dependencies: [None / Needs #X]

2. [Task 2] - **[SELF/DELEGATE]** - **[PARALLEL with #1]**
   - Success criteria: [...]
   - Dependencies: [None]

### Phase 2: [Name]
**Why**: [Rationale]
**Blocks on**: Phase 1 completion

**Tasks**:
[...]

## Parallelization Strategy

**Parallel Groups**:
- Group A (parallel): Tasks #1, #2, #3
- Group B (parallel): Tasks #5, #6
- Serial dependencies: #4 → Group B

## Delegation Strategy

**Subagent A**: Tasks #1, #2
- Objective: [...]
- Context: [...]
- Success: [...]

**Subagent B**: Task #5
- Objective: [...]
- Context: [...]
- Success: [...]

**Self**: Tasks #4, #6, #7 (coordination, planning, review)

## Risk Assessment

- **Risk 1**: [What could go wrong]
  - Mitigation: [How to prevent/handle]

- **Risk 2**: [...]
  - Mitigation: [...]

## Success Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] All tests pass
- [ ] No TypeScript/linting errors
- [ ] Documentation updated
```

### 6. Present Plan to User

Before execution:
1. Present the complete plan
2. Highlight parallelization opportunities
3. Explain delegation strategy
4. Ask for user approval or feedback
5. Adjust based on user input

## Planning Templates

### Template 1: Feature Implementation

```markdown
## Feature: [Name]

### Phase 1: Design & Setup
**Tasks**:
1. Design data models - SELF - SERIAL
2. Design API contracts - SELF - SERIAL
3. Update TypeScript types - DELEGATE - PARALLEL with #2

### Phase 2: Implementation (Parallel)
**Tasks**:
4. Backend API endpoints - DELEGATE (Subagent A)
5. Frontend components - DELEGATE (Subagent B)
6. Database migrations - SELF

### Phase 3: Integration & Testing
**Tasks**:
7. Integration testing - DELEGATE (Subagent C)
8. Review & debug - SELF (using debug skill)
9. Documentation - DELEGATE (Subagent D) - PARALLEL with #7

**Parallelization**: Phase 2 tasks can all run in parallel
**Delegation**: 4 subagents handling implementation, you coordinate
```

### Template 2: Bug Fix

```markdown
## Bug Fix: [Description]

### Phase 1: Investigation
**Tasks**:
1. Reproduce bug - SELF
2. Identify root cause - SELF (use debug skill)
3. Review related code - SELF

### Phase 2: Fix Implementation
**Tasks**:
4. Implement fix - SELF or DELEGATE (depending on complexity)
5. Add regression test - DELEGATE
6. Update documentation - DELEGATE - PARALLEL with #5

### Phase 3: Validation
**Tasks**:
7. Test fix - SELF
8. Code review - SELF
```

### Template 3: Refactoring

```markdown
## Refactoring: [Scope]

### Phase 1: Planning
**Tasks**:
1. Identify refactoring targets - SELF
2. Define new architecture - SELF
3. Create migration checklist - SELF

### Phase 2: Parallel Refactoring
**Tasks**:
4. Refactor module A - DELEGATE (Subagent A)
5. Refactor module B - DELEGATE (Subagent B)
6. Refactor module C - DELEGATE (Subagent C)
7. Update shared types - SELF (coordinate between modules)

### Phase 3: Integration
**Tasks**:
8. Review all changes - SELF (use debug skill on each)
9. Integration testing - DELEGATE
10. Performance testing - DELEGATE - PARALLEL with #9

**Parallelization**: All module refactoring in parallel, then parallel testing
**Coordination**: You handle shared types and dependencies
```

## Best Practices

### DO:
- ✅ Enter plan mode for complex tasks
- ✅ Identify parallelization opportunities explicitly
- ✅ Mark tasks as SELF/DELEGATE clearly
- ✅ Document dependencies between tasks
- ✅ Create success criteria for each phase
- ✅ Consider risk and mitigation
- ✅ Present plan before execution

### DON'T:
- ❌ Start coding before planning complex tasks
- ❌ Miss parallelization opportunities
- ❌ Delegate without clear specifications
- ❌ Ignore dependencies between tasks
- ❌ Skip user approval on major changes
- ❌ Create plans that are too detailed (paralysis by analysis)

## Integration with Other Skills

### With Debug Skill:
- Plan includes debugging checkpoints
- Each phase ends with validation
- Subagent output reviewed with debug skill

### With Delegate Skill:
- Plan identifies what to delegate
- Delegation specs included in plan
- Review process planned upfront

## Parallelization Patterns

### Pattern 1: Independent Components
```
Components A, B, C have no shared dependencies
→ Create 3 subagents, run in parallel
→ Review all outputs together
```

### Pattern 2: Pipeline Stages
```
Stage 1 (Design) → Stage 2 (Implementation A, B, C in parallel) → Stage 3 (Integration)
→ Parallelize within stages, serialize across stages
```

### Pattern 3: Test Pyramid
```
Unit tests (Subagent A) || Integration tests (Subagent B) || E2E tests (Subagent C)
→ All test types in parallel
→ Aggregate results
```

## Common Mistakes to Avoid

1. **Over-serialization**: Not identifying parallelizable work
2. **Over-parallelization**: Parallelizing dependent tasks
3. **Under-delegation**: Doing too much yourself
4. **Over-delegation**: Delegating coordination tasks
5. **Vague specs**: Delegating without clear requirements
6. **No review plan**: Not planning how to validate subagent work

## Remember

- **Plan before you code**: Especially for multi-step tasks
- **Think parallel**: Always look for parallelization opportunities
- **Delegate wisely**: You coordinate, subagents implement
- **Define success**: Clear criteria prevent rework
- **Present first**: Get user buy-in before executing

## Auto-Activation Criteria

This skill should activate when user requests involve:
- Words like "implement", "build", "create", "refactor"
- Multiple features or components
- System-wide changes
- Anything that seems to need >1 hour of work
- Tasks where you're unsure of the approach

**When in doubt, PLAN FIRST.**
