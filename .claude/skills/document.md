# Documentation Skill

This skill ensures comprehensive documentation for all work.

## When to Use This Skill

Use this skill:
- After implementing new features
- When fixing complex bugs
- After refactoring
- When discovering important patterns
- Before completing any significant work

## Documentation Types

### 1. Code Documentation

**Inline Comments**:
```typescript
// Good: Explain WHY, not WHAT
// Cache user preferences to avoid repeated API calls
const cachedPrefs = getUserPreferences();

// Bad: States the obvious
// Get user preferences
const prefs = getUserPreferences();
```

**Function/Method Documentation**:
```typescript
/**
 * Processes user authentication token
 *
 * @param token - JWT token from authentication provider
 * @param options - Optional configuration for token validation
 * @returns Decoded user information with roles and permissions
 * @throws {AuthError} If token is invalid or expired
 *
 * @example
 * const user = await processAuthToken(token, { validateExpiry: true });
 */
async function processAuthToken(
  token: string,
  options?: TokenOptions
): Promise<UserInfo> {
  // Implementation
}
```

**Class Documentation**:
```typescript
/**
 * Manages WebSocket connections for real-time updates
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Message queuing during disconnection
 * - Subscription management for multiple channels
 *
 * Usage:
 * ```typescript
 * const ws = new WebSocketManager('ws://localhost:8080');
 * await ws.connect();
 * ws.subscribe('updates', (data) => console.log(data));
 * ```
 */
class WebSocketManager {
  // Implementation
}
```

### 2. API Documentation

**Endpoint Documentation**:
```typescript
/**
 * POST /api/tasks
 *
 * Creates a new task in the system
 *
 * Request Body:
 * {
 *   "description": "string (required, 1-500 chars)",
 *   "priority": "low" | "medium" | "high" (optional, default: "medium"),
 *   "assignee": "string (optional, user ID)"
 * }
 *
 * Response 201:
 * {
 *   "id": "string",
 *   "description": "string",
 *   "priority": "string",
 *   "status": "pending",
 *   "createdAt": "ISO 8601 timestamp"
 * }
 *
 * Response 400:
 * {
 *   "error": "Validation error message"
 * }
 *
 * Response 401:
 * {
 *   "error": "Unauthorized"
 * }
 */
export async function POST(request: Request) {
  // Implementation
}
```

### 3. README Documentation

**Feature README**:
```markdown
# Feature Name

## Overview
Brief description of what this feature does and why it exists.

## Usage
```typescript
// Code examples showing how to use the feature
```

## Configuration
List of configuration options and their effects.

## Architecture
High-level description of how the feature works.

## API Reference
Link to detailed API docs or inline documentation.

## Testing
How to test this feature.

## Troubleshooting
Common issues and solutions.
```

### 4. Architecture Decision Records (ADRs)

When making significant architectural decisions:

```markdown
# ADR-XXX: [Decision Title]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
What is the issue we're facing? What factors are driving this decision?

## Decision
What did we decide to do and why?

## Consequences
What are the positive and negative consequences of this decision?

### Positive
- Benefit 1
- Benefit 2

### Negative
- Trade-off 1
- Trade-off 2

## Alternatives Considered
What other options did we evaluate?

### Alternative 1
- Description
- Why we didn't choose it

### Alternative 2
- Description
- Why we didn't choose it

## References
Links to relevant discussions, documentation, or resources.
```

### 5. Changelog/Release Notes

```markdown
## [Version] - YYYY-MM-DD

### Added
- New feature 1
- New feature 2

### Changed
- Modified behavior of X
- Updated Y to improve Z

### Fixed
- Bug fix 1 (#issue-number)
- Bug fix 2 (#issue-number)

### Breaking Changes
- Description of breaking change
- Migration guide: how to update

### Deprecated
- Feature X is deprecated, use Y instead
```

## Documentation Best Practices

### DO:
- ✅ Explain **WHY**, not just **WHAT**
- ✅ Include **examples** in documentation
- ✅ Document **edge cases** and **gotchas**
- ✅ Keep documentation **close to code**
- ✅ Update docs **as you code** (not after)
- ✅ Document **assumptions** and **constraints**
- ✅ Include **error scenarios**
- ✅ Add **troubleshooting** sections
- ✅ Link to **related documentation**
- ✅ Use **consistent terminology**

### DON'T:
- ❌ Document the obvious
- ❌ Let documentation get out of sync with code
- ❌ Write documentation no one can find
- ❌ Over-document simple code
- ❌ Use jargon without explanation
- ❌ Forget to update docs when code changes
- ❌ Write documentation that's longer than the code
- ❌ Assume readers have context you have

## Documentation Checklist

Before completing work:

