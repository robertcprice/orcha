# Git Commit Skill

This skill ensures proper git workflow and meaningful commit history.

## When to Use This Skill

Use this skill when:
- Creating git commits
- Preparing code for PR
- Organizing changes for review
- Maintaining clean git history

## Commit Best Practices

### Commit Message Format

```
type(scope): subject

body (optional)

footer (optional)
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring (no functional change)
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `chore`: Build process, dependencies, tooling
- `ci`: CI/CD configuration changes
- `revert`: Reverting a previous commit

**Scope** (optional): Area of codebase affected
- `api`, `ui`, `auth`, `db`, `orchestrator`, etc.

**Subject**: Short summary (50 chars or less)
- Use imperative mood ("add" not "added" or "adds")
- Don't capitalize first letter
- No period at the end

**Body** (optional): Detailed explanation
- Wrap at 72 characters
- Explain WHAT and WHY, not HOW
- Separate from subject with blank line

**Footer** (optional):
- Breaking changes: `BREAKING CHANGE: description`
- Issue references: `Closes #123`, `Fixes #456`
- Co-authors: `Co-Authored-By: Name <email>`

### Example Commit Messages

**Good**:
```
feat(auth): add JWT token refresh mechanism

Implements automatic token refresh when token is about to expire.
This prevents users from being logged out during active sessions.

- Refresh token stored in httpOnly cookie
- Auto-refresh when <5 min remaining
- Fallback to login if refresh fails

Closes #234
```

**Good** (simple):
```
fix(api): handle null response from user endpoint
```

**Bad**:
```
fixed stuff
```

**Bad**:
```
Updated files
```

**Bad**:
```
feat: Added new feature that does X and also fixed bug Y and refactored Z
```

## Commit Organization

### Atomic Commits

Each commit should:
- ✅ Represent **one logical change**
- ✅ Be **independently reviewable**
- ✅ Leave the codebase in a **working state**
- ✅ Pass all **tests**

**Good commit sequence**:
```
1. feat(api): add user profile endpoint
2. feat(ui): add user profile component
3. test(api): add tests for user profile endpoint
4. docs(api): document user profile endpoint
```

**Bad** (too large):
```
1. feat: complete user profile feature including API, UI, tests, and docs
```

**Bad** (not atomic):
```
1. fix: fix login bug and add new feature
```

### Staging Changes

Stage changes thoughtfully:

```bash
# Stage specific files
git add path/to/file1.ts path/to/file2.ts

# Stage parts of a file interactively
git add -p path/to/file.ts

# Review staged changes
git diff --staged

# Unstage if needed
git reset path/to/file.ts
```

### Pre-Commit Checklist

Before each commit:

- [ ] **Tests pass**: `npm test`
- [ ] **No TypeScript errors**: `npm run type-check`
- [ ] **No linting errors**: `npm run lint`
- [ ] **Build succeeds**: `npm run build`
- [ ] **Only related changes** staged
- [ ] **No debug code** (console.logs, commented code)
- [ ] **No secrets** (API keys, passwords)
- [ ] **Meaningful commit message** written

## Git Workflow

### Feature Development

```bash
# 1. Create feature branch
git checkout -b feat/feature-name

# 2. Make changes and commit atomically
git add relevant-files
git commit -m "feat(scope): meaningful message"

# 3. Keep branch up to date
git fetch origin
git rebase origin/main

# 4. Push when ready
git push origin feat/feature-name

# 5. Create pull request
```

### Bug Fixes

```bash
# 1. Create fix branch
git checkout -b fix/bug-description

# 2. Fix bug
git add fixed-files
git commit -m "fix(scope): description of fix"

# 3. Add regression test
git add test-files
git commit -m "test(scope): add regression test for bug"

# 4. Push and create PR
git push origin fix/bug-description
```

### Working with Commits

**Amend last commit** (only if not pushed):
```bash
git add forgotten-file
git commit --amend --no-edit
```

**Split a commit**:
```bash
# Reset last commit but keep changes
git reset HEAD~1

# Stage and commit changes separately
git add file1.ts
git commit -m "feat: part 1"

git add file2.ts
git commit -m "feat: part 2"
```

**Rebase to clean history** (only if not pushed):
```bash
# Interactive rebase last 3 commits
git rebase -i HEAD~3

# Squash, reorder, edit as needed
```

