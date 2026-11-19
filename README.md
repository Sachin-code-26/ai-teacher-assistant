# AI Teacher Assistant 🎓

A full-stack MERN web application where teachers create assignments with grading rubrics, students upload PDF answers, and Google Gemini AI automatically evaluates submissions with detailed, rubric-based feedback.

## 🌐 Live Demo

| | Link |
|---|---|
| **Frontend App** | [https://client-two-livid-13.vercel.app](https://client-two-livid-13.vercel.app) |
| **Backend API** | [https://server-gamma-cyan.vercel.app/api/health](https://server-gamma-cyan.vercel.app/api/health) |
| **GitHub Repo** | [https://github.com/Sachin-code-26/ai-teacher-assistant](https://github.com/Sachin-code-26/ai-teacher-assistant) |

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Gemini_AI-4285F4?style=flat&logo=google&logoColor=white)

---

## Features

**For Teachers**
- Create assignments with custom instructions and due dates
- Build grading rubrics (criteria, descriptions, marks per criterion)
- View all student submissions and AI-generated evaluations
- Override AI scores and add personal feedback comments
- Dashboard with submission statistics

**For Students**
- Browse available assignments with rubric details
- Upload PDF answers for any assignment
- Receive instant AI-generated feedback per rubric criterion
- View scores, strengths, weaknesses, and overall feedback
- Track all previous submissions

**AI Grading Pipeline**
1. Student uploads PDF → stored securely in cloud storage
2. Backend extracts text and sends it to Google Gemini with the rubric
3. Gemini returns structured JSON (marks per criterion, feedback, strengths/weaknesses)
4. Response is validated and saved — teacher can override at any time

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, React Router v7 |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| AI | Google Gemini API (`@google/genai` SDK) |
| Auth | JWT, bcryptjs, HTTP-only cookies |
| File Upload | Multer |

---

## Project Structure

```
ai-teacher-assistant/
├── client/                   # React frontend (Vite)
│   └── src/
│       ├── components/       # Reusable UI components
│       ├── context/          # React context (Auth)
│       ├── layouts/          # Page shell layouts
│       ├── pages/            # Route-level page components
│       │   ├── student/
│       │   └── teacher/
│       ├── services/         # Axios API call wrappers
│       └── utils/            # Helper functions
│
└── server/                   # Express backend
    ├── config/               # DB and Gemini configuration
    ├── controllers/          # Request handlers
    ├── middleware/           # Auth and role guards
    ├── models/               # Mongoose schemas
    ├── routes/               # Express route definitions
    ├── services/             # Business logic (AI grading)
    └── utils/                # JWT helpers, response helpers
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (free tier works)
- Google Gemini API key — [get one here](https://aistudio.google.com/app/apikey)

### 1. Clone the repository

```bash
git clone https://github.com/Sachin-code-26/ai-teacher-assistant.git
cd ai-teacher-assistant
```

### 2. Backend setup

```bash
cd server
npm install
```

Create a `.env` file inside `server/`:

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=a_long_random_secret_string
GEMINI_API_KEY=your_gemini_api_key
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Start the backend:

```bash
npm run dev
```

The API will be available at `http://localhost:5000`.

### 3. Frontend setup

```bash
cd ../client
npm install
npm run dev
```

The app will open at `http://localhost:5173`.

> The Vite dev server proxies all `/api` requests to `localhost:5000` automatically — no extra config needed.

---

## Environment Variables

### Server (`server/.env`)

| Variable | Description |
|---|---|
| `PORT` | Port to run the Express server on |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for signing JWTs (use a long random string) |
| `GEMINI_API_KEY` | Google Gemini API key — **never expose this to the frontend** |
| `CLIENT_URL` | Frontend URL (for CORS) — set to your Vercel URL in production |
| `NODE_ENV` | `development` or `production` |

---

## API Overview

### Auth
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/logout` | Authenticated |
| GET | `/api/auth/me` | Authenticated |

### Assignments
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/assignments` | Teacher only |
| GET | `/api/assignments` | Authenticated |
| GET | `/api/assignments/:id` | Authenticated |
| PUT | `/api/assignments/:id` | Teacher (owner only) |
| DELETE | `/api/assignments/:id` | Teacher (owner only) |

### Submissions
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/submissions` | Student only |
| GET | `/api/submissions/my` | Student only |
| GET | `/api/submissions/:id` | Student (own) / Teacher |
| PATCH | `/api/submissions/:id/review` | Teacher only |

---

## Security

- Passwords hashed with **bcryptjs** (12 salt rounds) — never stored in plain text
- JWT stored in **HTTP-only cookies** — inaccessible to JavaScript, preventing XSS
- Role-based middleware blocks students from teacher routes and vice versa
- **Gemini API key lives only on the backend** — never in frontend code or `VITE_` variables
- Assignment ownership verified before any update or delete

---

## Database Models

**User** — `firstName`, `lastName`, `email`, `password` (hashed), `role`

**Assignment** — `title`, `subject`, `instructions`, `dueDate`, `maxMarks`, `rubric[]`, `createdBy`

**Submission** — `assignmentId`, `studentId`, `fileUrl`, `fileName`, `status`, `evaluationId`

**Evaluation** — `criteriaResults[]`, `totalMarks`, `percentage`, `strengths`, `weaknesses`, `overallFeedback`, `teacherFinalMarks`, `teacherComments`

---

*Built with the MERN stack and Google Gemini AI.*
