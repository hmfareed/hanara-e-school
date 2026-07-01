# HANARA SCHOOLS — School Management System

A full-stack MERN school management system built for **HANARA Schools**, Tamale, Northern Region, Ghana.
Covers **Nursery 1–2, KG 1–2, Primary 1–6, and JHS 1–3** (13 grade levels).

---

## Project Structure

```
HANARA SMS-REACT/
├── backend/                  — Node.js + Express REST API
│   ├── scripts/seed.js       — Database seeder
│   ├── src/
│   │   ├── config/           — db.js, env.js
│   │   ├── controllers/      — auth, dashboard, student, guardian, staff, class, attendance
│   │   ├── middleware/        — auth.js, rbac.js, validate.js, errorHandler.js, rateLimiter.js
│   │   ├── models/           — 11 Mongoose models
│   │   ├── routes/           — 6 route files + app.js + server.js
│   │   ├── services/         — token.service.js
│   │   ├── utils/            — logger.js, admissionNumber.js
│   │   └── validators/       — Zod schemas
│   ├── tests/                — Jest + Supertest test suites
│   ├── .env.example          — environment template (copy → .env)
│   └── package.json
├── frontend/                 — React 19 + Vite + Tailwind CSS v4
│   └── src/
│       ├── app/              — AppRouter, Layout, ProtectedRoute
│       ├── context/          — AuthContext
│       ├── features/         — auth, dashboard, students, staff, classes, attendance
│       └── services/         — api.js (Axios + auto token refresh)
└── README.md
```

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- MongoDB (Atlas or local)

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in MONGODB_URI, JWT secrets, etc.

npm install
npm run seed      # Create default admin, school profile, class levels, subjects
npm run dev       # Starts on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev       # Starts on http://localhost:5173
```

---


## API Overview

| Module      | Endpoints                                      |
|-------------|------------------------------------------------|
| Auth        | POST /login, /refresh, /logout · GET /me       |
| Dashboard   | GET /dashboard/summary                         |
| Students    | GET/POST /students · GET/PATCH/:id · /promote · /withdraw |
| Guardians   | GET/POST/PATCH /guardians · GET /:id/students  |
| Staff       | GET/POST /staff · GET/PATCH/:id · /assign-classes |
| Classes     | GET/POST /classes · /levels · /subjects · /assignments |
| Attendance  | GET /attendance · POST /bulk · GET /student/:id/summary |
| Academic Yr | GET/POST /academic-years · PATCH /:id · /:id/set-current |
| Fees        | GET/POST /fees/structures · GET/PATCH/DELETE /:id |
| Invoices    | POST /fees/invoices/generate · GET /fees/invoices · GET/PATCH /:id/void |
| Payments    | POST/GET /fees/payments · GET /:id            |

---

## Role Permissions (RBAC)

| Role        | Capabilities                                                              |
|-------------|---------------------------------------------------------------------------|
| superadmin  | Everything — school settings, users, all reports                         |
| admin       | Admissions, class/staff management, daily operations                     |
| teacher     | Their own class only — attendance register, class roster                 |
| accountant  | Fee structures, invoices, payments, reports                              |
| parent      | Read-only portal — child's attendance, fees, announcements (Phase 3)     |
| driver      | Read-only bus manifest (Phase 5)                                         |

---

## Ghana-Specific Notes

- **Admission numbers** follow `HNRA/YYYY/NNNN` format (e.g. `HNRA/2026/0001`)
- **KG/Nursery** uses thematic *strands* (Numeracy, Literacy, Creative Arts, Our World Our People) — not separate subjects
- **GES Dual Naming**: Class levels store both `levelCode` (BS1–BS9) and `displayName` (Primary 1–JHS 3)
- **BECE (JHS 3)**: 30% CA + 70% exam weighting with 9-point aggregate — tracked in Phase 4
- **Mobile Money**: Hubtel Checkout / Paystack Ghana for MoMo payments — Phase 2
- **Data Protection Act, 2012 (Act 843)**: Guardian consent captured at admission; DPC registration is a mandatory institutional step

---

## Roadmap

| Phase | Scope                             | Status     |
|-------|-----------------------------------|------------|
| 0     | Backend skeleton + auth + React   | ✅ Done     |
| 1     | Students, attendance, staff, MVP  | ✅ Done     |
| 2     | Fees, invoices, MoMo              | ✅ Done     |
| 3     | SMS alerts, parent portal         | ✅ Done     |
| 4     | Grading, report cards, BECE       | 🔜 Upcoming |
| 5     | Transport, bus manifests          | 🔜 Upcoming |
| 6     | Hardening, compliance, deployment | 🔜 Upcoming |
