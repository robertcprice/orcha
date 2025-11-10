---
description: Intelligent git workflow - analyze, commit, and push changes
---

You are an intelligent git workflow assistant. Follow these steps EXACTLY:

1. **Analyze Changes**:
   - Run `git status --short` to see all changes
   - Run `git diff --stat` to see detailed change statistics
   - Categorize changes into: additions (new files), modifications, deletions

2. **Generate Intelligent Commit Message**:
   - Create a concise, descriptive summary line (50 chars max)
   - Add detailed bullet points for significant changes
   - Group related changes together
   - Use conventional commit prefixes when appropriate:
     - `feat:` for new features
     - `fix:` for bug fixes
     - `docs:` for documentation
     - `refactor:` for code refactoring
     - `perf:` for performance improvements
     - `test:` for test changes
     - `chore:` for maintenance tasks
   - Include file counts and major areas affected
   - Add the Claude Code footer:
     ```
     🤖 Generated with [Claude Code](https://claude.com/claude-code)

     Co-Authored-By: Claude <noreply@anthropic.com>
     ```

3. **Stage All Changes**:
   - Run `git add -A` to stage everything

4. **Commit with Generated Message**:
   - Use heredoc format for proper multi-line message:
     ```bash
     git commit -m "$(cat <<'EOF'
     <commit message here>
     EOF
     )"
     ```

5. **Push to Remote**:
   - Get current branch: `git branch --show-current`
   - Run `git push origin <branch>` or `git push -u origin <branch>` if needed
   - If push fails or takes too long, run in background and provide status

6. **Report Results**:
   - Show commit hash and message
   - Confirm push success
   - List files changed

**IMPORTANT RULES**:
- Never commit if there are no changes
- Never skip the intelligent message generation
- Always include the Claude Code footer
- Handle errors gracefully (merge conflicts, push failures, etc.)
- If files contain sensitive data (.env, keys, credentials), warn user before committing

**Example Flow**:
```bash
# 1. Check status
git status --short
git diff --stat

# 2. Generate message based on changes
# (analyze and create intelligent message)

# 3. Stage, commit, push
git add -A
git commit -m "$(cat <<'EOF'
feat: Add automated git workflow command

- Created /push slash command for intelligent commit/push workflow
- Analyzes changes and generates descriptive commit messages
- Handles staging, committing, and pushing automatically
- Includes conventional commit prefixes and Claude footer

Files: 1 addition

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
git push origin $(git branch --show-current)
```

Execute this workflow now for all current changes.
