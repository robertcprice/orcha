# Security Skill

This skill ensures security best practices are followed in all code.

## When to Use This Skill

**MANDATORY**: Use this skill when:
- Writing any code that handles user input
- Implementing authentication/authorization
- Working with APIs or databases
- Handling sensitive data
- Deploying to production

## OWASP Top 10 Prevention

### 1. Injection Prevention

**SQL Injection**:
```typescript
// ❌ NEVER: String concatenation
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ ALWAYS: Parameterized queries
const query = 'SELECT * FROM users WHERE id = ?';
db.execute(query, [userId]);

// ✅ BETTER: Use ORM
const user = await prisma.user.findUnique({ where: { id: userId } });
```

**Command Injection**:
```typescript
// ❌ NEVER: Direct shell execution with user input
exec(`ls ${userProvidedPath}`);

// ✅ ALWAYS: Validate and sanitize
const safePath = path.normalize(userProvidedPath);
if (!safePath.startsWith(ALLOWED_BASE_PATH)) {
  throw new Error('Invalid path');
}
```

**NoSQL Injection**:
```typescript
// ❌ NEVER: Direct object assignment
db.collection.find({ username: req.body.username });

// ✅ ALWAYS: Validate input type
const username = String(req.body.username);
if (!/^[a-zA-Z0-9_]+$/.test(username)) {
  throw new Error('Invalid username');
}
db.collection.find({ username });
```

### 2. Authentication & Session Management

**Password Handling**:
```typescript
// ❌ NEVER: Plain text passwords
const user = { password: req.body.password };

// ❌ NEVER: Weak hashing (MD5, SHA1)
const hash = md5(password);

// ✅ ALWAYS: Strong hashing with salt
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash(password, 10);

// ✅ Verify password
const isValid = await bcrypt.compare(inputPassword, storedHash);
```

**Session Management**:
```typescript
// ✅ Secure session configuration
app.use(session({
  secret: process.env.SESSION_SECRET, // Strong, random secret
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,      // HTTPS only
    httpOnly: true,    // No JavaScript access
    maxAge: 3600000,   // 1 hour expiry
    sameSite: 'strict' // CSRF protection
  }
}));
```

**JWT Best Practices**:
```typescript
// ✅ Secure JWT implementation
import jwt from 'jsonwebtoken';

// Generate token
const token = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '1h', algorithm: 'HS256' }
);

// Verify token
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
} catch (err) {
  // Handle invalid/expired token
}
```

### 3. Cross-Site Scripting (XSS) Prevention

**Output Encoding**:
```typescript
// ❌ NEVER: Direct HTML injection
element.innerHTML = userInput;

// ✅ ALWAYS: Use safe methods
element.textContent = userInput;

// ✅ React auto-escapes
return <div>{userInput}</div>;

// ⚠️ DANGER: Only use dangerouslySetInnerHTML with sanitized content
import DOMPurify from 'isomorphic-dompurify';
const sanitized = DOMPurify.sanitize(userInput);
return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
```

**Input Validation**:
```typescript
// ✅ Validate and sanitize input
import validator from 'validator';

function validateEmail(email: string): boolean {
  return validator.isEmail(email);
}

function sanitizeInput(input: string): string {
  return validator.escape(input);
}
```

### 4. CSRF Prevention

**CSRF Token**:
```typescript
// ✅ Use CSRF protection middleware
import csrf from 'csurf';

app.use(csrf({ cookie: true }));

// In form
<input type="hidden" name="_csrf" value={req.csrfToken()} />

// In API calls
fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'CSRF-Token': csrfToken
  }
});
```

**SameSite Cookies**:
```typescript
// ✅ Set SameSite attribute
res.cookie('session', sessionId, {
  sameSite: 'strict',
  secure: true,
  httpOnly: true
});
```

### 5. Access Control

**Authorization Checks**:
```typescript
// ❌ NEVER: Trust client-side authorization
if (userRole === 'admin') { // Don't rely on client state
  showAdminPanel();
}

// ✅ ALWAYS: Verify on server
export async function GET(request: Request) {
  const session = await getSession(request);

  if (!session || session.role !== 'admin') {
    return new Response('Unauthorized', { status: 403 });
  }

  // Proceed with authorized action
}
```

**Resource Ownership**:
```typescript
// ✅ Verify user owns resource
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession(request);
  const resource = await db.resource.findUnique({ where: { id: params.id } });

  if (resource.ownerId !== session.userId) {
    return new Response('Forbidden', { status: 403 });
  }

  await db.resource.delete({ where: { id: params.id } });
}
```

### 6. Sensitive Data Exposure

**Encryption at Rest**:
```typescript
// ✅ Encrypt sensitive data
import crypto from 'crypto';

function encrypt(text: string): string {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}
```

**HTTPS Only**:
```typescript
// ✅ Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

**Secure Headers**:
```typescript
// ✅ Set security headers
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### 7. Rate Limiting & DoS Prevention

**API Rate Limiting**:
```typescript
// ✅ Implement rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

app.use('/api/', limiter);
```

