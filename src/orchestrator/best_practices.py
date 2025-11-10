#!/usr/bin/env python3
"""
Best Practices Database

A knowledge base of best practices, patterns, and recommendations
for common software development tasks. Used by the hybrid planner
to enrich execution plans with proven approaches.
"""

from typing import Dict, List, Optional, Set
from dataclasses import dataclass, field
from enum import Enum


class TaskCategory(Enum):
    """Categories of development tasks"""
    WEB_API = "web_api"
    DATABASE = "database"
    AUTHENTICATION = "authentication"
    TESTING = "testing"
    DEPLOYMENT = "deployment"
    FRONTEND = "frontend"
    BACKEND = "backend"
    MICROSERVICES = "microservices"
    DATA_PROCESSING = "data_processing"
    SECURITY = "security"
    PERFORMANCE = "performance"
    DOCUMENTATION = "documentation"
    GENERAL = "general"


@dataclass
class BestPractice:
    """A best practice recommendation"""
    id: str
    category: TaskCategory
    title: str
    description: str
    when_to_apply: str
    benefits: List[str]
    examples: List[str] = field(default_factory=list)
    related_patterns: List[str] = field(default_factory=list)
    pitfalls_to_avoid: List[str] = field(default_factory=list)
    technologies: List[str] = field(default_factory=list)


@dataclass
class Pattern:
    """A design or architecture pattern"""
    id: str
    name: str
    category: TaskCategory
    description: str
    use_cases: List[str]
    implementation_notes: str
    code_examples: List[str] = field(default_factory=list)
    pros: List[str] = field(default_factory=list)
    cons: List[str] = field(default_factory=list)


