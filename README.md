# SkillBridge — University Skill Sharing Marketplace

A full-stack peer-to-peer skill-sharing platform for university students.

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

---

## 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

---

## 2. Environment Variables

Copy and edit the backend `.env` file:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your PostgreSQL credentials:

```
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=skillbridge
DB_USER=postgres
DB_PASSWORD=your_postgres_password

JWT_SECRET=skillbridge_jwt_secret_change_in_production
JWT_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:5173
```

---

## 3. Create and Setup the Database

Create the database in PostgreSQL first:

```sql
CREATE DATABASE skillbridge;
```

Then run the migration:

```bash
cd backend
npm run db:migrate
```

---

## 4. Seed Demo Data

```bash
cd backend
npm run db:seed
```

---

## 5. Run the Backend

```bash
cd backend
npm run dev
# Server starts on http://localhost:5000
```

---

## 6. Run the Frontend

```bash
cd frontend
npm run dev
# App starts on http://localhost:5173
```

---

## 7. Demo Login Credentials

| Role    | Email                              | Password     |
|---------|------------------------------------|--------------|
| Admin   | admin@skillbridge.edu              | admin123     |
| Student | alex.chen@university.edu           | password123  |
| Student | maya.patel@university.edu          | password123  |
| Student | james.okonkwo@university.edu       | password123  |
| Student | sofia.garcia@university.edu        | password123  |
| Student | leo.nakamura@university.edu        | password123  |
| Student | priya.sharma@university.edu        | password123  |
| Student | tom.harris@university.edu          | password123  |
| Student | aisha.johnson@university.edu       | password123  |
| Student | carlos.mendez@university.edu       | password123  |
| Student | nina.volkov@university.edu         | password123  |
| Student | daniel.kim@university.edu          | password123  |
| Student | fatima.ali@university.edu          | password123  |

**Tip:** Log in as `alex.chen` and `maya.patel` to see the exchange match in action — Alex teaches Java and wants Photoshop; Maya teaches Photoshop and wants Java.

---

## 8. Implemented Features

### Authentication
- Register, Login, Logout
- JWT-based persistent authentication
- Password hashing with bcryptjs
- Protected routes (frontend + backend)
- Role-based access (student / admin)

### Student Profiles
- Name, bio, university, year, major
- Avatar (DiceBear-generated)
- Preferred interaction (online / in-person / both)
- Availability text
- Completed sessions count, rating, no-show count

### Skills System
- Add/edit/remove teaching skills with proficiency (beginner/intermediate/advanced)
- Add/remove learning goals with priority
- Predefined categories (Programming, Design, Business, Languages, Creative, Academic, Practical, Professional, Other)
- Custom skills supported

### Discover
- Browse all students
- Filter by intent (learn / teach / exchange / practice)
- Search by name, skill, bio
- Filter by category and interaction preference
- Send a connection request directly from Discover

### Rule-Based Matching
- Exchange matches (mutual skill swap)
- Learning matches (they teach what you want)
- Teaching matches (you teach what they want)
- Practice matches (shared learning goals)
- Ranked by match strength
- Clear written reasons for each match

### Requests
- Send requests (learn / teach / exchange / practice)
- Attach an optional message and skill
- Accept, decline, cancel requests
- Notifications on status changes

### Sessions
- Propose sessions from accepted requests
- Set date, time, duration, format, location/link
- Confirm, counter-propose, cancel, no-show
- Mark completed (both parties must confirm)
- In-person safety reminder shown automatically

### Reviews & Ratings
- 1–5 star rating after a completed session
- Written comment
- Average rating updated on user profile
- Duplicate review prevention

### Reports
- Report any user for: inappropriate behavior, harassment, spam, fake profile, no-show, other
- Optional description
- One open report per user pair (spam prevention)

### Notifications
- In-app notifications for requests, sessions, completions
- Unread indicator in top bar
- Mark all as read

### Admin Dashboard
- Platform statistics (total users, active users, skills, sessions, requests, reports)
- User management with suspend/unsuspend
- Report review and resolution
- Skills and category management

### Seed Data
- 12 student accounts + 1 admin
- Realistic skills, learning goals, interests
- Pre-created requests (accepted, pending, declined)
- Pre-created sessions (completed, upcoming)
- Reviews with ratings

---

## 9. Known Limitations

- No email verification (university emails are trusted)
- No real-time notifications (polling not implemented; refresh to see new notifications)
- No file upload for avatars (uses DiceBear SVG URLs)
- No in-app messaging (sessions use external meeting links)
- Skill Circles feature is marked "Coming Soon" and not implemented
- No advanced AI/ML matching (MVP uses deterministic rules)
- No calendar integration (date/time are manual text fields)
