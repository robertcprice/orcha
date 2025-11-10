# Self-Review Skill

This skill implements mandatory self-review and verification before completing any task.

## When to Use This Skill

**MANDATORY**: Use this skill BEFORE marking ANY task as complete.

## Self-Review Checklist

### 1. Did I Follow ALL Specifications?

- [ ] Re-read the user's original request
- [ ] Verify every requirement was addressed
- [ ] Check for any missed details or edge cases
- [ ] Confirm no scope creep (didn't add unrequested features)
- [ ] Validate against acceptance criteria (if provided)

### 2. Did I Place Files Correctly?

- [ ] Check project structure documentation
- [ ] Verify all files are in correct directories
- [ ] Confirm no files in wrong locations
- [ ] Check that root directory is clean (if applicable)
- [ ] Validate file naming follows conventions

### 3. Did I Follow Naming Conventions?

- [ ] Check project naming conventions documentation
- [ ] Verify all files use correct naming format
- [ ] Ensure consistent naming across related files
- [ ] Validate variable/function names are descriptive
- [ ] Check for typos in names

### 4. Did I Test My Work?

- [ ] Run relevant tests (use test skill)
- [ ] Verify functionality works as expected
- [ ] Check for errors or warnings
- [ ] Test edge cases
- [ ] Verify no regressions in existing functionality

### 5. Did I Update Documentation?

- [ ] Update relevant README files
- [ ] Create/update API documentation
- [ ] Document any new patterns or learnings
- [ ] Update changelog (if applicable)
- [ ] Add code comments where necessary

### 6. Code Quality Checks

- [ ] **No console.logs** left in production code
- [ ] **No commented-out code** (use git history instead)
- [ ] **No TODO comments** without tracking
- [ ] **No hardcoded values** that should be configurable
- [ ] **No security vulnerabilities** (API keys, secrets)
- [ ] **Error handling** is comprehensive
- [ ] **TypeScript errors** resolved
- [ ] **Linting errors** fixed
- [ ] **Formatting** is consistent

### 7. Performance and Scalability

- [ ] No obvious performance issues
- [ ] Database queries are efficient
- [ ] No N+1 query problems
- [ ] Appropriate caching where needed
- [ ] No memory leaks
- [ ] Handles large datasets appropriately

### 8. Security Review

- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] No CSRF vulnerabilities
- [ ] User input is validated and sanitized
- [ ] Authentication/authorization implemented correctly
- [ ] Secrets are not committed to git
- [ ] HTTPS used where required
- [ ] CORS configured properly

### 9. Accessibility (for UI changes)

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Sufficient color contrast
- [ ] Proper ARIA labels
- [ ] Focus indicators visible
- [ ] Form labels present and correct

### 10. Integration Verification

- [ ] Changes work with existing code
- [ ] No breaking changes to APIs
- [ ] Backwards compatibility maintained (or documented)
- [ ] Dependencies are compatible
- [ ] Build succeeds
- [ ] CI/CD pipeline passes

## Self-Correction Protocol

If you find issues during self-review:

1. **DO NOT ignore them** - fix immediately
2. **DO NOT ask permission** - just fix the problems
3. **DO document** what you fixed and why
4. **DO verify** the fix resolves the issue
5. **DO re-run** the self-review checklist after fixing

**Example**:
```
Self-review found: 3 console.log statements in production code
Action: Removing debug statements immediately
Verification: Searched for console.log, none found ✅
```

## Common Issues Found During Self-Review

### Issue: Incomplete Implementation
**Symptom**: Some requirements not addressed
**Fix**: Go back and implement missing features
**Prevention**: Check requirements before starting

### Issue: Files in Wrong Location
**Symptom**: Files not following project structure
**Fix**: Move files to correct directories
**Prevention**: Review structure docs before creating files

### Issue: Poor Error Handling
**Symptom**: Errors not caught or poorly messaged
**Fix**: Add try-catch blocks, improve error messages
**Prevention**: Think about error cases upfront

### Issue: Missing Tests
**Symptom**: No tests or incomplete test coverage
**Fix**: Write missing tests
**Prevention**: Use test skill while coding

### Issue: Documentation Out of Date
**Symptom**: Comments/docs don't match code
**Fix**: Update documentation
**Prevention**: Update docs as you code

## IF ANY ANSWER IS "NO", GO BACK AND FIX IT IMMEDIATELY

This is **MANDATORY**. Incomplete or incorrect work is **unacceptable**.

## Self-Review Template

Use this template to document your self-review:

```markdown
## Self-Review Checklist

**Task**: [Brief description]

### Requirements Review
- [x] All requirements addressed
- [x] No scope creep
- [x] Edge cases handled

### File Organization
- [x] Files in correct directories
- [x] Naming conventions followed
- [x] Root directory clean

### Code Quality
- [x] No console.logs
- [x] No commented code
- [x] No TODOs without tracking
- [x] Error handling complete
- [x] TypeScript errors: 0
- [x] Linting errors: 0

### Testing
- [x] Unit tests: PASS
- [x] Integration tests: PASS
- [x] Manual testing: PASS
- [x] Edge cases tested

### Documentation
- [x] README updated
- [x] Code comments added
- [x] API docs current

### Security
- [x] No vulnerabilities identified
- [x] Input validation present
- [x] No secrets committed

### Performance
- [x] No obvious performance issues
- [x] Database queries optimized

### Issues Found & Fixed
1. [Issue]: [Description]
   - Fix: [What you did]
   - Verified: [How you confirmed]

### Final Verification
- [x] All checklist items complete
- [x] Ready for user review
```

## Best Practices

### DO:
- ✅ Review your own work before showing the user
- ✅ Fix issues you find without being asked
- ✅ Be thorough and honest in your review
- ✅ Document what you found and fixed
- ✅ Re-review after making fixes

### DON'T:
- ❌ Skip self-review to save time
- ❌ Ignore issues you find
- ❌ Ask permission to fix obvious bugs
- ❌ Rush through the checklist
- ❌ Mark tasks complete with known issues

## Integration with Other Skills

### With Test Skill:
Self-review includes running all tests and verifying they pass

### With Debug Skill:
If self-review finds bugs, use debug skill to fix them properly

### With Plan Skill:
Planning should include time for self-review in the schedule

## Red Flags During Self-Review

If you find any of these, **STOP and FIX**:

- 🚨 Tests are failing
- 🚨 TypeScript errors present
- 🚨 Console errors in browser
- 🚨 Linting errors
- 🚨 Security vulnerabilities
- 🚨 Performance is notably worse
- 🚨 Breaking changes to APIs
- 🚨 Missing critical error handling
- 🚨 Hardcoded secrets or credentials
- 🚨 Code doesn't match requirements

## Verification Commands

Run these before completing work:

```bash
# Type checking
npm run type-check
# or
tsc --noEmit

# Linting
npm run lint

# Tests
npm test

# Build
npm run build

# Security audit
npm audit

# Git status (check for unintended changes)
git status
git diff
```

## Remember

- **You are your first code reviewer**: Catch issues before the user sees them
- **Quality over speed**: Taking time to review prevents rework
- **Be thorough**: A missed bug is worse than a delayed delivery
- **Document findings**: Show what you checked and fixed
- **Fix, don't justify**: If you find an issue, fix it

**This is NOT optional. Incomplete or incorrect work is UNACCEPTABLE.**