class BestPracticesDB:
    """
    Database of best practices and patterns.

    Provides:
    - Best practice lookup by category
    - Pattern matching for tasks
    - Recommendations for specific scenarios
    """

    def __init__(self):
        self.practices: Dict[str, BestPractice] = {}
        self.patterns: Dict[str, Pattern] = {}
        self.category_index: Dict[TaskCategory, Set[str]] = {cat: set() for cat in TaskCategory}

        # Initialize with common best practices
        self._load_default_practices()
        self._load_default_patterns()

    def _load_default_practices(self):
        """Load default best practices."""
        practices = [
            BestPractice(
                id="api_versioning",
                category=TaskCategory.WEB_API,
                title="API Versioning",
                description="Always version your APIs to allow for future changes without breaking existing clients",
                when_to_apply="When building any REST or GraphQL API",
                benefits=[
                    "Backwards compatibility",
                    "Smooth migrations",
                    "Clear deprecation path"
                ],
                examples=[
                    "/api/v1/users",
                    "/api/v2/users",
                    "Accept: application/vnd.myapi.v1+json"
                ],
                pitfalls_to_avoid=[
                    "Not versioning from the start",
                    "Too frequent version bumps",
                    "No deprecation strategy"
                ],
                technologies=["REST", "GraphQL", "gRPC"]
            ),
            BestPractice(
                id="input_validation",
                category=TaskCategory.SECURITY,
                title="Input Validation",
                description="Validate all user input on both client and server side",
                when_to_apply="For all endpoints that accept user data",
                benefits=[
                    "Prevent injection attacks",
                    "Data integrity",
                    "Better error messages"
                ],
                examples=[
                    "Validate email format",
                    "Sanitize HTML input",
                    "Check type and range constraints"
                ],
                pitfalls_to_avoid=[
                    "Client-side validation only",
                    "Trusting any input",
                    "Insufficient sanitization"
                ],
                technologies=["Pydantic", "Joi", "Zod", "express-validator"]
            ),
            BestPractice(
                id="error_handling",
                category=TaskCategory.GENERAL,
                title="Comprehensive Error Handling",
                description="Implement proper error handling with meaningful messages and appropriate logging",
                when_to_apply="Throughout all application code",
                benefits=[
                    "Better debugging",
                    "Improved user experience",
                    "Easier monitoring"
                ],
                examples=[
                    "Try-catch blocks with specific exceptions",
                    "Custom error classes",
                    "Structured error responses"
                ],
                pitfalls_to_avoid=[
                    "Swallowing exceptions silently",
                    "Generic error messages",
                    "Exposing stack traces to users"
                ],
                technologies=["Python", "JavaScript", "TypeScript"]
            ),
            BestPractice(
                id="database_migrations",
                category=TaskCategory.DATABASE,
                title="Database Migrations",
                description="Use migration tools to version and manage database schema changes",
                when_to_apply="For any application with a database",
                benefits=[
                    "Reproducible schema changes",
                    "Easy rollback",
                    "Team collaboration"
                ],
                examples=[
                    "Alembic for SQLAlchemy",
                    "Prisma migrations",
                    "Flyway for Java"
                ],
                pitfalls_to_avoid=[
                    "Manual schema changes",
                    "No rollback strategy",
                    "Destructive migrations in production"
                ],
                technologies=["Alembic", "Prisma", "TypeORM", "Flyway"]
            ),
            BestPractice(
                id="env_configuration",
                category=TaskCategory.DEPLOYMENT,
                title="Environment-based Configuration",
                description="Use environment variables for configuration, never hardcode secrets",
                when_to_apply="For all deployments and environments",
                benefits=[
                    "Security (no secrets in code)",
                    "Environment flexibility",
                    "Easy deployment"
                ],
                examples=[
                    ".env files for development",
                    "Secret managers for production",
                    "Config maps in Kubernetes"
                ],
                pitfalls_to_avoid=[
                    "Hardcoded credentials",
                    "Committing .env files",
                    "No default values"
                ],
                technologies=["dotenv", "AWS Secrets Manager", "Vault"]
            ),
            BestPractice(
                id="jwt_auth",
                category=TaskCategory.AUTHENTICATION,
                title="JWT Token Authentication",
                description="Use JWT tokens with refresh token rotation for stateless authentication",
                when_to_apply="For modern web and mobile APIs",
                benefits=[
                    "Stateless authentication",
                    "Scalability",
                    "Cross-domain support"
                ],
                examples=[
                    "Access token (short-lived)",
                    "Refresh token (long-lived)",
                    "Token rotation on refresh"
                ],
                pitfalls_to_avoid=[
                    "Storing sensitive data in JWT",
                    "No token expiration",
                    "Not validating signatures"
                ],
                technologies=["PyJWT", "jsonwebtoken", "jose"]
            ),
            BestPractice(
                id="test_pyramid",
                category=TaskCategory.TESTING,
                title="Testing Pyramid",
                description="More unit tests, fewer integration tests, minimal E2E tests",
                when_to_apply="For all codebases with automated testing",
                benefits=[
                    "Fast feedback",
                    "Easier debugging",
                    "Better test maintainability"
                ],
                examples=[
                    "70% unit tests",
                    "20% integration tests",
                    "10% E2E tests"
                ],
                pitfalls_to_avoid=[
                    "Too many slow E2E tests",
                    "No unit tests",
                    "Testing implementation details"
                ],
                technologies=["pytest", "Jest", "JUnit", "Playwright"]
            ),
            BestPractice(
                id="api_rate_limiting",
                category=TaskCategory.WEB_API,
                title="API Rate Limiting",
                description="Implement rate limiting to prevent abuse and ensure fair usage",
                when_to_apply="For all public and high-traffic APIs",
                benefits=[
                    "Prevent DoS attacks",
                    "Fair resource allocation",
                    "Cost control"
                ],
                examples=[
                    "Token bucket algorithm",
                    "Fixed window counter",
                    "Sliding window log"
                ],
                pitfalls_to_avoid=[
                    "No rate limiting",
                    "Same limits for all users",
                    "No rate limit headers"
                ],
                technologies=["Redis", "Nginx", "AWS API Gateway"]
            ),
            BestPractice(
                id="logging_structured",
                category=TaskCategory.GENERAL,
                title="Structured Logging",
                description="Use structured logging with log levels and contextual information",
                when_to_apply="Throughout application code",
                benefits=[
                    "Better searchability",
                    "Easier debugging",
                    "Better monitoring integration"
                ],
                examples=[
                    "JSON-formatted logs",
                    "Log levels (debug, info, warning, error)",
                    "Correlation IDs"
                ],
                pitfalls_to_avoid=[
                    "Print statements instead of logging",
                    "No log levels",
                    "Logging sensitive data"
                ],
                technologies=["structlog", "winston", "logrus", "pino"]
            ),
            BestPractice(
                id="code_review",
                category=TaskCategory.GENERAL,
                title="Code Review Process",
                description="Implement mandatory code reviews before merging",
                when_to_apply="For all production code changes",
                benefits=[
                    "Catch bugs early",
                    "Knowledge sharing",
                    "Code quality consistency"
                ],
                examples=[
                    "Pull request reviews",
                    "Pair programming",
                    "Automated code analysis"
                ],
                pitfalls_to_avoid=[
                    "Rubber stamp approvals",
                    "Too large PRs",
                    "No review guidelines"
                ],
                technologies=["GitHub", "GitLab", "Gerrit"]
            )
        ]

        for practice in practices:
            self.add_practice(practice)

    def _load_default_patterns(self):
        """Load default design patterns."""
        patterns = [
            Pattern(
                id="repository_pattern",
                name="Repository Pattern",
                category=TaskCategory.DATABASE,
                description="Abstraction layer between data access and business logic",
                use_cases=[
                    "When you need to decouple business logic from data access",
                    "When you want to switch databases easily",
                    "When you need centralized data access logic"
                ],
                implementation_notes="Create repository classes that handle all database operations for specific entities",
                code_examples=[
                    "class UserRepository:\n    def get_by_id(self, id): ...\n    def save(self, user): ...",
                ],
                pros=[
                    "Testability (can mock repositories)",
                    "Single point of change for data access",
                    "Database-agnostic business logic"
                ],
                cons=[
                    "Additional abstraction layer",
                    "Can be over-engineering for simple apps"
                ]
            ),
            Pattern(
                id="circuit_breaker",
                name="Circuit Breaker Pattern",
                category=TaskCategory.MICROSERVICES,
                description="Prevent cascading failures in distributed systems",
                use_cases=[
                    "Microservices communication",
                    "External API calls",
                    "Any distributed system with failure potential"
                ],
                implementation_notes="Monitor failures, open circuit after threshold, half-open for testing recovery",
                pros=[
                    "Prevents cascading failures",
                    "Faster failure detection",
                    "Automatic recovery"
                ],
                cons=[
                    "Complexity",
                    "Configuration tuning needed"
                ]
            ),
            Pattern(
                id="factory_pattern",
                name="Factory Pattern",
                category=TaskCategory.GENERAL,
                description="Create objects without specifying exact class",
                use_cases=[
                    "When object creation is complex",
                    "When you need flexibility in object types",
                    "When you want to centralize object creation"
                ],
                implementation_notes="Create factory class/function that returns instances based on parameters",
                pros=[
                    "Loose coupling",
                    "Single responsibility",
                    "Easy to extend"
                ],
                cons=[
                    "Can add complexity",
                    "More code to maintain"
                ]
            ),
            Pattern(
                id="saga_pattern",
                name="Saga Pattern",
                category=TaskCategory.MICROSERVICES,
                description="Manage distributed transactions across microservices",
                use_cases=[
                    "Long-running transactions",
                    "Cross-service operations",
                    "When 2PC is not suitable"
                ],
                implementation_notes="Chain of local transactions with compensating actions for rollback",
                pros=[
                    "Better availability",
                    "Handles long transactions",
                    "No distributed locks"
                ],
                cons=[
                    "Complex error handling",
                    "Eventual consistency",
                    "Harder to debug"
                ]
            ),
            Pattern(
                id="cqrs",
                name="CQRS (Command Query Responsibility Segregation)",
                category=TaskCategory.BACKEND,
                description="Separate read and write operations",
                use_cases=[
                    "High-performance systems",
                    "Different read/write requirements",
                    "Event sourcing architectures"
                ],
                implementation_notes="Separate models and handlers for commands (write) and queries (read)",
                pros=[
                    "Optimized read/write models",
                    "Better scalability",
                    "Clear separation of concerns"
                ],
                cons=[
                    "Increased complexity",
                    "Eventual consistency challenges",
                    "More code to maintain"
                ]
            )
        ]

        for pattern in patterns:
            self.add_pattern(pattern)

    def add_practice(self, practice: BestPractice):
        """Add a best practice to the database."""
        self.practices[practice.id] = practice
        self.category_index[practice.category].add(practice.id)

    def add_pattern(self, pattern: Pattern):
        """Add a pattern to the database."""
        self.patterns[pattern.id] = pattern
        self.category_index[pattern.category].add(pattern.id)

    def get_practices_by_category(self, category: TaskCategory) -> List[BestPractice]:
        """Get all best practices for a category."""
        practice_ids = self.category_index[category]
        return [self.practices[pid] for pid in practice_ids if pid in self.practices]

    def get_patterns_by_category(self, category: TaskCategory) -> List[Pattern]:
        """Get all patterns for a category."""
        pattern_ids = self.category_index[category]
        return [self.patterns[pid] for pid in pattern_ids if pid in self.patterns]

    def find_relevant_practices(self, task_description: str, max_results: int = 5) -> List[BestPractice]:
        """
        Find best practices relevant to a task description.

        Uses keyword matching to find applicable practices.
        """
        task_lower = task_description.lower()
        keywords_to_category = {
            "api": TaskCategory.WEB_API,
            "rest": TaskCategory.WEB_API,
            "endpoint": TaskCategory.WEB_API,
            "graphql": TaskCategory.WEB_API,
            "database": TaskCategory.DATABASE,
            "sql": TaskCategory.DATABASE,
            "postgres": TaskCategory.DATABASE,
            "mongodb": TaskCategory.DATABASE,
            "auth": TaskCategory.AUTHENTICATION,
            "login": TaskCategory.AUTHENTICATION,
            "jwt": TaskCategory.AUTHENTICATION,
            "test": TaskCategory.TESTING,
            "unittest": TaskCategory.TESTING,
            "deploy": TaskCategory.DEPLOYMENT,
            "docker": TaskCategory.DEPLOYMENT,
            "kubernetes": TaskCategory.DEPLOYMENT,
            "frontend": TaskCategory.FRONTEND,
            "react": TaskCategory.FRONTEND,
            "vue": TaskCategory.FRONTEND,
            "backend": TaskCategory.BACKEND,
            "microservice": TaskCategory.MICROSERVICES,
            "security": TaskCategory.SECURITY,
            "performance": TaskCategory.PERFORMANCE,
            "optimization": TaskCategory.PERFORMANCE,
        }

        # Determine relevant categories
        relevant_categories = set()
        for keyword, category in keywords_to_category.items():
            if keyword in task_lower:
                relevant_categories.add(category)

        # If no specific categories found, include general practices
        if not relevant_categories:
            relevant_categories.add(TaskCategory.GENERAL)
        else:
            # Always include general practices
            relevant_categories.add(TaskCategory.GENERAL)

        # Collect practices from relevant categories
        all_practices = []
        for category in relevant_categories:
            all_practices.extend(self.get_practices_by_category(category))

        # Return top results
        return all_practices[:max_results]

    def find_relevant_patterns(self, task_description: str, max_results: int = 3) -> List[Pattern]:
        """
        Find design patterns relevant to a task description.
        """
        task_lower = task_description.lower()

        # Collect all patterns and score them based on relevance
        scored_patterns = []
        for pattern in self.patterns.values():
            score = 0

            # Check if task description mentions pattern keywords
            if pattern.name.lower() in task_lower:
                score += 10

            # Check use cases
            for use_case in pattern.use_cases:
                if any(word in task_lower for word in use_case.lower().split()):
                    score += 2

            if score > 0:
                scored_patterns.append((score, pattern))

        # Sort by score and return top results
        scored_patterns.sort(reverse=True, key=lambda x: x[0])
        return [p for _, p in scored_patterns[:max_results]]

    def get_recommendations(self, task_description: str, category: Optional[TaskCategory] = None) -> Dict[str, List]:
        """
        Get comprehensive recommendations for a task.

        Returns:
            Dict with 'practices' and 'patterns' lists
        """
        if category:
            practices = self.get_practices_by_category(category)
            patterns = self.get_patterns_by_category(category)
        else:
            practices = self.find_relevant_practices(task_description)
            patterns = self.find_relevant_patterns(task_description)

        return {
            "practices": practices,
            "patterns": patterns
        }


# Global instance
_db_instance = None


def get_best_practices_db() -> BestPracticesDB:
    """Get the global best practices database instance."""
    global _db_instance
    if _db_instance is None:
        _db_instance = BestPracticesDB()
    return _db_instance


# Example usage
if __name__ == "__main__":
    db = get_best_practices_db()

    # Find recommendations for a task
    task = "Build a REST API with user authentication"
    recommendations = db.get_recommendations(task)

    print(f"Recommendations for: {task}\n")
    print(f"Best Practices ({len(recommendations['practices'])}):")
    for practice in recommendations['practices']:
        print(f"  - {practice.title}: {practice.description}")

    print(f"\nDesign Patterns ({len(recommendations['patterns'])}):")
    for pattern in recommendations['patterns']:
        print(f"  - {pattern.name}: {pattern.description}")