## Common Scenarios

### Scenario 1: Fixing Pre-Commit Hook Issues

```bash
# Pre-commit hook modified files (e.g., prettier formatting)

# 1. Check what changed
git diff

# 2. If changes are formatting/auto-fixes, amend commit
git add .
git commit --amend --no-edit

# 3. ONLY amend if:
#    - You are the author (check: git log -1 --format='%an %ae')
#    - Commit not pushed yet
```

### Scenario 2: Forgot to Include File

```bash
# Just committed but forgot a file

# 1. Add the forgotten file
git add forgotten-file.ts

# 2. Amend the commit
git commit --amend --no-edit
```

### Scenario 3: Wrong Commit Message

```bash
# Just committed with wrong message

git commit --amend -m "correct message"
```

### Scenario 4: Need to Split Changes

```bash
# Made multiple unrelated changes

# 1. Stage files for first commit
git add file1.ts file2.ts
git commit -m "feat: feature 1"

# 2. Stage files for second commit
git add file3.ts file4.ts
git commit -m "fix: bug fix"

# 3. Or use interactive staging
git add -p  # Choose which hunks to stage
```

## Git Safety Protocol

### NEVER:
- ❌ Commit secrets (API keys, passwords, tokens)
- ❌ Commit sensitive data (customer info, credentials)
- ❌ Force push to main/master
- ❌ Rewrite public history (pushed commits)
- ❌ Amend commits you didn't author
- ❌ Skip tests (use --no-verify sparingly)
- ❌ Commit non-working code to main
- ❌ Make commits with "WIP" or "temp" messages

### ALWAYS:
- ✅ Review changes before committing (`git diff --staged`)
- ✅ Write meaningful commit messages
- ✅ Run tests before committing
- ✅ Check git status before and after
- ✅ Use `.gitignore` to exclude unwanted files
- ✅ Keep commits atomic and focused
- ✅ Verify no secrets in staged files

## Commit Message Templates

### Feature Addition
```
feat(scope): add [feature name]

Implements [feature description]. This enables users to [capability].

Technical details:
- Approach 1
- Approach 2

Closes #[issue-number]
```

### Bug Fix
```
fix(scope): [bug description]

Root cause: [explanation]

Fix: [what was changed]

Prevents: [how this prevents future issues]

Fixes #[issue-number]
```

### Refactoring
```
refactor(scope): [what was refactored]

Previous: [old approach and its issues]
New: [new approach and benefits]

Benefits:
- Better performance
- More maintainable
- Easier to test

No functional changes.
```

### Performance Improvement
```
perf(scope): [optimization description]

Before: [metric before]
After: [metric after]
Improvement: [percentage or absolute improvement]

Technique: [what optimization was applied]

Benchmark: [how it was measured]
```

### Breaking Change
```
feat(scope): [feature that breaks compatibility]

BREAKING CHANGE: [description of what breaks]

Migration:
- Change X to Y
- Update Z to use new API

Before:
```
// Old code
```

After:
```
// New code
```

Closes #[issue-number]
```

## Integration with Other Skills

### With Test Skill:
Every commit should pass all tests

### With Review Skill:
Review changes before committing

### With Document Skill:
Include documentation updates in commits

## Tools and Commands

### Useful Git Commands

```bash
# View commit history
git log --oneline --graph --all

# Search commit messages
git log --grep="search term"

# Find who changed a line
git blame path/to/file

# View file history
git log -p path/to/file

# Interactive staging
git add -p

# Stash work in progress
git stash push -m "description"
git stash pop

# Cherry-pick a commit
git cherry-pick <commit-hash>

# Check what would be committed
git diff --staged --name-only
```

### Pre-Commit Hooks

Use pre-commit hooks to enforce quality:

```javascript
// .husky/pre-commit or similar
#!/bin/sh

# Run type checking
npm run type-check || exit 1

# Run linting
npm run lint || exit 1

# Run tests
npm test || exit 1

# Check for secrets
git diff --staged | grep -E "api_key|password|secret" && exit 1
```

## Remember

- **Commits are documentation**: They tell the story of how code evolved
- **Think of future reviewers**: Make their job easier
- **Atomic commits**: One change, one commit
- **Working state**: Every commit should leave code working
- **Meaningful messages**: Explain why, not just what

**Good commits make debugging, reviewing, and understanding code history much easier.**
