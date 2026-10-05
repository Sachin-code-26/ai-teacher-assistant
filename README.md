# AI Teacher Assistant 🎓🤖

A full-stack MERN application that uses Google's Gemini AI to automatically evaluate and grade student PDF assignments against a teacher-defined rubric.

## 🌟 Live Demo
- **Frontend App:** [https://ai-teacher-assistant-client-jaoww8gvf.vercel.app](https://ai-teacher-assistant-client-jaoww8gvf.vercel.app)
- **Backend API:** [https://ai-teacher-assistant-c81g.onrender.com](https://ai-teacher-assistant-c81g.onrender.com)

## 🛠️ Tech Stack
- **Frontend:** React, Vite, Tailwind CSS, React Router
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas
- **AI Integration:** Google Gemini 3.8 Flash (via @google/genai SDK)
- **Deployment:** Vercel (Frontend), Render (Backend)

## ✨ Features
- **Teacher Dashboard:** Create assignments, define grading rubrics (criteria & max marks), and view all student submissions.
- **Student Dashboard:** View pending assignments, upload PDF answers, and get instant AI-generated feedback.
- **AI Evaluation:** Gemini reads the PDF, evaluates it against the rubric, clamps marks to the max allowed, and provides strengths/weaknesses and overall feedback.
- **Authentication:** Secure JWT-based authentication with role-based access control (Teacher vs Student).

## 🚀 Running Locally

1. **Clone the repository:**
   \\\ash
   git clone https://github.com/Sachin-code-26/ai-teacher-assistant.git
   cd ai-teacher-assistant
   \\\

2. **Backend Setup:**
   \\\ash
   cd server
   npm install
   \\\
   Create a \.env\ file in the \server\ directory:
   \\\env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   GEMINI_API_KEY=your_gemini_api_key
   CLIENT_URL=http://localhost:5173
   \\\
   Run the backend:
   \\\ash
   npm run dev
   \\\

3. **Frontend Setup:**
   \\\ash
   cd ../client
   npm install
   \\\
   Run the frontend:
   \\\ash
   npm run dev
   \\\

---
*Developed by Sachin.*
