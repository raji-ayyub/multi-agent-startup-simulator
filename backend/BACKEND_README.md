# Backend - Multi-Agent AI Startup Strategy Simulator

## Setup Instructions

### 1. Install Dependencies

```bash
source b_venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment Variables

The `.env` file should contain:

```
DATABASE_URL=postgresql://user:password@host:port/database
SECRET_KEY=dev-secret-ket
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=0
```

### 3. Run the Application

**Option 1: Direct Python execution**

```bash
python main.py
```

**Option 2: Using uvicorn directly (recommended)**

```bash
uvicorn main:app --reload
```

**Option 3: Uvicorn with custom host/port**

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`

- **API Documentation**: http://localhost:8000/docs (Swagger UI)

---

## Authentication Flow

### Sign Up

Create a new user account.

**Endpoint**: `POST /auth/sign-up`

**Request Body**:

```json
{
  "email": "founder@example.com",
  "full_name": "John Doe",
  "password": "securepassword123",
  "company_name": "TechStartup Inc"
}
```

**Response** (201 Created):

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "founder@example.com",
    "full_name": "John Doe",
    "company_name": "TechStartup Inc",
    "is_active": true,
    "created_at": "2026-02-21T10:30:00",
    "updated_at": "2026-02-21T10:30:00"
  }
}
```

### Sign In

Authenticate with existing credentials.

**Endpoint**: `POST /auth/sign-in`

**Request Body**:

```json
{
  "email": "founder@example.com",
  "password": "securepassword123"
}
```

**Response** (200 OK):

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "founder@example.com",
    "full_name": "John Doe",
    "company_name": "TechStartup Inc",
    "is_active": true,
    "created_at": "2026-02-21T10:30:00",
    "updated_at": "2026-02-21T10:30:00"
  }
}
```

### Get Profile

Retrieve the current user's profile (requires authentication token).

**Endpoint**: `GET /auth/profile?email=founder@example.com`

**Headers**:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response** (200 OK):

```json
{
  "id": 1,
  "email": "founder@example.com",
  "full_name": "John Doe",
  "company_name": "TechStartup Inc",
  "is_active": true,
  "created_at": "2026-02-21T10:30:00",
  "updated_at": "2026-02-21T10:30:00"
}
```

### Request Password Reset

Initiate a password reset by requesting a reset token. In a production system, this token would be sent via email.

**Endpoint**: `POST /auth/request-password-reset`

**Request Body**:

```json
{
  "email": "founder@example.com"
}
```

**Response** (200 OK):

```json
{
  "message": "Password reset token sent to email",
  "reset_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_expires_in_minutes": 15
}
```

**Notes**:

- Token is valid for 15 minutes by default
- In production, this token would be sent via email link instead of returned in response
- Example email link: `https://yourapp.com/reset-password?token=<reset_token>`

### Reset Password

Reset password using a valid reset token (e.g., from email link).

**Endpoint**: `POST /auth/reset-password`

**Request Body**:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "new_password": "newsecurepassword123"
}
```

**Response** (200 OK):

```json
{
  "message": "Password reset successfully",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "founder@example.com",
    "full_name": "John Doe",
    "company_name": "TechStartup Inc",
    "is_active": true,
    "created_at": "2026-02-21T10:30:00",
    "updated_at": "2026-02-21T10:30:00"
  }
}
```

**Error Cases**:

- Invalid or expired token → 401 Unauthorized
- Password doesn't meet requirements → 400 Bad Request

### Change Password

Change password for an authenticated user. Requires current password verification.

**Endpoint**: `POST /auth/change-password`

**Headers**:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Request Body**:

```json
{
  "email": "founder@example.com",
  "current_password": "oldpassword123",
  "new_password": "newsecurepassword123"
}
```

**Response** (200 OK):

```json
{
  "message": "Password changed successfully",
  "user": {
    "id": 1,
    "email": "founder@example.com",
    "full_name": "John Doe",
    "company_name": "TechStartup Inc",
    "is_active": true,
    "created_at": "2026-02-21T10:30:00",
    "updated_at": "2026-02-21T10:30:00"
  }
}
```

**Error Cases**:

- Current password is incorrect → 401 Unauthorized
- New password doesn't meet requirements → 400 Bad Request
- User not found → 404 Not Found

---

## Error Responses

### Email Already Registered (409)

```json
{
  "detail": "Email already registered."
}
```

### Invalid Credentials (401)

```json
{
  "detail": "Invalid email or password."
}
```

### User Inactive (403)

```json
{
  "detail": "User account is inactive."
}
```

### User Not Found (404)

```json
{
  "detail": "User not found."
}
```

---

## Project Structure

```
backend/
├── main.py              # FastAPI application entry point
├── models.py            # SQLAlchemy database models
├── schemas.py           # Pydantic request/response schemas
├── routes.py            # API route handlers
├── auth.py              # Authentication utilities (JWT, password hashing)
├── database.py          # Database configuration and session management
├── requirements.txt     # Python dependencies
├── .env                 # Environment variables
├── test_db.py           # Database connection test
└── b_venv/your_venv     # Virtual environment
```

---

## Authentication Implementation Details

### Password Security

- Passwords are hashed using **bcrypt** before storage
- Verification uses constant-time comparison to prevent timing attacks

### JWT Tokens

- Tokens are created with the user's email as the subject
- Token expiration is configurable (default: 30 minutes)
- Algorithm: HS256

### Database

- User model includes email, full name, password hash, company name, and timestamps
- Email is unique and indexed for fast lookups
- is_active flag allows account deactivation

---

## Next Steps

1. **Frontend Integration**: Connect React frontend to these endpoints
2. **Token Management**: Store tokens securely in frontend (localStorage/sessionStorage)
3. **Protected Routes**: Add middleware to validate tokens for protected endpoints
4. **Refresh Tokens**: Implement refresh token mechanism for better security
5. **Email Verification**: Add email verification step on sign up
6. **Email Notifications**: Send password reset links via email instead of returning token in response
7. **Rate Limiting**: Add rate limiting to prevent brute force attacks
8. **Audit Logging**: Log authentication events for security monitoring

---

## Testing

You can test the API using:

1. **Swagger UI**: http://localhost:8000/docs (interactive testing)
