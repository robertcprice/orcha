# Architecture Skill

This skill guides architectural decision-making and system design.

## When to Use This Skill

Use this skill when:
- Starting a new feature or module
- Refactoring existing code
- Integrating new technologies
- Making significant design decisions
- Scaling existing systems

## Architectural Principles

### 1. SOLID Principles

**Single Responsibility Principle (SRP)**:
```typescript
// ❌ Class doing too much
class User {
  save() { /* DB logic */ }
  sendEmail() { /* Email logic */ }
  generateReport() { /* Report logic */ }
}

// ✅ Separated responsibilities
class User {
  constructor(public id: string, public email: string) {}
}

class UserRepository {
  async save(user: User) { /* DB logic */ }
}

class EmailService {
  async sendEmail(user: User) { /* Email logic */ }
}

class ReportGenerator {
  async generateReport(user: User) { /* Report logic */ }
}
```

**Open/Closed Principle (OCP)**:
```typescript
// ✅ Open for extension, closed for modification
interface PaymentProcessor {
  process(amount: number): Promise<void>;
}

class StripeProcessor implements PaymentProcessor {
  async process(amount: number) {
    // Stripe-specific logic
  }
}

class PayPalProcessor implements PaymentProcessor {
  async process(amount: number) {
    // PayPal-specific logic
  }
}

// Add new processors without modifying existing code
class CryptoProcessor implements PaymentProcessor {
  async process(amount: number) {
    // Crypto-specific logic
  }
}
```

**Dependency Inversion Principle (DIP)**:
```typescript
// ❌ High-level module depends on low-level module
class OrderService {
  private db = new MySQLDatabase();

  async createOrder(order: Order) {
    await this.db.save(order);
  }
}

// ✅ Both depend on abstraction
interface Database {
  save(data: any): Promise<void>;
}

class OrderService {
  constructor(private db: Database) {}

  async createOrder(order: Order) {
    await this.db.save(order);
  }
}

class MySQLDatabase implements Database {
  async save(data: any) { /* MySQL logic */ }
}
```

### 2. Separation of Concerns

**Layered Architecture**:

```
┌─────────────────────────────────┐
│      Presentation Layer         │  (UI, API routes)
├─────────────────────────────────┤
│      Application Layer          │  (Business logic, use cases)
├─────────────────────────────────┤
│      Domain Layer               │  (Entities, domain logic)
├─────────────────────────────────┤
│      Infrastructure Layer       │  (Database, external services)
└─────────────────────────────────┘
```

**Example Structure**:

```typescript
// Domain Layer
export class Order {
  constructor(
    public id: string,
    public items: OrderItem[],
    public status: OrderStatus
  ) {}

  calculateTotal(): number {
    return this.items.reduce((sum, item) => sum + item.price, 0);
  }
}

// Application Layer (Use Case)
export class CreateOrderUseCase {
  constructor(
    private orderRepo: OrderRepository,
    private emailService: EmailService
  ) {}

  async execute(items: OrderItem[], userId: string): Promise<Order> {
    const order = new Order(generateId(), items, 'pending');
    await this.orderRepo.save(order);
    await this.emailService.sendOrderConfirmation(order, userId);
    return order;
  }
}

// Infrastructure Layer
export class PostgresOrderRepository implements OrderRepository {
  async save(order: Order): Promise<void> {
    // Postgres-specific implementation
  }
}

// Presentation Layer (API Route)
export async function POST(request: Request) {
  const { items, userId } = await request.json();

  const useCase = new CreateOrderUseCase(
    new PostgresOrderRepository(),
    new EmailService()
  );

  const order = await useCase.execute(items, userId);
  return Response.json(order);
}
```

### 3. DRY (Don't Repeat Yourself)

**Extract Common Logic**:

```typescript
// ❌ Repeated validation logic
function createUser(data: any) {
  if (!data.email || !data.email.includes('@')) {
    throw new Error('Invalid email');
  }
  // Create user
}

function updateUser(data: any) {
  if (!data.email || !data.email.includes('@')) {
    throw new Error('Invalid email');
  }
  // Update user
}

// ✅ Reusable validation
function validateEmail(email: string): void {
  if (!email || !email.includes('@')) {
    throw new Error('Invalid email');
  }
}

function createUser(data: any) {
  validateEmail(data.email);
  // Create user
}

function updateUser(data: any) {
  validateEmail(data.email);
  // Update user
}
```

