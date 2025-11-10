# Testing Skill

This skill ensures comprehensive testing for all code changes.

## When to Use This Skill

**MANDATORY**: Use this skill after ANY code modification, including:
- New features
- Bug fixes
- Refactoring
- Configuration changes
- Dependency updates

## Testing Protocol

**ALL work MUST be tested before being marked complete.**

### For Code Changes

**1. Unit Tests** (if applicable):
```bash
pytest tests/test_{module}.py -v
```

**2. Integration Tests** (if applicable):
```bash
python -m {module} --test
```

**3. Manual Verification**:
- Run the modified code
- Verify expected behavior
- Check for errors/warnings
- Test edge cases

### For API Endpoints

**1. Request/Response Test**:
```bash
curl -X POST http://localhost:3000/api/{endpoint} \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

**2. Error Handling**:
- Test with missing parameters
- Test with invalid data
- Verify error messages

**3. Integration Test**:
- Test through UI (if applicable)
- Verify end-to-end flow

### For UI Components

**1. Playwright Automated Tests**:
- Use Playwright MCP server
- Create test scenarios
- Verify visual rendering
- Test user interactions

**2. Manual Browser Testing**:
- Test in target browsers
- Verify responsive design
- Check accessibility
- Test error states

**3. Screenshot Comparison**:
- Capture before/after screenshots
- Verify no unintended visual changes

### For Scripts and Tools

**1. Dry Run**:
```bash
{script} --help  # Verify help works
{script} --dry-run  # Test without side effects
```

**2. Real Run with Small Data**:
- Test on small subset first
- Verify output correctness
- Check performance

**3. Full Run**:
- Run on full data
- Monitor for errors
- Validate results

## Test Pyramid

Follow the test pyramid approach:

```
        /\
       /E2E\      (Few, slow, expensive)
      /------\
     /  INT   \   (Some, moderate)
    /----------\
   /   UNIT     \ (Many, fast, cheap)
  /--------------\
```

**Unit Tests**: 70% of tests
- Test individual functions/methods
- Fast, isolated, deterministic
- Mock external dependencies

**Integration Tests**: 20% of tests
- Test module interactions
- Use real dependencies where practical
- Verify contracts between components

**E2E Tests**: 10% of tests
- Test complete user flows
- Use Playwright for browser automation
- Verify real-world scenarios

## Playwright Testing

When testing browser/UI functionality:

**1. Setup**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/route');
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

**2. Best Practices**:
- ✅ Use data-testid attributes for selectors
- ✅ Wait for elements properly (no arbitrary sleeps)
- ✅ Test user-visible behavior, not implementation
- ✅ Capture screenshots on failure
- ✅ Use Playwright MCP for debugging

**3. Common Patterns**:
```typescript
// Navigation
await page.click('[data-testid="submit-button"]');
await page.waitForURL('**/success');

// Form interaction
await page.fill('[data-testid="input-name"]', 'Test User');
await page.selectOption('[data-testid="dropdown"]', 'option1');

// Assertions
await expect(page.locator('[data-testid="result"]')).toHaveText('Expected');
await expect(page).toHaveURL(/.*success/);

// Screenshots
await page.screenshot({ path: 'test-results/screenshot.png' });
```

## Testing Checklist

Before marking work complete:

- [ ] **Unit tests written** for new functions/methods
- [ ] **Integration tests** cover module interactions
- [ ] **E2E tests** verify user flows (if UI changes)
- [ ] **All tests pass** locally
- [ ] **Edge cases tested** (empty input, null, errors)
- [ ] **Error messages verified** (clear, actionable)
- [ ] **Performance acceptable** (no major regressions)
- [ ] **Browser testing done** (if UI changes)
- [ ] **Accessibility checked** (keyboard nav, screen readers)
- [ ] **Mobile/responsive tested** (if UI changes)

## NO CODE SHIPS WITHOUT TESTING

This is non-negotiable. If you can't test it, you can't ship it.

## Testing Anti-Patterns to Avoid

### DON'T:
- ❌ Skip tests because "it's a small change"
- ❌ Only test the happy path
- ❌ Write tests after discovering bugs (write them first!)
- ❌ Test implementation details instead of behavior
- ❌ Use arbitrary timeouts (use proper waits)
- ❌ Ignore flaky tests (fix them!)
- ❌ Write tests that depend on execution order

### DO:
- ✅ Write tests as you code (TDD when possible)
- ✅ Test error cases and edge cases
- ✅ Use meaningful test names
- ✅ Keep tests fast and isolated
- ✅ Use proper assertions (not just console.log)
- ✅ Mock external dependencies in unit tests
- ✅ Clean up test data after tests run

## Test Organization

```
tests/
├── unit/               # Unit tests
│   ├── utils/
│   ├── components/
│   └── services/
├── integration/        # Integration tests
│   ├── api/
│   └── database/
├── e2e/               # End-to-end tests
│   ├── user-flows/
│   └── critical-paths/
├── fixtures/          # Test data
└── helpers/           # Test utilities
```

## Coverage Goals

- **Unit tests**: >80% coverage
- **Integration tests**: Cover all API endpoints
- **E2E tests**: Cover all critical user flows

## Continuous Testing

During development:
```bash
# Watch mode for unit tests
npm test -- --watch

# Playwright UI mode for debugging
npx playwright test --ui

# Run specific test file
npm test -- path/to/test.spec.ts
```

## When Tests Fail

**Follow the debug skill protocol**:

1. **Attempt 1**: Investigate the failure, fix the issue
2. **Attempt 2**: Try a different approach
3. **Attempt 3**: Consult expert (use debug skill)

**Never**:
- Disable or skip failing tests
- Increase timeouts to make flaky tests pass
- Comment out assertions
- Commit with failing tests

## Test Documentation

Document:
- **What** is being tested
- **Why** this test is important
- **How** to run the test
- **Expected behavior**

Example:
```typescript
/**
 * Tests user authentication flow
 *
 * Critical path: Users must be able to log in to access protected features
 *
 * Covers:
 * - Valid credentials → successful login
 * - Invalid credentials → error message
 * - Session persistence after login
 *
 * Run: npm test -- auth.spec.ts
 */
```

## Remember

- **Test-driven development**: Write tests first when possible
- **Test behavior, not implementation**: Tests should survive refactoring
- **Fast feedback**: Unit tests should run in seconds
- **Confidence**: Good tests give confidence to refactor and deploy
- **Living documentation**: Tests document expected behavior

**If you're not sure how to test something, ASK before implementing.**
