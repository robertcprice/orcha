"""
Planning Layer for Orchestration System

This module provides pre-ChatGPT architectural analysis of user requests.
It identifies major components, dependencies, and requirements before detailed
task decomposition.

Author: AlgoMind Orchestration System
Date: 2025-10-11
"""

import logging
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum


class ComponentType(Enum):
    """Types of architectural components"""
    FRONTEND = "frontend"
    BACKEND = "backend"
    DATABASE = "database"
    AUTHENTICATION = "authentication"
    API = "api"
    MIDDLEWARE = "middleware"
    INFRASTRUCTURE = "infrastructure"
    TESTING = "testing"
    DOCUMENTATION = "documentation"


@dataclass
class ComponentRequirement:
    """Detailed requirements for a component"""

    component_type: ComponentType
    name: str
    description: str
    specific_requirements: List[str] = field(default_factory=list)
    dependencies: List[str] = field(default_factory=list)
    estimated_complexity: str = "medium"  # low, medium, high

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""

        return {
            'component_type': self.component_type.value,
            'name': self.name,
            'description': self.description,
            'specific_requirements': self.specific_requirements,
            'dependencies': self.dependencies,
            'estimated_complexity': self.estimated_complexity
        }


@dataclass
class ArchitecturalPlan:
    """Complete architectural plan for a project"""

    project_name: str
    project_description: str
    components: List[ComponentRequirement] = field(default_factory=list)
    technical_constraints: List[str] = field(default_factory=list)
    success_criteria: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""

        return {
            'project_name': self.project_name,
            'project_description': self.project_description,
            'components': [c.to_dict() for c in self.components],
            'technical_constraints': self.technical_constraints,
            'success_criteria': self.success_criteria
        }

    def get_component_summary(self) -> str:
        """Get formatted summary of components"""

        summary = f"## Architectural Plan: {self.project_name}\n\n"
        summary += f"{self.project_description}\n\n"
        summary += "### Components:\n\n"

        for comp in self.components:

            summary += f"**{comp.component_type.value.upper()}: {comp.name}**\n"
            summary += f"- Description: {comp.description}\n"

            if comp.specific_requirements:

                summary += f"- Requirements:\n"
                for req in comp.specific_requirements:
                    summary += f"  - {req}\n"

            if comp.dependencies:

                summary += f"- Dependencies: {', '.join(comp.dependencies)}\n"

            summary += f"- Complexity: {comp.estimated_complexity}\n\n"

        if self.technical_constraints:

            summary += "### Technical Constraints:\n"
            for constraint in self.technical_constraints:
                summary += f"- {constraint}\n"
            summary += "\n"

        if self.success_criteria:

            summary += "### Success Criteria:\n"
            for criterion in self.success_criteria:
                summary += f"- {criterion}\n"

        return summary