**Request Size Limiting**:
```typescript
// ✅ Limit request body size
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
```

### 8. File Upload Security

**File Upload Validation**:
```typescript
// ✅ Validate file uploads
import multer from 'multer';
import path from 'path';

const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

## Security Checklist

Before deploying code:

### Authentication & Authorization
- [ ] Passwords hashed with bcrypt (cost factor ≥10)
- [ ] Session tokens cryptographically random
- [ ] JWT tokens expire (≤1 hour for sensitive operations)
- [ ] Authorization checked on server, not client
- [ ] Resource ownership verified before access
- [ ] No hardcoded credentials

### Input Validation
- [ ] All user input validated
- [ ] SQL queries use parameterized statements or ORM
- [ ] File uploads restricted by type and size
- [ ] Path traversal prevented (no ../../../)
- [ ] Email/URL validation for expected formats
- [ ] Integer overflow checks for numeric inputs

### Output Encoding
- [ ] HTML output escaped (XSS prevention)
- [ ] JSON responses properly encoded
- [ ] Content-Type headers set correctly
- [ ] No user input in innerHTML without sanitization

### API Security
- [ ] HTTPS enforced in production
- [ ] CORS configured appropriately
- [ ] CSRF protection enabled
- [ ] Rate limiting implemented
- [ ] Request size limits set
- [ ] Security headers configured (CSP, HSTS, etc.)

### Data Protection
- [ ] Sensitive data encrypted at rest
- [ ] TLS/SSL for data in transit
- [ ] No secrets in code or version control
- [ ] Secrets loaded from environment variables
- [ ] Database credentials secured
- [ ] API keys rotated regularly

### Error Handling
- [ ] No stack traces leaked to users
- [ ] Generic error messages for authentication failures
- [ ] Detailed errors logged server-side only
- [ ] No sensitive data in error messages

### Dependency Security
- [ ] Dependencies up to date
- [ ] No known vulnerabilities (npm audit)
- [ ] Minimal dependency footprint
- [ ] Dependencies from trusted sources

## Common Vulnerabilities to Avoid

### 1. Hardcoded Secrets
```typescript
// ❌ NEVER
const API_KEY = "sk-1234567890abcdef";

// ✅ ALWAYS
const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error('API_KEY not set');
```

### 2. Insecure Randomness
```typescript
// ❌ NEVER: Math.random() for security
const token = Math.random().toString(36);

// ✅ ALWAYS: Crypto random
import crypto from 'crypto';
const token = crypto.randomBytes(32).toString('hex');
```

### 3. Timing Attacks
```typescript
// ❌ NEVER: String comparison
if (userToken === storedToken) { ... }

// ✅ ALWAYS: Constant-time comparison
import crypto from 'crypto';
const isValid = crypto.timingSafeEqual(
  Buffer.from(userToken),
  Buffer.from(storedToken)
);
```

### 4. Mass Assignment
```typescript
// ❌ NEVER: Direct assignment of user input
const user = await User.create(req.body);

// ✅ ALWAYS: Explicitly allow fields
const { name, email } = req.body;
const user = await User.create({ name, email });
```

### 5. Insecure Deserialization
```typescript
// ❌ NEVER: Deserialize untrusted data
const obj = eval(userInput);

// ✅ ALWAYS: Use safe parsing with validation
const obj = JSON.parse(userInput);
// Then validate obj structure
```

## Environment-Specific Security

### Development
```typescript
// ✅ Development-only features
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // Verbose logging
  // Enable debug endpoints
}
```

### Production
```typescript
// ✅ Production hardening
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy
  app.use(helmet()); // Security headers
  app.use(compression()); // Compress responses
  // Disable debug features
}
```

## Security Testing

### Manual Testing
- [ ] Test with malicious input (SQL injection attempts)
- [ ] Test authentication bypass attempts
- [ ] Test authorization with different user roles
- [ ] Test CSRF protection
- [ ] Test rate limiting
- [ ] Test file upload restrictions

### Automated Testing
```typescript
// Example security test
describe('Authentication', () => {
  it('should reject SQL injection attempts', async () => {
    const response = await request(app)
      .post('/login')
      .send({ username: "admin' OR '1'='1", password: 'test' });

    expect(response.status).toBe(401);
  });

  it('should enforce rate limiting', async () => {
    const requests = Array(101).fill(null).map(() =>
      request(app).get('/api/endpoint')
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);

    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

## Security Resources

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **OWASP Cheat Sheets**: https://cheatsheetseries.owasp.org/
- **Node.js Security Best Practices**: https://nodejs.org/en/docs/guides/security/
- **npm audit**: Check for vulnerable dependencies

## Remember

- **Security is not optional**: It's a requirement
- **Defense in depth**: Multiple layers of security
- **Principle of least privilege**: Grant minimum necessary access
- **Fail securely**: Errors should deny access, not grant it
- **Never trust user input**: Validate everything
- **Keep secrets secret**: Use environment variables, not code

**If you're unsure about security implications, ASK before implementing.**
