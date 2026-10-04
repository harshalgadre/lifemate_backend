# CareerMade — Healthcare Job Platform Backend

> A production-ready, AI-powered healthcare job platform backend built with Node.js, Express, MongoDB Atlas, and LangChain.js.

[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen)](https://www.mongodb.com/atlas)
[![LangChain](https://img.shields.io/badge/LangChain.js-AI%20Pipeline-blue)](https://js.langchain.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 🧑‍💻 Tech Stack

| Component | Technology |
|---|---|
| **Runtime** | Node.js 20+ |
| **Framework** | Express.js |
| **Database** | MongoDB Atlas (Mongoose ODM) |
| **Authentication** | JWT (Access + Refresh Tokens), Google OAuth 2.0 (Passport.js) |
| **AI / LLM** | LangChain.js, Groq API (`openai/gpt-oss-20b` primary, `gpt-oss-120b` fallback) |
| **Vector Embeddings** | `@xenova/transformers` — `all-MiniLM-L6-v2` (384-dim, runs locally) |
| **Vector Search** | MongoDB Atlas Vector Search (ANN) |
| **File Storage** | Cloudinary (resumes, PDFs, images, cover letters) |
| **Email** | Nodemailer (SMTP / Gmail) |
| **PDF Generation** | PDFKit |
| **Deployment** | Render, Docker, Docker Compose |

---

## ✨ Features

### 1. 🔐 Secure Authentication System
- JWT access tokens (15-min) + refresh tokens (30-day, HTTP-only cookies)
- Account lockout after repeated failed login attempts (brute-force protection)
- Google OAuth 2.0 (Passport.js) for one-click login/signup
- Email verification (24-hour token), password reset (1-hour token), welcome emails
- Role-based access control: `jobseeker`, `employer`, `admin`

### 2. 🏢 Employer Job Management
- Full CRUD for job postings with 15+ filterable attributes
- Employer verification workflow (admin-gated before job posting)
- Server-side pagination, sorting, and multi-field filtering
- Auto-triggers vector embedding on every job create/update (non-blocking, fire-and-forget)
- Status management: `Open`, `Closed`, `Expired`

### 3. 👤 Job Seeker Profile Management
- Rich structured profiles: bio, 30 healthcare specializations, work experience, education, skills, certifications, languages, projects, job preferences, privacy settings
- Cloudinary-based resume + cover letter upload, replace, and delete
- Profile completion scoring
- Sub-APIs for projects and languages (add/update/delete)

### 4. 📄 InstantCV — Resume Builder + PDF Export
- Structured resume data model: personal info, summary, experience, education, skills, certifications, projects, languages, custom sections
- Server-side PDF generation (PDFKit) with skill badges, date-aligned experience, and customizable styling (font, colors, spacing)
- Upload generated PDFs to Cloudinary, track `pdfUrl`, view count, and download count
- Multiple resume versions per user, set-default functionality
- Per-resume preview and download endpoints

### 5. 🤖 AI — Resume Summary Generator *(Feature 1)*
- LangChain.js + Groq (`openai/gpt-oss-20b`) prompt chain
- Formats experience, education, skills into LLM context
- Supports tone options; optionally auto-saves summary to resume
- **Auto-fallback:** `withModelFallback()` retries `gpt-oss-120b` if primary model is decommissioned

### 6. 🎯 AI — Smart Job-Resume Match Scorer *(Feature 2)*
- LangChain.js + Groq structured JSON output
- Returns overall score (0–100) + breakdown: skills, experience, education, specialization
- Matched/missing skills, top 3 strengths, 3 improvement suggestions, verdict summary
- Robust LLM output parsing with JSON extraction fallback (handles markdown fences)
- **Auto-fallback:** `withModelFallback()` retries next model if current Groq model is decommissioned

### 7. 🔍 AI — Semantic Job Search / RAG Pipeline *(Feature 4)*
- Full RAG pipeline: query → embed (384-dim, local) → Atlas Vector Search → LLM re-rank
- NLP query parsing extracts structured filters (city, specialization, shift, job type) from natural language
- Auto-falls back to text search if vector search unavailable
- Atlas-compatible `$eq` operator filters for all pre-filter fields
- Admin batch-indexing endpoint + embedding coverage stats
- Model: `Xenova/all-MiniLM-L6-v2` (quantized, cached locally in `.model-cache/`)
- **Auto-fallback:** all 3 LLM calls inside the RAG pipeline use `withModelFallback()` for resilience

### 8. 📋 Application Tracking System (ATS)
- 6 statuses: Applied → Under Review → Interview → Offered → Rejected → Withdrawn
- Full immutable audit trail (history array with actor, timestamp, note)
- Multi-source resume selection: profile resume, InstantCV-built resume, or fresh upload per job
- Smart data fallback: if job seeker used Resume Builder over base profile, backend auto-merges data on employer view
- Employer-side candidate rating (1–5 stars) + profile match score display
- Non-blocking email notifications on all key lifecycle events

### 9. 🔖 Saved Jobs
- Save/bookmark jobs with unique constraint
- Dedicated bookmarks list endpoint

### 10. 🛡️ Admin Panel
- User, employer, and job management
- Employer verification approval/rejection

### 11. 📧 Automated Email Notifications
- 6 email types with branded HTML templates
- Email verification, welcome, password reset, application submitted, status update (Interview/Offered), new application received (employer)
- Non-blocking dispatch — never affects API response times

### 12. 🌐 Public Job Board
- Public listing with `optionalAuth` (works for both guests and logged-in users)
- Advanced multi-field filtering + server-side pagination

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB Atlas account with:
  - A cluster
  - A Vector Search index named `job_vector_index` on the `jobs` collection, `embedding` field, 384 dimensions
- Cloudinary account
- Groq API key (free tier available at [console.groq.com](https://console.groq.com))
- Gmail account (for Nodemailer) or any SMTP provider

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/careermade-backend.git
cd careermade-backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in all required values (see Environment Variables section)

# Start development server
npm run dev
```

### Docker

```bash
# Start with Docker Compose
docker-compose up --build
```

---

## 🔑 Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/careermade
MONGODB_VECTOR_INDEX_NAME=job_vector_index

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@careermade.com

# AI Features
GROQ_API_KEY=your-groq-api-key
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2

# Feature Flags
AI_RESUME_SUMMARY_ENABLED=true
AI_MATCH_SCORING_ENABLED=true
AI_SEMANTIC_SEARCH_ENABLED=true
```

---

## 📁 Project Structure

```
lifemate_backend/
├── config/           # Database, Cloudinary, AI config
├── controllers/      # Route handlers
│   ├── authController.js
│   ├── jobController.js
│   ├── applicationController.js
│   ├── resumeController.js
│   ├── jobSeekerController.js
│   ├── employerController.js
│   ├── aiController.js
│   └── adminController.js
├── middlewares/      # Auth, upload, validation
├── models/           # Mongoose schemas
│   ├── User.js
│   ├── JobSeeker.js
│   ├── Employer.js
│   ├── Job.js
│   ├── Application.js
│   ├── Resume.js
│   └── SavedJob.js
├── routes/           # Express routers
├── services/
│   ├── ai/
│   │   ├── summaryChain.js        # Feature 1: Summary generator
│   │   ├── matchScorer.js         # Feature 2: Match scorer
│   │   ├── semanticSearch.js      # Feature 4: RAG pipeline
│   │   ├── jobEmbeddingPipeline.js
│   │   ├── embeddingConfig.js     # @xenova/transformers setup
│   │   └── llmConfig.js           # LangChain LLM setup
│   ├── emailService.js            # Nodemailer templates
│   └── pdfService.js              # PDFKit resume generation
├── utils/            # Response helpers, JWT utils
├── docs/             # Internal dev documentation
├── server.js
├── Dockerfile
└── docker-compose.yml
```

---

## 📡 API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Access |
|---|---|---|
| POST | `/register` | Public |
| POST | `/login` | Public |
| POST | `/logout` | Public |
| POST | `/refresh-token` | Public |
| GET | `/verify-email/:token` | Public |
| POST | `/forgot-password` | Public |
| POST | `/reset-password/:token` | Public |
| GET | `/google` | Public (OAuth) |

### Jobs (`/api/jobs`)
| Method | Endpoint | Access |
|---|---|---|
| GET | `/` | Public |
| GET | `/my` | Employer |
| GET | `/:id` | Public |
| POST | `/` | Verified Employer |
| PATCH | `/:id` | Employer/Admin |
| PATCH | `/:id/status` | Employer/Admin |
| DELETE | `/:id` | Employer/Admin |
| POST | `/:id/apply` | Job Seeker |

### Applications (`/api/applications`)
| Method | Endpoint | Access |
|---|---|---|
| GET | `/me` | Job Seeker |
| GET | `/employer` | Employer |
| GET | `/job/:jobId` | Employer |
| GET | `/:id` | Owner |
| PATCH | `/:id/status` | Employer/Admin |
| PATCH | `/:id/rating` | Employer/Admin |

### Resume Builder (`/api/resume`)
| Method | Endpoint | Access |
|---|---|---|
| GET | `/list` | Job Seeker |
| POST | `/build` | Job Seeker |
| GET | `/:id` | Job Seeker |
| PUT | `/:id` | Job Seeker |
| DELETE | `/:id` | Job Seeker |
| GET | `/:id/preview` | Job Seeker |
| POST | `/:id/download` | Job Seeker |
| POST | `/:id/generate-pdf` | Job Seeker |
| POST | `/:id/set-default` | Job Seeker |

### AI (`/api/ai`)
| Method | Endpoint | Access |
|---|---|---|
| POST | `/generate-summary` | Job Seeker |
| POST | `/match-score` | Job Seeker |
| POST | `/semantic-search` | Job Seeker |
| POST | `/index-job/:jobId` | Authenticated |
| POST | `/batch-index-jobs` | Admin |
| GET | `/embedding-stats` | Admin |

---

## 🤝 Contributing

Pull requests are welcome. Please open an issue first to discuss major changes.

---

## 🏗️ System Architecture

### Full-Stack Overview

```mermaid
flowchart TB
    subgraph CLIENT["🖥️  Frontend — Next.js 14 (Vercel)"]
        direction TB
        A1["Public Job Board\n/view-jobs"]
        A2["Job Seeker Dashboard\n/dashboard/jobseeker"]
        A3["Employer Dashboard\n/dashboard/employee"]
        A4["Admin Panel\n/dashboard/admin"]
        A5["Auth Pages\n/login · /register"]
        A6["OAuth Redirect\n/oauth"]
    end

    subgraph API["⚙️  Backend — Node.js / Express (Render)"]
        direction TB
        B1["/api/auth\nJWT + Google OAuth"]
        B2["/api/jobs\nCRUD + Filters"]
        B3["/api/applications\nATS + Status Tracking"]
        B4["/api/jobseeker\nProfile + Docs"]
        B5["/api/employer\nOrg Profile"]
        B6["/api/resume\nInstantCV Builder"]
        B7["/api/ai\nRAG + Match + Summary"]
        B8["/api/saved-jobs\nBookmarks"]
        B9["/api/admin\nPlatform Control"]
    end

    subgraph AI_LAYER["🤖  AI Layer"]
        direction LR
        C1["LangChain.js\nPrompt Chains"]
        C2["Groq API\nLlama 3.3 70B"]
        C3["@xenova/transformers\n384-dim Embeddings\n(runs locally on server)"]
    end

    subgraph DATA["🗄️  Data Layer — MongoDB Atlas"]
        direction LR
        D1["Collections:\nUser · JobSeeker · Employer\nJob · Application\nResume · SavedJob"]
        D2["Atlas Vector Search\njob_vector_index\n(embedding field, 384-dim)"]
    end

    subgraph SERVICES["☁️  External Services"]
        direction LR
        E1["Cloudinary\nFiles · PDFs · Images"]
        E2["Nodemailer / SMTP\nTransactional Emails"]
        E3["Google OAuth 2.0\nPassport.js Strategy"]
        E4["PDFKit\nServer-side PDF Gen"]
    end

    %% Frontend → Backend
    CLIENT -->|"REST API calls\nHTTP + Bearer Token"| API

    %% Backend → AI
    B7 --> C1
    C1 --> C2
    C1 --> C3
    B2 -->|"Auto-embed on\ncreate/update"| C3

    %% Backend → Database
    API --> D1
    C3 -->|"Store 384-dim\nvector embeddings"| D1
    D2 -.->|"ANN vector search"| D1

    %% Backend → External Services
    API --> E1
    API --> E2
    B1 --> E3
    B6 --> E4
    E4 --> E1
```

---

### 🔗 Frontend ↔ Backend Connection Map

| Frontend Page / Feature | Backend API Called | Auth Required |
|---|---|---|
| **Login / Register** | `POST /api/auth/login` · `POST /api/auth/register` | None |
| **Google OAuth** | `GET /api/auth/google` → callback → redirect with token | None |
| **Job Seeker Dashboard** | `GET /api/jobs` · `GET /api/applications/me` | Job Seeker |
| **View Job Detail** | `GET /api/jobs/:id` | Optional |
| **Apply to Job** | `POST /api/jobs/:id/apply` (multipart form) | Job Seeker |
| **AI Match Score** | `POST /api/ai/match-score` | Job Seeker |
| **AI Semantic Search** | `POST /api/ai/semantic-search` | Job Seeker |
| **AI Summary Generator** | `POST /api/ai/generate-summary` | Job Seeker |
| **InstantCV Builder** | `POST /api/resume/build` · `PUT /api/resume/:id` | Job Seeker |
| **PDF Download** | `POST /api/resume/:id/generate-pdf` → Cloudinary URL | Job Seeker |
| **Profile Page** | `GET/PUT /api/jobseeker/profile` | Job Seeker |
| **Upload Resume/Cover** | `POST /api/jobseeker/resume` (multipart) | Job Seeker |
| **Bookmarks** | `GET /api/saved-jobs` · `POST /api/saved-jobs/jobs/:id/save` | Job Seeker |
| **Employer Dashboard** | `GET /api/jobs/my` · `GET /api/applications/employer` | Employer |
| **Post / Edit Job** | `POST /api/jobs` · `PATCH /api/jobs/:id` | Verified Employer |
| **Review Application** | `GET /api/applications/:id` · `PATCH /api/applications/:id/status` | Employer |
| **Employer Profile** | `POST/GET /api/employer/profile` | Employer |
| **Admin Panel** | `GET /api/admin/users` · `GET /api/admin/employers` | Admin |
| **Public Job Board** | `GET /api/jobs?...filters` | None (optional auth) |

---

### 📡 Authentication Flow

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant FE as Frontend (Next.js)
    participant BE as Backend (Express)
    participant DB as MongoDB Atlas

    Note over U,DB: Email/Password Login
    U->>FE: Submit login form
    FE->>BE: POST /api/auth/login
    BE->>DB: findOne({ email }) + comparePassword()
    DB-->>BE: User document
    BE-->>FE: { accessToken, user } + Set-Cookie: refreshToken (httpOnly)
    FE->>FE: Store accessToken in localStorage
    FE-->>U: Redirect to dashboard

    Note over U,DB: Authenticated API Call
    U->>FE: Perform action (e.g. apply to job)
    FE->>BE: POST /api/jobs/:id/apply\nAuthorization: Bearer <accessToken>
    BE->>BE: Verify JWT → extract userId + role
    BE->>DB: Create Application document
    DB-->>BE: Saved application
    BE-->>FE: { success: true, data: { application } }

    Note over U,DB: Token Refresh
    FE->>BE: POST /api/auth/refresh-token (cookie sent automatically)
    BE->>DB: Verify token exists in user.refreshTokens[]
    DB-->>BE: User document
    BE-->>FE: { accessToken: new_token } + new refreshToken cookie
```

---

### 🔍 AI Semantic Search — RAG Flow

```mermaid
sequenceDiagram
    participant JS as Job Seeker
    participant FE as Frontend
    participant BE as Backend
    participant EMB as @xenova/transformers
    participant VS as MongoDB Atlas\nVector Search
    participant LLM as Groq API\n(Llama 3.3)

    JS->>FE: Type "night shift cardiology job in Mumbai"
    FE->>BE: POST /api/ai/semantic-search { query }
    BE->>BE: Parse query → extract filters\n(city: Mumbai, spec: Cardiology, shift: Night)
    BE->>EMB: embedText(query)
    EMB-->>BE: 384-dim float32 vector
    BE->>VS: $vectorSearch { queryVector, filter: { city: {$eq:"Mumbai"} } }
    VS-->>BE: Top-K matching job documents + similarity scores
    BE->>LLM: Re-rank + explain why each job matches (LangChain prompt)
    LLM-->>BE: Structured explanations per job
    BE-->>FE: { results: [...jobs with scores + explanations] }
    FE-->>JS: Display ranked results with AI explanations
```

---

## 📄 License

MIT