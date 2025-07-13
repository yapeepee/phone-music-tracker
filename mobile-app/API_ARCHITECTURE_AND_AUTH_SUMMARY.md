# Music Tracker API Architecture and Authentication/Authorization Summary

## API Architecture Overview

### Base Structure
- **Framework**: FastAPI (Python)
- **Base URL**: `/api/v1`
- **Main Entry Point**: `app/main.py`
- **API Router**: `app/api/v1/api.py`

### Directory Structure
```
backend/app/
├── api/
│   ├── deps.py              # Authentication dependencies
│   └── v1/
│       ├── api.py           # Main API router aggregation
│       ├── auth.py          # Authentication endpoints
│       ├── sessions.py      # Practice session endpoints
│       ├── videos.py        # Video endpoints
│       └── endpoints/       # Feature-specific endpoints
│           ├── analytics.py
│           ├── challenges.py
│           ├── forum.py
│           ├── teachers.py
│           └── ... (20+ endpoint files)
├── core/
│   ├── config.py           # Application settings
│   ├── security.py         # Security utilities (JWT, password hashing)
│   └── database.py         # Database configuration
├── models/                 # SQLAlchemy models
├── schemas/                # Pydantic schemas
└── services/               # Business logic services
```

## Authentication System

### JWT Token-Based Authentication
- **Token Type**: Bearer tokens (JWT)
- **Access Token**: 30 minutes expiry (configurable)
- **Refresh Token**: 7 days expiry (configurable)
- **Algorithm**: HS256

### Authentication Flow
1. **Registration** (`POST /api/v1/auth/register`)
   - Creates new user with role (student/teacher)
   - Returns user info + access/refresh tokens
   - Automatically activates challenges for students

2. **Login** (`POST /api/v1/auth/login`)
   - Authenticates with email/password
   - Returns user info + access/refresh tokens
   - Ensures challenges are active for students

3. **Token Refresh** (`POST /api/v1/auth/refresh`)
   - Uses refresh token to get new access token
   - Returns new access/refresh token pair

4. **Current User** (`GET /api/v1/auth/me`)
   - Returns authenticated user's information

### OAuth2 Support
- OAuth2 password flow supported for Swagger UI (`/api/v1/auth/login/oauth`)
- Uses standard OAuth2PasswordBearer scheme

## Authorization System

### Role-Based Access Control (RBAC)

#### User Roles
```python
class UserRole(str, enum.Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"
```

#### Permission Levels via Dependencies

1. **Public Access** (No authentication required)
   - Forum posts viewing
   - Uses `get_current_user_optional` dependency

2. **Authenticated User** (`get_current_user`)
   - Basic authentication required
   - Any logged-in user

3. **Active User** (`get_current_active_user`)
   - Must be authenticated AND active
   - Checks `is_active` flag

4. **Student Only** (`get_current_student`)
   - Must be authenticated, active, AND have student role
   - Used for student-specific operations

5. **Teacher Only** (`get_current_teacher`)
   - Must be authenticated, active, AND have teacher role
   - Used for teacher management features

6. **Admin Only** (`get_current_admin`)
   - Must be authenticated, active, AND have admin role
   - Note: Admin registration is blocked in the API

### Authorization Dependencies (from `app/api/deps.py`)

```python
# Basic authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# Optional authentication (for public endpoints)
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

# Dependency functions:
- get_current_user()         # Basic auth required
- get_current_active_user()  # Auth + active status
- get_current_student()      # Student role required
- get_current_teacher()      # Teacher role required
- get_current_admin()        # Admin role required
- get_current_user_optional() # Auth optional
```

## API Endpoint Patterns

### Common Patterns

1. **Resource Creation**
   ```python
   @router.post("/", response_model=Resource)
   async def create_resource(
       data: ResourceCreate,
       current_user: User = Depends(get_current_student),  # Role-specific
       db: AsyncSession = Depends(get_db)
   ):
   ```

2. **Resource Listing**
   ```python
   @router.get("/", response_model=List[Resource])
   async def get_resources(
       skip: int = Query(0, ge=0),
       limit: int = Query(100, ge=1, le=100),
       current_user: User = Depends(get_current_active_user),
       db: AsyncSession = Depends(get_db)
   ):
   ```

3. **Teacher Access to Student Resources**
   ```python
   # Teachers can view their students' data
   if current_user.role == "teacher":
       # Verify student belongs to teacher
       if student.primary_teacher_id != current_user.id:
           raise HTTPException(403, "You don't have access to this student")
   ```

## Permission Examples by Feature

### 1. Practice Sessions
- **Create**: Students only (`get_current_student`)
- **View Own**: Students see their own
- **View Students'**: Teachers see their assigned students' sessions
- **Update/Delete**: Students can only modify their own

### 2. Forum
- **View Posts**: Public (no auth required)
- **Create Post**: Any authenticated user
- **Update Post**: Only post author
- **Delete Post**: Only post author or admin
- **Vote**: Any authenticated user

### 3. Teacher Features
- **View Students**: Teachers only (`get_current_teacher`)
- **View Student Details**: Teacher must be assigned to student
- **Create Feedback**: Teachers only, for their students

### 4. Analytics
- **View Own**: Students see their own analytics
- **View Students'**: Teachers see their students' analytics

## Security Middleware

### CORS Configuration
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:19006", ...],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Trusted Host Middleware
```python
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.musictracker.com"],
)
```

## Key Security Features

1. **Password Hashing**: Uses bcrypt via passlib
2. **JWT Token Security**: 
   - Tokens signed with secret key
   - Short-lived access tokens (30 min)
   - Separate refresh tokens (7 days)
3. **SQL Injection Protection**: Uses SQLAlchemy ORM with parameterized queries
4. **Input Validation**: Pydantic schemas validate all input
5. **Rate Limiting**: Configurable (`RATE_LIMIT_PER_MINUTE`)

## Common Authorization Patterns

### 1. Owner-Only Access
```python
# Only the resource owner can modify
if resource.owner_id != current_user.id:
    raise HTTPException(403, "Not authorized")
```

### 2. Teacher-Student Relationship
```python
# Teacher can only access their assigned students
if student.primary_teacher_id != current_teacher.id:
    raise HTTPException(403, "You don't have access to this student")
```

### 3. Role-Based Feature Access
```python
# Feature available only to specific roles
current_user = Depends(get_current_teacher)  # Enforces teacher role
```

### 4. Optional Authentication
```python
# Public endpoints with enhanced features for authenticated users
current_user = Depends(get_current_user_optional)
if current_user:
    # Show additional data for logged-in users
```

## Test Credentials

For development/testing:
- **Students**: 
  - alice@example.com / testpass123
  - bob@example.com / testpass123
  - carol@example.com / testpass123
- **Teacher**: teacher@example.com / testpass123
- **Admin**: No test admin provided (registration blocked)

## API Documentation

- **OpenAPI/Swagger**: Available at `/api/v1/docs`
- **ReDoc**: Available at `/api/v1/redoc`