- [ ] **Code comments** added for complex logic
- [ ] **Function/class docs** complete with examples
- [ ] **API endpoints** documented (request/response)
- [ ] **README** updated (if applicable)
- [ ] **Configuration** options documented
- [ ] **Examples** provided for key features
- [ ] **Error messages** are clear and actionable
- [ ] **Migration guide** written (if breaking changes)
- [ ] **Architecture decisions** documented (if significant)
- [ ] **Troubleshooting** section added (if needed)

## Special Documentation Scenarios

### For Bug Fixes

Document:
1. **What was the bug?** (symptoms, how to reproduce)
2. **What was the root cause?**
3. **What is the fix?**
4. **How to prevent similar bugs?**

```typescript
/**
 * Fixed: User session not persisting after page reload
 *
 * Root cause: localStorage was being cleared on every page load
 * due to overly aggressive cleanup logic.
 *
 * Fix: Only clear localStorage on explicit logout, not on page load.
 *
 * Prevention: Added test to verify session persistence across reloads.
 */
```

### For Performance Optimizations

Document:
1. **What was the performance issue?**
2. **What metric improved?** (with numbers)
3. **What was the optimization technique?**
4. **Any trade-offs?**

```typescript
/**
 * Performance optimization: Reduced initial load time by 60%
 *
 * Before: 3.2s initial load
 * After: 1.3s initial load
 *
 * Technique: Implemented code splitting and lazy loading for
 * non-critical components.
 *
 * Trade-off: Slightly more complex build configuration.
 */
```

### For Refactoring

Document:
1. **What was refactored and why?**
2. **What is the new structure?**
3. **Migration path** (if API changed)
4. **Benefits** of the refactoring

```typescript
/**
 * Refactored authentication system
 *
 * Previous: Scattered auth logic across multiple components
 * New: Centralized AuthContext with custom hooks
 *
 * Migration:
 * - Replace direct localStorage calls with useAuth() hook
 * - Replace inline auth checks with useRequireAuth() hook
 *
 * Benefits:
 * - Single source of truth for auth state
 * - Easier to test
 * - Consistent auth behavior across app
 */
```

## Documentation Templates

### Component README Template

```markdown
# Component Name

## Purpose
What does this component do? Why does it exist?

## Usage
```tsx
import { ComponentName } from './ComponentName';

<ComponentName
  prop1="value"
  prop2={123}
  onEvent={() => {}}
/>
```

## Props
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| prop1 | string | Yes | - | Description |
| prop2 | number | No | 0 | Description |

## Examples

### Basic Usage
```tsx
// Example code
```

### Advanced Usage
```tsx
// Example code
```

## Notes
- Important note 1
- Important note 2

## Related
- Link to related component
- Link to relevant documentation
```

### API Route README Template

```markdown
# API Route: /api/endpoint

## Overview
What does this endpoint do?

## Authentication
Required? What type?

## Rate Limiting
What are the limits?

## Endpoints

### GET /api/endpoint
Retrieve data

**Query Parameters:**
- `param1` (string, optional): Description
- `param2` (number, optional): Description

**Response 200:**
```json
{
  "data": "value"
}
```

**Response 404:**
```json
{
  "error": "Not found"
}
```

### POST /api/endpoint
Create data

**Request Body:**
```json
{
  "field": "value"
}
```

**Response 201:**
```json
{
  "id": "123",
  "field": "value"
}
```

## Error Codes
| Code | Meaning |
|------|---------|
| 400 | Bad request - validation error |
| 401 | Unauthorized - missing or invalid auth |
| 404 | Not found - resource doesn't exist |
| 500 | Server error - something went wrong |

## Examples

### Using fetch
```typescript
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ field: 'value' })
});
```

### Using curl
```bash
curl -X POST http://localhost:3000/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'
```
```

## Integration with Other Skills

### With Review Skill:
Self-review includes checking documentation completeness

### With Test Skill:
Documentation should include how to run tests

### With Plan Skill:
Planning should allocate time for documentation

## Common Documentation Mistakes

### Mistake 1: Documenting Implementation Details
**Bad**: "This function uses Array.map to iterate..."
**Good**: "Transforms each item in the list to..."

### Mistake 2: Outdated Examples
**Bad**: Code examples that don't work anymore
**Good**: Examples tested and verified to work

### Mistake 3: Missing Context
**Bad**: "Set the flag to true"
**Good**: "Set the flag to true to enable caching, which improves performance but uses more memory"

### Mistake 4: No Error Documentation
**Bad**: Only documenting success cases
**Good**: Documenting all error scenarios and how to handle them

## Remember

- **Documentation is for humans**: Write for people who don't have your context
- **Examples are worth 1000 words**: Show, don't just tell
- **Update as you go**: Don't leave documentation for later
- **Think about future you**: Will you understand this in 6 months?
- **Keep it discoverable**: Put docs where people will find them

**Good documentation is part of good code. Not an afterthought.**