### 4. KISS (Keep It Simple, Stupid)

```typescript
// ❌ Overly complex
class DataProcessor {
  process(data: any) {
    return this.stage1(this.stage2(this.stage3(data)));
  }

  private stage1(data: any) { /* complex logic */ }
  private stage2(data: any) { /* complex logic */ }
  private stage3(data: any) { /* complex logic */ }
}

// ✅ Simple and clear
class DataProcessor {
  process(data: any) {
    const cleaned = this.cleanData(data);
    const validated = this.validateData(cleaned);
    const transformed = this.transformData(validated);
    return transformed;
  }

  private cleanData(data: any) { /* simple logic */ }
  private validateData(data: any) { /* simple logic */ }
  private transformData(data: any) { /* simple logic */ }
}
```

### 5. YAGNI (You Aren't Gonna Need It)

```typescript
// ❌ Building for future requirements
class User {
  // Current requirement: store email
  email: string;

  // "Maybe we'll need these someday"
  secondaryEmails?: string[];
  emailPreferences?: EmailPreferences;
  emailHistory?: EmailHistory[];
  // ... lots of unused fields
}

// ✅ Build only what's needed now
class User {
  email: string;

  // Add more fields when actually needed
}
```

## Architectural Patterns

### 1. Repository Pattern

```typescript
// ✅ Abstract data access
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}

class DatabaseUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    // Database-specific implementation
  }

  async save(user: User): Promise<void> {
    // Database-specific implementation
  }

  // ... other methods
}

// Easy to swap implementations
class InMemoryUserRepository implements UserRepository {
  private users = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  // ... other methods
}
```

### 2. Factory Pattern

```typescript
// ✅ Encapsulate object creation
interface Logger {
  log(message: string): void;
}

class LoggerFactory {
  static create(type: 'console' | 'file' | 'cloud'): Logger {
    switch (type) {
      case 'console':
        return new ConsoleLogger();
      case 'file':
        return new FileLogger();
      case 'cloud':
        return new CloudLogger();
      default:
        throw new Error(`Unknown logger type: ${type}`);
    }
  }
}

// Usage
const logger = LoggerFactory.create(process.env.LOGGER_TYPE);
```

### 3. Strategy Pattern

```typescript
// ✅ Interchangeable algorithms
interface SortStrategy {
  sort<T>(items: T[]): T[];
}

class QuickSort implements SortStrategy {
  sort<T>(items: T[]): T[] {
    // QuickSort implementation
  }
}

class MergeSort implements SortStrategy {
  sort<T>(items: T[]): T[] {
    // MergeSort implementation
  }
}

class Sorter<T> {
  constructor(private strategy: SortStrategy) {}

  sort(items: T[]): T[] {
    return this.strategy.sort(items);
  }

  setStrategy(strategy: SortStrategy): void {
    this.strategy = strategy;
  }
}

// Usage
const sorter = new Sorter(new QuickSort());
const sorted = sorter.sort(data);
```

### 4. Observer Pattern

```typescript
// ✅ Event-driven architecture
interface Observer<T> {
  update(data: T): void;
}

class Subject<T> {
  private observers: Observer<T>[] = [];

  attach(observer: Observer<T>): void {
    this.observers.push(observer);
  }

  detach(observer: Observer<T>): void {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  notify(data: T): void {
    for (const observer of this.observers) {
      observer.update(data);
    }
  }
}

// Usage
class UserLogger implements Observer<User> {
  update(user: User): void {
    console.log(`User updated: ${user.email}`);
  }
}

class UserCache implements Observer<User> {
  update(user: User): void {
    cache.set(user.id, user);
  }
}

const userSubject = new Subject<User>();
userSubject.attach(new UserLogger());
userSubject.attach(new UserCache());

userSubject.notify(updatedUser);
```

## Microservices vs Monolith

### When to Use Monolith

**Good for**:
- Small to medium teams
- Early-stage products
- Simple deployment
- Shared database makes sense
- Performance-critical (no network overhead)

### When to Use Microservices

**Good for**:
- Large teams (can work independently)
- Different scaling needs per service
- Technology diversity needed
- Independent deployment critical
- Domain boundaries are clear

### Decision Matrix

