# Performance Skill

This skill ensures code is performant and scalable.

## When to Use This Skill

Use this skill when:
- Building features that handle large datasets
- Optimizing slow code
- Working with databases
- Implementing APIs
- Building UI components

## Performance Principles

### 1. Measure First, Optimize Second

**NEVER optimize without measuring**:

```typescript
// ✅ Measure performance
console.time('operation');
const result = await expensiveOperation();
console.timeEnd('operation');

// ✅ Use performance API
const start = performance.now();
await operation();
const duration = performance.now() - start;
console.log(`Operation took ${duration}ms`);
```

**Profile before optimizing**:
- Use browser DevTools Performance tab
- Use Node.js profiler: `node --inspect`
- Measure real-world scenarios, not artificial benchmarks

### 2. Big O Complexity Matters

**Algorithmic efficiency**:

```typescript
// ❌ O(n²) - Nested loops
function findDuplicates(arr) {
  const duplicates = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j]) duplicates.push(arr[i]);
    }
  }
  return duplicates;
}

// ✅ O(n) - Hash map
function findDuplicates(arr) {
  const seen = new Set();
  const duplicates = new Set();

  for (const item of arr) {
    if (seen.has(item)) {
      duplicates.add(item);
    } else {
      seen.add(item);
    }
  }

  return Array.from(duplicates);
}
```

### 3. Database Query Optimization

**N+1 Query Problem**:

```typescript
// ❌ N+1 queries
const users = await db.user.findMany();
for (const user of users) {
  const posts = await db.post.findMany({ where: { userId: user.id } });
  user.posts = posts;
}

// ✅ Single query with join
const users = await db.user.findMany({
  include: { posts: true }
});
```

**Indexing**:

```sql
-- ✅ Create indexes for frequently queried columns
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_post_user_id ON posts(user_id);
CREATE INDEX idx_post_created_at ON posts(created_at);
```

**Pagination**:

```typescript
// ❌ Loading all records
const posts = await db.post.findMany();

// ✅ Paginated loading
const posts = await db.post.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
  orderBy: { createdAt: 'desc' }
});
```

### 4. Caching Strategies

**In-Memory Caching**:

```typescript
// ✅ Simple cache with expiration
class Cache<T> {
  private cache = new Map<string, { data: T; expires: number }>();

  set(key: string, data: T, ttl: number = 3600000) {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }
}

// Usage
const userCache = new Cache<User>();

async function getUser(id: string): Promise<User> {
  const cached = userCache.get(id);
  if (cached) return cached;

  const user = await db.user.findUnique({ where: { id } });
  userCache.set(id, user);
  return user;
}
```

**HTTP Caching**:

```typescript
// ✅ Set appropriate cache headers
export async function GET(request: Request) {
  const data = await fetchData();

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'ETag': generateETag(data)
    }
  });
}
```

### 5. Frontend Performance

**Code Splitting**:

```typescript
// ✅ Dynamic imports for code splitting
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Spinner />
});

// ✅ Route-based splitting (automatic in Next.js)
// Each page is automatically code-split
```

**Lazy Loading**:

```typescript
// ✅ Lazy load images
<img
  src={imageUrl}
  loading="lazy"
  alt="Description"
/>

// ✅ Lazy load components
import { lazy, Suspense } from 'react';

const LazyComponent = lazy(() => import('./Component'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <LazyComponent />
    </Suspense>
  );
}
```

**React Performance**:

```typescript
// ✅ Memoization
import { memo, useMemo, useCallback } from 'react';

const ExpensiveComponent = memo(({ data }: Props) => {
  const processed = useMemo(() => {
    return expensiveCalculation(data);
  }, [data]);

  const handleClick = useCallback(() => {
    // Handler logic
  }, [/* dependencies */]);

  return <div onClick={handleClick}>{processed}</div>;
});

// ✅ Virtualization for long lists
import { FixedSizeList } from 'react-window';

function LongList({ items }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>{items[index]}</div>
      )}
    </FixedSizeList>
  );
}
```

**Bundle Size Optimization**:

```typescript
// ✅ Tree shaking - import only what you need
import { map } from 'lodash-es'; // Good
// vs
import _ from 'lodash'; // Imports everything

// ✅ Analyze bundle size
// npm run build
// npx @next/bundle-analyzer
```

### 6. Asynchronous Operations

**Parallel vs Sequential**:

```typescript
// ❌ Sequential (slow)
const user = await fetchUser();
const posts = await fetchPosts();
const comments = await fetchComments();

// ✅ Parallel (fast)
const [user, posts, comments] = await Promise.all([
  fetchUser(),
  fetchPosts(),
  fetchComments()
]);
```

**Debouncing & Throttling**:

```typescript
// ✅ Debounce search input
import { debounce } from 'lodash-es';

const debouncedSearch = debounce((query: string) => {
  performSearch(query);
}, 300);

<input onChange={(e) => debouncedSearch(e.target.value)} />

// ✅ Throttle scroll handler
import { throttle } from 'lodash-es';

const throttledScroll = throttle(() => {
  handleScroll();
}, 100);

window.addEventListener('scroll', throttledScroll);
```

### 7. Memory Management

**Avoid Memory Leaks**:

```typescript
// ❌ Memory leak
useEffect(() => {
  const interval = setInterval(() => {
    // Do something
  }, 1000);
  // Missing cleanup!
});

// ✅ Proper cleanup
useEffect(() => {
  const interval = setInterval(() => {
    // Do something
  }, 1000);

  return () => clearInterval(interval);
}, []);

// ✅ Event listener cleanup
useEffect(() => {
  const handleResize = () => { /* ... */ };
  window.addEventListener('resize', handleResize);

  return () => window.removeEventListener('resize', handleResize);
}, []);
```

**Efficient Data Structures**:

```typescript
// ✅ Use appropriate data structures
// For frequent lookups: Map/Set (O(1))
const userMap = new Map<string, User>();

// For ordered data: Array
const sortedPosts: Post[] = [];

// For unique values: Set
const uniqueIds = new Set<string>();

// For key-value with string keys: Object
const config: Record<string, any> = {};
```

## Performance Checklist

### Database
- [ ] Indexes on frequently queried columns
- [ ] No N+1 queries
- [ ] Pagination for large datasets
- [ ] Connection pooling configured
- [ ] Query optimization (EXPLAIN ANALYZE)
- [ ] Appropriate use of transactions
- [ ] Database caching enabled

### API
- [ ] Response time <200ms for simple queries
- [ ] Pagination implemented
- [ ] Compression enabled (gzip/brotli)
- [ ] Caching headers set appropriately
- [ ] Rate limiting to prevent abuse
- [ ] Connection keep-alive enabled
- [ ] CDN for static assets

### Frontend
- [ ] First Contentful Paint <1.8s
- [ ] Time to Interactive <3.8s
- [ ] Largest Contentful Paint <2.5s
- [ ] Cumulative Layout Shift <0.1
- [ ] Code splitting implemented
- [ ] Images optimized and lazy loaded
- [ ] Fonts optimized (WOFF2, preload)
- [ ] Unnecessary re-renders eliminated

### Bundle
- [ ] Bundle size <200KB (gzipped)
- [ ] Tree shaking enabled
- [ ] Dead code eliminated
- [ ] Source maps in production (optional)
- [ ] Vendor chunks separated
- [ ] Dynamic imports for large dependencies

## Performance Patterns

### Pattern 1: Request Deduplication

```typescript
// ✅ Deduplicate identical concurrent requests
const pendingRequests = new Map<string, Promise<any>>();

async function fetchWithDedup(url: string) {
  if (pendingRequests.has(url)) {
    return pendingRequests.get(url);
  }

  const promise = fetch(url).then(r => r.json());
  pendingRequests.set(url, promise);

  try {
    const result = await promise;
    return result;
  } finally {
    pendingRequests.delete(url);
  }
}
```

### Pattern 2: Progressive Loading

```typescript
// ✅ Load critical data first, then enhance
export default function Page() {
  const [criticalData, setCriticalData] = useState(null);
  const [enhancedData, setEnhancedData] = useState(null);

  useEffect(() => {
    // Load critical data immediately
    fetchCritical().then(setCriticalData);

    // Load enhanced data after
    fetchEnhanced().then(setEnhancedData);
  }, []);

  return (
    <div>
      {criticalData && <CriticalContent data={criticalData} />}
      {enhancedData && <EnhancedContent data={enhancedData} />}
    </div>
  );
}
```

### Pattern 3: Optimistic Updates

```typescript
// ✅ Update UI immediately, sync with server after
async function updateItem(id: string, updates: Partial<Item>) {
  // Optimistically update UI
  setItems(items =>
    items.map(item =>
      item.id === id ? { ...item, ...updates } : item
    )
  );

  try {
    // Sync with server
    await api.updateItem(id, updates);
  } catch (error) {
    // Revert on error
    setItems(originalItems);
    showError('Update failed');
  }
}
```

## Performance Anti-Patterns

### DON'T:
- ❌ Premature optimization
- ❌ Optimize without measuring
- ❌ Load all data upfront
- ❌ Ignore algorithmic complexity
- ❌ Fetch data in loops
- ❌ Re-render entire component trees
- ❌ Block the main thread
- ❌ Ignore bundle size

### DO:
- ✅ Measure before optimizing
- ✅ Optimize for real bottlenecks
- ✅ Load data incrementally
- ✅ Choose efficient algorithms
- ✅ Batch API requests
- ✅ Memoize expensive computations
- ✅ Use web workers for heavy tasks
- ✅ Monitor bundle size

## Performance Monitoring

### Development

```typescript
// ✅ Performance marks and measures
performance.mark('start-render');
render();
performance.mark('end-render');

performance.measure('render-duration', 'start-render', 'end-render');
const measure = performance.getEntriesByName('render-duration')[0];
console.log(`Render took ${measure.duration}ms`);
```

### Production

```typescript
// ✅ Web Vitals monitoring
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics service
  console.log(metric);
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

## Remember

- **Measure first**: Don't guess, measure
- **User-perceived performance**: Focus on what users experience
- **80/20 rule**: 80% of slowness from 20% of code
- **Progressive enhancement**: Load critical content first
- **Network is slow**: Minimize requests and payload size
- **Memory is limited**: Clean up after yourself

**Fast software is better software. Make performance a priority.**