class PlanningLayer:
    """
    Analyzes user requests and creates detailed architectural plans
    before ChatGPT task decomposition.
    """

    def __init__(self, verbose: bool = True):
        """
        Initialize planning layer

        Args:
            verbose: Enable verbose logging
        """

        self.verbose = verbose
        self.logger = logging.getLogger(__name__)

    def analyze_request(self, title: str, description: str) -> ArchitecturalPlan:
        """
        Analyze user request and create architectural plan

        Args:
            title: Project title
            description: Detailed project description

        Returns:
            ArchitecturalPlan with components and requirements
        """

        if self.verbose:
            self.logger.info(f"Analyzing request: {title}")

        # Identify project type patterns
        project_patterns = self._identify_patterns(title, description)

        # Create base plan
        plan = ArchitecturalPlan(
            project_name=title,
            project_description=description
        )

        # Analyze and add components based on patterns
        if 'web_application' in project_patterns:
            self._add_web_app_components(plan, description)

        if 'social_features' in project_patterns:
            self._add_social_components(plan, description)

        if 'authentication' in project_patterns:
            self._add_auth_components(plan, description)

        if 'real_time' in project_patterns:
            self._add_realtime_components(plan, description)

        if 'api' in project_patterns:
            self._add_api_components(plan, description)

        if 'data_intensive' in project_patterns:
            self._add_data_components(plan, description)

        # Add testing and documentation (always needed)
        self._add_quality_components(plan)

        # Set technical constraints
        self._set_technical_constraints(plan, project_patterns)

        # Define success criteria
        self._set_success_criteria(plan, project_patterns)

        if self.verbose:
            self.logger.info(f"Plan created with {len(plan.components)} components")

        return plan

    def _identify_patterns(self, title: str, description: str) -> List[str]:
        """Identify project patterns from text"""

        patterns = []
        text = (title + " " + description).lower()

        # Web application patterns
        if any(word in text for word in ['web', 'website', 'webapp', 'application', 'app']):
            patterns.append('web_application')

        # Social features
        if any(word in text for word in ['social', 'twitter', 'facebook', 'posts', 'feed', 'follow', 'like', 'comment', 'share']):
            patterns.append('social_features')

        # Authentication
        if any(word in text for word in ['auth', 'login', 'signup', 'user', 'account', 'profile', 'register']):
            patterns.append('authentication')

        # Real-time features
        if any(word in text for word in ['real-time', 'realtime', 'live', 'chat', 'messaging', 'notification', 'websocket']):
            patterns.append('real_time')

        # API
        if any(word in text for word in ['api', 'rest', 'graphql', 'endpoint']):
            patterns.append('api')

        # Data-intensive
        if any(word in text for word in ['dashboard', 'analytics', 'data', 'visualization', 'report', 'metrics']):
            patterns.append('data_intensive')

        return patterns

    def _add_web_app_components(self, plan: ArchitecturalPlan, description: str):
        """Add web application components"""

        # Frontend
        plan.components.append(ComponentRequirement(
            component_type=ComponentType.FRONTEND,
            name="React Frontend",
            description="Client-side web application",
            specific_requirements=[
                "React 18+ with TypeScript",
                "Responsive design (mobile, tablet, desktop)",
                "Component-based architecture",
                "State management (Redux or Context API)",
                "Routing (React Router)",
                "Form validation",
                "Loading states and error handling"
            ],
            dependencies=["Backend API"],
            estimated_complexity="high"
        ))

        # Backend
        plan.components.append(ComponentRequirement(
            component_type=ComponentType.BACKEND,
            name="Node.js Backend",
            description="Server-side application logic",
            specific_requirements=[
                "Express.js or Fastify framework",
                "TypeScript for type safety",
                "RESTful API design",
                "Request validation and sanitization",
                "Error handling middleware",
                "Logging (Winston or Pino)",
                "Environment configuration"
            ],
            dependencies=["Database"],
            estimated_complexity="high"
        ))

        # Database
        plan.components.append(ComponentRequirement(
            component_type=ComponentType.DATABASE,
            name="PostgreSQL Database",
            description="Persistent data storage",
            specific_requirements=[
                "PostgreSQL 14+ with proper schema design",
                "Migrations system (e.g., Prisma or TypeORM)",
                "Indexes for performance",
                "Foreign key constraints",
                "Proper data types (UUID, TIMESTAMP, etc.)",
                "Connection pooling"
            ],
            dependencies=[],
            estimated_complexity="medium"
        ))

    def _add_social_components(self, plan: ArchitecturalPlan, description: str):
        """Add social media components"""

        # Check if database component exists
        db_exists = any(c.component_type == ComponentType.DATABASE for c in plan.components)

        if db_exists:
            # Add to database requirements

            for comp in plan.components:

                if comp.component_type == ComponentType.DATABASE:

                    comp.specific_requirements.extend([
                        "Posts table: id (UUID), user_id (UUID FK), content (VARCHAR 280), created_at (TIMESTAMP), likes_count (INT), shares_count (INT)",
                        "Users table: id (UUID), username (VARCHAR 50 UNIQUE), email (VARCHAR 255 UNIQUE), bio (TEXT), avatar_url (VARCHAR 500), created_at (TIMESTAMP)",
                        "Followers table: id (UUID), follower_id (UUID FK), following_id (UUID FK), created_at (TIMESTAMP), UNIQUE(follower_id, following_id)",
                        "Likes table: id (UUID), user_id (UUID FK), post_id (UUID FK), created_at (TIMESTAMP), UNIQUE(user_id, post_id)",
                        "Comments table: id (UUID), user_id (UUID FK), post_id (UUID FK), content (TEXT), created_at (TIMESTAMP)"
                    ])

        # Add social features to backend
        for comp in plan.components:

            if comp.component_type == ComponentType.BACKEND:

                comp.specific_requirements.extend([
                    "POST /api/posts - Create new post (authenticated)",
                    "GET /api/posts - Get feed with pagination",
                    "POST /api/posts/:id/like - Like/unlike post",
                    "POST /api/posts/:id/comment - Add comment",
                    "POST /api/users/:id/follow - Follow/unfollow user",
                    "GET /api/users/:id/followers - Get followers list",
                    "GET /api/users/:id/following - Get following list"
                ])

        # Add social UI components to frontend
        for comp in plan.components:

            if comp.component_type == ComponentType.FRONTEND:

                comp.specific_requirements.extend([
                    "PostFeed component with infinite scroll",
                    "PostCard component with like/comment/share actions",
                    "CreatePost component with character counter (280 max)",
                    "UserProfile component with bio and stats",
                    "FollowButton component with optimistic updates",
                    "CommentThread component"
                ])

    def _add_auth_components(self, plan: ArchitecturalPlan, description: str):
        """Add authentication components"""

        plan.components.append(ComponentRequirement(
            component_type=ComponentType.AUTHENTICATION,
            name="JWT Authentication",
            description="Secure user authentication and authorization",
            specific_requirements=[
                "JWT token generation and validation",
                "POST /api/auth/register - User registration with email verification",
                "POST /api/auth/login - User login with credentials",
                "POST /api/auth/logout - Token invalidation",
                "POST /api/auth/refresh - Token refresh",
                "Password hashing with bcrypt (10+ rounds)",
                "Protected route middleware",
                "Rate limiting for auth endpoints",
                "Session management"
            ],
            dependencies=["Database", "Backend"],
            estimated_complexity="medium"
        ))

    def _add_realtime_components(self, plan: ArchitecturalPlan, description: str):
        """Add real-time feature components"""

        plan.components.append(ComponentRequirement(
            component_type=ComponentType.MIDDLEWARE,
            name="WebSocket Server",
            description="Real-time bidirectional communication",
            specific_requirements=[
                "Socket.io or native WebSocket implementation",
                "Real-time notifications for likes, comments, follows",
                "Live feed updates when new posts are created",
                "Connection authentication",
                "Room-based broadcasting",
                "Reconnection handling",
                "Message queuing for offline users"
            ],
            dependencies=["Backend"],
            estimated_complexity="high"
        ))

    def _add_api_components(self, plan: ArchitecturalPlan, description: str):
        """Add API-specific components"""

        plan.components.append(ComponentRequirement(
            component_type=ComponentType.API,
            name="RESTful API",
            description="Standardized API interface",
            specific_requirements=[
                "Consistent URL structure and naming",
                "Proper HTTP methods (GET, POST, PUT, DELETE)",
                "Status codes (200, 201, 400, 401, 404, 500)",
                "Request/response validation with schemas",
                "Pagination for list endpoints (cursor or offset)",
                "Filtering and sorting query parameters",
                "API versioning (/api/v1/...)",
                "CORS configuration",
                "Rate limiting per user/IP"
            ],
            dependencies=["Backend"],
            estimated_complexity="medium"
        ))

    def _add_data_components(self, plan: ArchitecturalPlan, description: str):
        """Add data-intensive components"""

        # Check if database exists and enhance it
        for comp in plan.components:

            if comp.component_type == ComponentType.DATABASE:

                comp.specific_requirements.extend([
                    "Analytics table for tracking user actions",
                    "Materialized views for aggregated data",
                    "Proper indexing for query performance",
                    "Query optimization for large datasets"
                ])

        # Add caching layer
        plan.components.append(ComponentRequirement(
            component_type=ComponentType.MIDDLEWARE,
            name="Redis Cache",
            description="High-performance caching layer",
            specific_requirements=[
                "Redis for session storage",
                "Cache frequently accessed data (user profiles, popular posts)",
                "Cache invalidation strategy",
                "TTL configuration for different data types",
                "Connection pooling"
            ],
            dependencies=["Backend"],
            estimated_complexity="low"
        ))

    def _add_quality_components(self, plan: ArchitecturalPlan):
        """Add testing and documentation components"""

        plan.components.append(ComponentRequirement(
            component_type=ComponentType.TESTING,
            name="Test Suite",
            description="Comprehensive testing infrastructure",
            specific_requirements=[
                "Unit tests for backend logic (Jest or Vitest)",
                "Integration tests for API endpoints",
                "Frontend component tests (React Testing Library)",
                "E2E tests for critical flows (Playwright or Cypress)",
                "Test coverage > 80%",
                "CI/CD integration"
            ],
            dependencies=["Frontend", "Backend"],
            estimated_complexity="medium"
        ))

        plan.components.append(ComponentRequirement(
            component_type=ComponentType.DOCUMENTATION,
            name="Project Documentation",
            description="Developer and user documentation",
            specific_requirements=[
                "README with setup instructions",
                "API documentation (Swagger/OpenAPI)",
                "Database schema diagrams",
                "Architecture decision records (ADRs)",
                "Deployment guide",
                "User guide for features"
            ],
            dependencies=[],
            estimated_complexity="low"
        ))

    def _set_technical_constraints(self, plan: ArchitecturalPlan, patterns: List[str]):
        """Set technical constraints based on patterns"""

        plan.technical_constraints.extend([
            "Must use TypeScript for type safety",
            "Must handle errors gracefully with user-friendly messages",
            "Must be responsive across devices",
            "Must follow REST API best practices"
        ])

        if 'social_features' in patterns:

            plan.technical_constraints.extend([
                "Post character limit: 280 characters",
                "Must prevent duplicate likes/follows",
                "Must handle high concurrent users"
            ])

        if 'real_time' in patterns:

            plan.technical_constraints.append("Must support real-time updates with <100ms latency")

        if 'authentication' in patterns:

            plan.technical_constraints.extend([
                "Must follow OWASP security guidelines",
                "Must use HTTPS in production",
                "Passwords must be hashed (never plain text)"
            ])

    def _set_success_criteria(self, plan: ArchitecturalPlan, patterns: List[str]):
        """Define success criteria"""

        plan.success_criteria.extend([
            "All components successfully integrated",
            "All tests passing (>80% coverage)",
            "Application runs without errors",
            "API endpoints respond within 200ms (95th percentile)"
        ])

        if 'social_features' in patterns:

            plan.success_criteria.extend([
                "Users can create, like, and comment on posts",
                "Users can follow/unfollow other users",
                "Feed displays posts from followed users"
            ])

        if 'authentication' in patterns:

            plan.success_criteria.extend([
                "Users can register and login securely",
                "Protected routes require authentication",
                "Sessions persist across page refreshes"
            ])


def main():
    """Example usage"""

    logging.basicConfig(level=logging.INFO)

    planner = PlanningLayer(verbose=True)

    # Example: Twitter-like app
    plan = planner.analyze_request(
        title="Twitter-like Social Media Platform",
        description="""
        Build a web application similar to Twitter where users can:
        - Create an account and login
        - Post short messages (up to 280 characters)
        - View a feed of posts from users they follow
        - Like and comment on posts
        - Follow and unfollow other users
        - View user profiles with their posts and followers
        """
    )

    print(plan.get_component_summary())


if __name__ == "__main__":
    main()
