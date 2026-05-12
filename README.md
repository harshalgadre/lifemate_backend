# LifeMate Backend API

A comprehensive RESTful API for a healthcare job platform built with **Node.js**, **Express**, and **MongoDB**. LifeMate connects healthcare job seekers with employers (hospitals, clinics, medical centers) and provides features like job searching, application tracking, resume building, and admin management.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
  - [Authentication](#authentication-apiauthgoogle)
  - [OAuth](#oauth-apioauth)
  - [Jobs](#jobs-apijobs)
  - [Applications](#applications-apiapplications)
  - [Job Seeker](#job-seeker-apijobseeker)
  - [Employer](#employer-apiemployer)
  - [Resume Builder](#resume-builder-apiresume)
  - [Saved Jobs](#saved-jobs-apisaved-jobs)
  - [Admin](#admin-apiadmin)
- [Data Models](#data-models)
- [Middleware](#middleware)
- [Services](#services)
- [Error Handling](#error-handling)
- [Deployment](#deployment)

---

## Features

### Authentication & Security
- JWT-based authentication with access & refresh tokens
- Google OAuth 2.0 login/registration (via Passport.js)
- Email verification with token-based links
- Password reset via email
- Account lockout after 5 failed login attempts (2-hour cooldown)
- Role-based access control (Jobseeker, Employer, Admin)
- Rate limiting (100 requests per 15 minutes per IP)
- Helmet security headers
- CORS whitelisting

### Job Seeker Features
- Profile management (specializations, experience, education, skills, certifications)
- Resume & cover letter upload (Cloudinary storage)
- Resume builder with PDF generation (PDFKit)
- Job search with filters (specialization, location, job type, salary, shift)
- Save/bookmark jobs
- Apply to jobs with resume & cover letter attachments
- Track application status history
- Profile completion tracking (percentage-based)
- Projects & languages management

### Employer Features
- Organization profile management (type, services, accreditations, gallery)
- Job posting with full lifecycle (Pending → Active → Archived/Closed)
- Application review and status updates (Applied → Under Review → Interview → Offered/Rejected)
- Candidate rating system
- Employer verification system
- Subscription-based feature gating (Free, Basic, Premium, Enterprise)
- Hiring preferences and statistics dashboard

### Admin Features
- User management (list, block/unblock, activate/deactivate, change roles)
- Employer verification/unverification
- Platform-wide statistics (total users, jobs, applications, role breakdowns)

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **Node.js** | Runtime environment |
| **Express.js** | Web framework |
| **MongoDB** | Database (via Mongoose ODM) |
| **JWT** | Authentication tokens |
| **Passport.js** | Google OAuth 2.0 |
| **Cloudinary** | File storage (resumes, images, documents) |
| **Nodemailer** | Email service (SMTP) |
| **PDFKit** | Resume PDF generation |
| **Multer** | File upload handling |
| **Helmet** | Security headers |
| **bcryptjs** | Password hashing |
| **express-rate-limit** | API rate limiting |

---

## Project Structure

```
lifemate_backend/
├── config/
│   ├── cloudinary.js        # Cloudinary SDK configuration & upload helpers
│   ├── database.js          # MongoDB connection with Mongoose
│   └── passport.js          # Google OAuth strategy (stateless)
├── controllers/
│   ├── adminController.js   # Admin user/employer management & stats
│   ├── applicationController.js  # Job applications CRUD & status tracking
│   ├── authController.js    # Register, login, logout, password reset, profile
│   ├── employerController.js     # Employer profile & listing
│   ├── jobController.js     # Job CRUD, search, filters
│   ├── jobSeekerController.js    # Job seeker profile, documents, projects
│   ├── oauthController.js   # Google OAuth flow (start, callback, failure)
│   ├── resumeController.js  # Resume builder, PDF generation, preview
│   └── savedJobController.js     # Save/unsave/list bookmarked jobs
├── middlewares/
│   ├── auth.js              # JWT authentication, role authorization, ownership checks
│   ├── upload.js            # Multer file upload configuration
│   └── validation.js        # Request body validation (registration, login, jobs, etc.)
├── models/
│   ├── Application.js       # Job application schema with status history
│   ├── Employer.js          # Employer/organization profile schema
│   ├── Job.js               # Job posting schema with specializations
│   ├── JobSeeker.js         # Job seeker profile schema (education, skills, etc.)
│   ├── Resume.js            # Resume builder schema with styling options
│   ├── SavedJob.js          # Job bookmark schema
│   └── User.js              # Base user schema with auth methods
├── routes/
│   ├── admin.js             # Admin routes
│   ├── applications.js      # Application routes
│   ├── auth.js              # Auth + OAuth alias routes
│   ├── employer.js          # Employer routes
│   ├── jobs.js              # Job routes
│   ├── jobseeker.js         # Job seeker routes
│   ├── oauth.js             # OAuth routes
│   ├── resume.js            # Resume builder routes
│   └── savedJobs.js         # Saved jobs routes
├── services/
│   ├── emailService.js      # Email templates & sending (verification, reset, notifications)
│   └── pdfService.js        # PDF resume generation with PDFKit
├── utils/
│   ├── jwt.js               # Token generation & verification helpers
│   └── response.js          # Standardized API response helpers
├── server.js                # Express app setup, middleware, route mounting
├── package.json
└── .env                     # Environment variables (gitignored)
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+
- **MongoDB** (Atlas or local)
- **Cloudinary** account
- **Google Cloud Console** project with OAuth 2.0 credentials
- **Gmail** account with App Password (for email service)

### Installation

```bash
# Clone the repository
git clone https://github.com/harshalgadre/lifemate_backend.git
cd lifemate_backend

# Install dependencies
npm install

# Create .env file (see Environment Variables section below)
cp .env.example .env

# Start development server
npm run dev

# Start production server
npm start
```

The server will start at `http://localhost:5000`.

### Scripts

| Command | Description |
|---|---|
| `npm start` | Start production server (`node server.js`) |
| `npm run dev` | Start dev server with auto-reload (`nodemon server.js`) |

---

## Environment Variables

Create a `.env` file in the project root with the following variables:

| Variable | Description | Required |
|---|---|---|
| `PORT` | Server port | No (default: `5000`) |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret key for JWT access tokens | Yes |
| `JWT_REFRESH_SECRET` | Secret key for JWT refresh tokens | Yes |
| `JWT_EXPIRE` | Access token expiration | No (default: `7d`) |
| `JWT_REFRESH_EXPIRE` | Refresh token expiration | No (default: `30d`) |
| `SESSION_SECRET` | Express session secret | Yes |
| `EMAIL_HOST` | SMTP host (e.g., `smtp.gmail.com`) | Yes |
| `EMAIL_USER` | SMTP email address | Yes |
| `EMAIL_PASS` | SMTP app password | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `GOOGLE_CALLBACK_URL` | Google OAuth callback URL | Yes |
| `OAUTH_SUCCESS_REDIRECT` | Frontend URL to redirect after successful OAuth | Yes |
| `OAUTH_FAILURE_REDIRECT` | Frontend URL to redirect after failed OAuth | Yes |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | No (default: `900000`) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | No (default: `100`) |

---

## API Reference

> **Base URL:** `https://lifemate-backend-8w9n.onrender.com` (production) or `http://localhost:5000` (development)

All responses follow this standard format:
```json
{
  "success": true,
  "message": "Description of result",
  "data": { ... }
}
```

### Health Check

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | API health check |
| `GET` | `/` | Welcome message & version info |

---

### Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | ❌ | Register a new user (jobseeker/employer) |
| `POST` | `/api/auth/login` | ❌ | Login with email & password |
| `POST` | `/api/auth/logout` | ❌ | Logout (invalidate refresh token) |
| `POST` | `/api/auth/refresh-token` | ❌ | Refresh access token |
| `GET` | `/api/auth/verify-email/:token` | ❌ | Verify email address |
| `POST` | `/api/auth/resend-verification` | ❌ | Resend verification email |
| `POST` | `/api/auth/forgot-password` | ❌ | Request password reset email |
| `POST` | `/api/auth/reset-password/:token` | ❌ | Reset password with token |
| `GET` | `/api/auth/profile` | ✅ | Get current user profile |
| `PUT` | `/api/auth/profile` | ✅ | Update user profile (name, phone, image) |
| `PUT` | `/api/auth/change-password` | ✅ | Change password |

#### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass1",
  "firstName": "John",
  "lastName": "Doe",
  "role": "jobseeker",      # "jobseeker" or "employer"
  "phone": "+919876543210"  # optional
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass1"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "jobseeker",
      "isEmailVerified": true
    },
    "accessToken": "eyJhbGciOi..."
  }
}
```

---

### OAuth (`/api/oauth`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/oauth/google?role=jobseeker` | Start Google OAuth flow |
| `GET` | `/api/oauth/google/callback` | Google OAuth callback (handled by Passport) |
| `GET` | `/api/oauth/google/failure` | OAuth failure endpoint |

**OAuth Flow:**
1. Frontend redirects to `GET /api/oauth/google?role=jobseeker`
2. User authenticates with Google
3. Google redirects to callback URL
4. Backend generates JWT tokens and redirects to `OAUTH_SUCCESS_REDIRECT` with tokens as query params:
   ```
   https://your-frontend.com/oauth/success?accessToken=...&refreshToken=...&role=jobseeker&provider=google
   ```

> **Note:** OAuth routes are also mirrored under `/api/auth/google*` for convenience.

---

### Jobs (`/api/jobs`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/jobs` | Optional | Any | List/search jobs with filters |
| `GET` | `/api/jobs/my` | ✅ | Employer | List jobs created by the authenticated employer |
| `GET` | `/api/jobs/:id` | Optional | Any | Get job details by ID |
| `POST` | `/api/jobs` | ✅ | Employer (verified) | Create a new job posting |
| `PATCH` | `/api/jobs/:id` | ✅ | Employer/Admin | Update job posting |
| `PATCH` | `/api/jobs/:id/status` | ✅ | Employer/Admin | Change job status |
| `DELETE` | `/api/jobs/:id` | ✅ | Employer/Admin | Delete a job posting |
| `POST` | `/api/jobs/:id/apply` | ✅ | Jobseeker | Apply to a job (multipart: resume + cover letter) |

#### Search & Filter Jobs
```bash
GET /api/jobs?specialization=Cardiology&jobType=Full-time&location=Mumbai&limit=20&page=1
```

**Available Query Params:**
- `specialization` — Filter by healthcare specialization
- `jobType` — `Full-time`, `Part-time`, `Contract`, `Freelance`, `Internship`, `Volunteer`
- `shift` — `Day`, `Night`, `Rotating`, `Flexible`
- `location` — Search by city/state
- `isRemote` — `true`/`false`
- `salaryMin` / `salaryMax` — Salary range filter
- `experienceMin` / `experienceMax` — Experience range filter
- `search` — Text search across title, description, organization
- `status` — Job status filter
- `limit` — Results per page (default: 10)
- `page` — Page number

#### Healthcare Specializations
The platform supports 31 healthcare specializations including:
`General Medicine`, `Cardiology`, `Neurology`, `Orthopedics`, `Pediatrics`, `Gynecology`, `Dermatology`, `Psychiatry`, `Radiology`, `Anesthesiology`, `Emergency Medicine`, `Surgery`, `Oncology`, `Nursing`, `Pharmacy`, `Physical Therapy`, and more.

---

### Applications (`/api/applications`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/applications/me` | ✅ | Jobseeker | List all my applications |
| `GET` | `/api/applications/employer` | ✅ | Employer | List applications to my jobs |
| `GET` | `/api/applications/job/:jobId` | ✅ | Employer | List applications for a specific job |
| `GET` | `/api/applications/:id` | ✅ | Any (owner) | Get application details |
| `PATCH` | `/api/applications/:id/status` | ✅ | Employer/Admin | Update application status |
| `PATCH` | `/api/applications/:id/rating` | ✅ | Employer/Admin | Rate a candidate (1-5) |

#### Application Status Flow
```
Applied → Under Review → Interview → Offered / Rejected
                                    ↘ Withdrawn (by jobseeker)
```

Each status change is tracked in the application's `history` array with timestamp and optional notes.

---

### Job Seeker (`/api/jobseeker`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/jobseeker/profile` | ✅ | Get my job seeker profile |
| `PUT` | `/api/jobseeker/profile` | ✅ | Update my profile |
| `POST` | `/api/jobseeker/resume` | ✅ | Upload resume (file) |
| `DELETE` | `/api/jobseeker/resume` | ✅ | Delete uploaded resume |
| `POST` | `/api/jobseeker/cover-letter` | ✅ | Upload cover letter (file) |
| `DELETE` | `/api/jobseeker/cover-letter` | ✅ | Delete uploaded cover letter |
| `POST` | `/api/jobseeker/projects` | ✅ | Add a project |
| `PUT` | `/api/jobseeker/projects/:projectId` | ✅ | Update a project |
| `DELETE` | `/api/jobseeker/projects/:projectId` | ✅ | Delete a project |
| `POST` | `/api/jobseeker/languages` | ✅ | Add a language |
| `PUT` | `/api/jobseeker/languages/:languageId` | ✅ | Update a language |
| `DELETE` | `/api/jobseeker/languages/:languageId` | ✅ | Delete a language |

#### Profile Completion
Profile completion is automatically calculated (0-100%) based on:
- Title, Bio, Specializations, Experience, Education, Work Experience, Skills, Preferred Locations, Resume, Profile Image (10% each)

---

### Employer (`/api/employer`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/api/employer/profile` | ✅ | Employer | Create or update employer profile |
| `GET` | `/api/employer/profile` | ✅ | Employer | Get my employer profile |
| `GET` | `/api/employer/profile/refresh` | ✅ | Employer | Refresh profile with synced stats |
| `GET` | `/api/employer/all` | Optional | Any | Browse all employers (for jobseekers) |
| `GET` | `/api/employer/:id` | Optional | Any | Get employer details by ID |

#### Employer Profile Fields
- **Organization Info:** name, type, description, website, founded year, employee count
- **Contact:** name, designation, phone, email
- **Address:** street, city, state, pincode, country, coordinates
- **Healthcare:** specializations (31 options), services, accreditations
- **Media:** logo, gallery images
- **Verification:** documents (Business License, Registration Certificate, etc.)
- **Subscription:** plan (Free/Basic/Premium/Enterprise), features, status
- **Hiring Preferences:** experience range, locations, process type, response time

---

### Resume Builder (`/api/resume`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/resume/list` | ✅ | List all my resumes |
| `POST` | `/api/resume/build` | ✅ | Create a new resume |
| `GET` | `/api/resume/:id` | ✅ | Get resume for editing |
| `PUT` | `/api/resume/:id` | ✅ | Update resume |
| `DELETE` | `/api/resume/:id` | ✅ | Delete resume |
| `GET` | `/api/resume/:id/preview` | ✅ | Preview resume (increments views) |
| `POST` | `/api/resume/:id/download` | ✅ | Download resume as PDF |
| `POST` | `/api/resume/:id/generate-pdf` | ✅ | Generate PDF and store in Cloudinary |
| `POST` | `/api/resume/:id/set-default` | ✅ | Set as default resume |

#### Resume Builder Features
- **Sections:** Personal Info, Summary, Education, Work Experience, Skills, Certifications, Projects, Languages, Custom Sections
- **Styling:** Font family (Arial, Times New Roman, Calibri, Georgia, Helvetica), font size (10-14), primary/accent colors, spacing (compact/normal/relaxed)
- **PDF Generation:** Server-side PDF generation using PDFKit with customizable styling
- **Section Visibility:** Toggle individual sections/items on/off
- **Multiple Resumes:** Create and manage multiple resumes, set one as default

---

### Saved Jobs (`/api/saved-jobs`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/saved-jobs/jobs/:id/save` | ✅ | Bookmark a job |
| `DELETE` | `/api/saved-jobs/jobs/:id/save` | ✅ | Remove bookmark |
| `GET` | `/api/saved-jobs/saved-jobs` | ✅ | List all bookmarked jobs |

---

### Admin (`/api/admin`)

> All admin routes require `admin` role authentication.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/users` | List all users (with filters) |
| `PATCH` | `/api/admin/users/:id/status` | Block/unblock or activate/deactivate a user |
| `PATCH` | `/api/admin/users/:id/role` | Change a user's role |
| `GET` | `/api/admin/employers` | List all employers |
| `PATCH` | `/api/admin/employers/:id/verify` | Verify an employer |
| `PATCH` | `/api/admin/employers/:id/unverify` | Unverify an employer |
| `GET` | `/api/admin/stats` | Get platform statistics |

#### Platform Statistics Response
```json
{
  "totalUsers": 150,
  "totalJobSeekers": 100,
  "totalEmployers": 45,
  "totalAdmins": 5,
  "totalJobs": 80,
  "activeJobs": 55,
  "totalApplications": 320,
  "verifiedEmployers": 30
}
```

---

## Data Models

### User
Base authentication model for all user types.

| Field | Type | Description |
|---|---|---|
| `email` | String | Unique email address |
| `password` | String | Bcrypt hashed (select: false) |
| `role` | Enum | `jobseeker`, `employer`, `admin` |
| `firstName` / `lastName` | String | User's name |
| `phone` | String | Phone number |
| `profileImage` | String | Cloudinary URL |
| `isEmailVerified` | Boolean | Email verification status |
| `isActive` / `isBlocked` | Boolean | Account status flags |
| `oauthProvider` / `oauthId` | String | Google OAuth linkage |
| `refreshTokens` | Array | Active refresh tokens (30-day TTL) |
| `loginAttempts` / `lockUntil` | Number/Date | Brute force protection |

### Job
Job posting created by a verified employer.

| Field | Type | Description |
|---|---|---|
| `employer` | ObjectId → Employer | Job creator |
| `title` | String | Job title (max 150 chars) |
| `specialization` | Enum | One of 31 healthcare specializations |
| `location` | Object | `{ city, state, country }` |
| `jobType` | Enum | Full-time, Part-time, Contract, Freelance, Internship, Volunteer |
| `shift` | Enum | Day, Night, Rotating, Flexible |
| `salary` | Object | `{ min, max, currency, period }` |
| `status` | Enum | Active, Pending, Flagged, Archived, Closed |
| `stats` | Object | `{ views, applications }` |

### Application
Job application submitted by a job seeker.

| Field | Type | Description |
|---|---|---|
| `job` | ObjectId → Job | Target job |
| `jobSeeker` | ObjectId → JobSeeker | Applicant |
| `employer` | ObjectId → Employer | Receiving employer |
| `status` | Enum | Applied, Under Review, Interview, Offered, Rejected, Withdrawn |
| `resume` / `coverLetter` | Object | Attached documents (Cloudinary) |
| `history` | Array | Status change audit trail |
| `rating` | Number | Employer rating (1-5) |

### JobSeeker
Extended profile for job seeker users.

| Field | Type | Description |
|---|---|---|
| `specializations` | Array | Healthcare specializations |
| `experience` | Object | Total years, current position/company |
| `education` | Array | Degrees (MBBS, MD, BSc Nursing, etc.) |
| `workExperience` | Array | Position, company, dates, achievements |
| `skills` | Array | Name + proficiency level |
| `certifications` | Array | Name, issuer, dates, credential ID |
| `jobPreferences` | Object | Locations, job types, salary, availability |
| `resume` / `coverLetter` | Object | Uploaded documents (Cloudinary) |
| `projects` | Array | Title, description, technologies, URL |
| `languages` | Array | Name + proficiency |
| `profileCompletion` | Number | 0-100% auto-calculated |

### Employer
Extended profile for employer/organization users.

| Field | Type | Description |
|---|---|---|
| `organizationName` | String | Hospital/clinic name |
| `organizationType` | Enum | Hospital, Clinic, Medical Center, etc. (18 types) |
| `contactPerson` | Object | Name, designation, phone, email |
| `address` | Object | Full address with coordinates |
| `specializations` | Array | Healthcare specializations offered |
| `services` | Array | Services provided |
| `accreditations` | Array | Certifications and accreditations |
| `verification` | Object | Verified status + uploaded documents |
| `subscription` | Object | Plan, status, features (max posts, etc.) |
| `stats` | Object | Total/active jobs, applications, hires, views |

### Resume
Resume builder document with styling options.

| Field | Type | Description |
|---|---|---|
| `personalInfo` | Object | Name, email, phone, LinkedIn, GitHub, address |
| `summary` | String | Professional summary |
| `education` / `workExperience` | Array | Sections with visibility toggle |
| `skills` / `certifications` | Array | Skills with proficiency levels |
| `projects` / `languages` | Array | Additional sections |
| `customSections` | Array | User-defined sections |
| `styling` | Object | Font, size, colors, spacing |
| `pdfUrl` | String | Generated PDF (Cloudinary) |
| `isDefault` | Boolean | Default resume flag |

---

## Middleware

### Authentication (`middlewares/auth.js`)
- `authenticate` — Verify JWT from `Authorization: Bearer <token>` header or cookie
- `optionalAuth` — Same as authenticate, but allows anonymous access
- `requireJobSeeker` — Restrict to jobseeker role
- `requireEmployer` — Restrict to employer role
- `requireAdmin` — Restrict to admin role
- `requireEmployerOrAdmin` — Restrict to employer or admin roles
- `requireEmployerVerification` — Verify employer is verified before allowing job posting
- `requireEmailVerification` — Require verified email
- `requireOwnershipOrAdmin` — Resource ownership check

### Validation (`middlewares/validation.js`)
- `validateRegistration` — Email, password strength, name, role
- `validateLogin` — Email, password required
- `validatePasswordReset` — Password strength
- `validatePasswordChange` — Current + new password validation
- `validateProfileUpdate` — Name, phone format
- `validateJobPost` — Title, description, location, salary, specializations
- `validateApplication` — Cover letter length

### Upload (`middlewares/upload.js`)
- Multer configuration for document uploads (resume, cover letter, images)
- Stored in memory buffer for direct Cloudinary upload

---

## Services

### Email Service (`services/emailService.js`)
- **Verification Email** — Account verification link
- **Password Reset Email** — Reset link with 1-hour expiry
- **Application Notifications** — Status update emails to job seekers
- HTML email templates with styled formatting

### PDF Service (`services/pdfService.js`)
- Server-side resume PDF generation using **PDFKit**
- Customizable fonts, colors, and spacing
- Sections: Header, Summary, Education, Experience, Skills, Certifications, Projects, Languages, Custom Sections
- Output uploaded to Cloudinary for persistent storage

---

## Error Handling

The API uses a global error handler that catches:

| Error Type | Status Code | Handling |
|---|---|---|
| Validation errors | `400` | Field-specific error messages |
| Duplicate key (MongoDB) | `400` | `"<field> already exists"` |
| Invalid JWT | `401` | `"Invalid token"` |
| Expired JWT | `401` | `"Token expired"` |
| Unauthorized | `401` | `"Access denied"` |
| Forbidden | `403` | Role/permission denied |
| Not Found | `404` | `"Route not found"` |
| Rate Limit | `429` | `"Too many requests"` |
| Server Error | `500` | `"Internal server error"` |

---

## Deployment

### Render (Production)

1. **Connect GitHub repo** to Render
2. **Build Command:** `npm install`
3. **Start Command:** `npm start`
4. **Set Environment Variables** in Render Dashboard (all variables from the `.env` section)
5. **Important:** Update these URLs for production:
   ```
   GOOGLE_CALLBACK_URL=https://your-backend.onrender.com/api/oauth/google/callback
   OAUTH_SUCCESS_REDIRECT=https://your-frontend.vercel.app/oauth/success
   OAUTH_FAILURE_REDIRECT=https://your-frontend.vercel.app/oauth/failure
   ```

### Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add **Authorized redirect URIs:**
   ```
   https://your-backend.onrender.com/api/oauth/google/callback
   http://localhost:5000/api/oauth/google/callback
   ```
4. Add **Authorized JavaScript origins:**
   ```
   https://your-backend.onrender.com
   https://your-frontend.vercel.app
   http://localhost:5000
   http://localhost:3000
   ```

### Frontend Configuration

Set in your frontend's environment variables:
```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

---

## License

ISC

---

## Author

**LifeMate Team** — Healthcare Job Platform