| Factor | Monolith | Microservices |
|--------|----------|---------------|
| Team Size | <10 developers | >10 developers |
| Complexity | Low-Medium | High |
| Deployment | Simple | Complex |
| Scaling | Vertical | Horizontal (per service) |
| Development Speed | Fast (initially) | Slower (overhead) |
| Operational Cost | Low | High |

## API Design

### RESTful API Best Practices

```typescript
// ✅ Resource-based URLs
GET    /api/users           // List users
GET    /api/users/:id       // Get user
POST   /api/users           // Create user
PUT    /api/users/:id       // Update user (full)
PATCH  /api/users/:id       // Update user (partial)
DELETE /api/users/:id       // Delete user

// ✅ Nested resources
GET    /api/users/:id/posts // Get user's posts
POST   /api/users/:id/posts // Create post for user

// ❌ Avoid RPC-style endpoints
POST   /api/createUser
POST   /api/deleteUser
```

### GraphQL When Appropriate

**Use GraphQL when**:
- Clients need flexible queries
- Over-fetching/under-fetching is a problem
- Multiple client types (mobile, web, etc.)
- Real-time subscriptions needed

**Use REST when**:
- Simple CRUD operations
- Caching is important
- Standard HTTP tools/monitoring
- Team unfamiliar with GraphQL

## Database Design

### Schema Design

```sql
-- ✅ Normalized design (avoid redundancy)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ✅ Indexes for performance
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);

-- ✅ Denormalization when justified
-- (e.g., frequently accessed together, read-heavy)
CREATE TABLE post_summary (
  post_id UUID PRIMARY KEY REFERENCES posts(id),
  user_email VARCHAR(255),  -- Denormalized
  comment_count INT,         -- Cached aggregate
  updated_at TIMESTAMP
);
```

## Decision Making Framework

### 1. Document Architecture Decisions

Use ADRs (Architecture Decision Records):

```markdown
# ADR-001: Use PostgreSQL for Main Database

## Status
Accepted

## Context
Need to choose database for user data and transactions.

## Decision
Use PostgreSQL as primary database.

## Consequences

### Positive
- ACID compliance
- JSON support
- Strong ecosystem
- Our team knows it well

### Negative
- Scaling horizontally is harder than NoSQL
- More complex setup than MongoDB

## Alternatives Considered
- MongoDB: Good for flexibility, but we need ACID
- MySQL: Similar to Postgres, but less feature-rich
```

### 2. Evaluate Trade-offs

**Performance vs Maintainability**:
- Complex optimization may be fast but hard to maintain
- Choose simpler solution unless performance critical

**Flexibility vs Simplicity**:
- Generic solutions are flexible but complex
- Specific solutions are simple but limited
- Choose based on likelihood of change

**Build vs Buy**:
- Building: Full control, but time/maintenance cost
- Buying: Fast, but vendor lock-in, ongoing cost

## Architecture Checklist

Before finalizing architecture:

- [ ] **Scalability**: Can it handle 10x current load?
- [ ] **Maintainability**: Can new developers understand it?
- [ ] **Testability**: Can it be easily tested?
- [ ] **Security**: Are security concerns addressed?
- [ ] **Performance**: Does it meet performance requirements?
- [ ] **Cost**: Is operational cost acceptable?
- [ ] **Monitoring**: Can we observe system health?
- [ ] **Recovery**: Can we recover from failures?
- [ ] **Documentation**: Is architecture documented?

## Common Mistakes

### Mistake 1: Premature Optimization
**Problem**: Optimizing before knowing bottlenecks
**Solution**: Build simple, measure, then optimize

### Mistake 2: Over-Engineering
**Problem**: Building for scale you don't have
**Solution**: Start simple, refactor as needed

### Mistake 3: Tight Coupling
**Problem**: Components too dependent on each other
**Solution**: Use interfaces, dependency injection

### Mistake 4: No Abstraction Layers
**Problem**: Business logic mixed with infrastructure
**Solution**: Separate concerns with clear layers

### Mistake 5: Ignoring Trade-offs
**Problem**: Choosing solution without understanding costs
**Solution**: Document trade-offs in ADRs

## Remember

- **Architecture evolves**: Don't try to get it perfect upfront
- **Simple is better**: Start simple, add complexity when needed
- **Document decisions**: Future you will thank you
- **Consider team**: Best architecture is one your team can maintain
- **Trade-offs exist**: Every choice has pros and cons

**Good architecture enables change. Great architecture makes change easy.**
