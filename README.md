# Diamond Luxury Real Estate — Backend API

A standalone Node.js + Express + TypeScript backend that serves all data and
admin functionality for the Diamond Luxury Real Estate website.

The Next.js frontend (in the project root) talks to this backend by proxying
`/api/*` requests here (see `next.config.ts` `rewrites()` in the frontend).

## What lives here

- **Database** — MySQL via `mysql2/promise` (`src/lib/db.ts`), schema in `schema.sql`.
- **Auth** — JWT (`admin_token` httpOnly cookie) verified on protected routes (`src/lib/auth.ts`).
- **Email** — Nodemailer / Gmail SMTP transactional email (`src/lib/email.ts`).
- **Uploads** — file uploads to an FTP server (`src/lib/ftp.ts`) via multipart (`multer`).
- **Routes** — one Express router per resource under `src/routes/`:
  `admin` (stats), `agents`, `auth`, `contact`, `enquiries`, `news`,
  `newsletter`, `off-plan`, `properties`, `upload`, `settings` (site CMS).

## Getting started

```bash
cd backend
cp .env.example .env        # then edit the values
npm install
npm run dev                 # tsx watch — hot reload on :4000
```

Production:

```bash
npm run build               # tsc -> dist/
npm start                   # node dist/server.js
```

## Endpoints

All responses use `{ success: boolean, data?: ..., error?: string, message?: string }`.
Public routes are open; everything else requires the admin JWT (cookie or
`Authorization: Bearer` header).

| Method | Path                    | Auth   | Purpose                         |
|--------|-------------------------|--------|---------------------------------|
| POST   | /api/auth/login         | public | Sign in, sets admin_token cookie|
| POST   | /api/auth/logout        | public | Clear cookie                    |
| GET    | /api/admin/stats        | admin  | Dashboard counters              |
| GET    | /api/agents             | public | List active agents              |
| POST   | /api/agents             | admin  | Create agent                    |
| GET    | /api/agents/:id         | public | One agent                       |
| PUT    | /api/agents/:id         | admin  | Update agent                    |
| DELETE | /api/agents/:id         | admin  | Deactivate agent                |
| POST   | /api/contact            | public | Submit enquiry + email          |
| POST   | /api/enquiries          | public | Property enquiry + email        |
| GET    | /api/enquiries          | admin  | Paginated list                  |
| GET    | /api/enquiries/:id      | admin  | One enquiry                     |
| PATCH  | /api/enquiries/:id      | admin  | Update status                   |
| DELETE | /api/enquiries/:id      | admin  | Delete                          |
| GET    | /api/properties         | public | Filtered + paginated list       |
| POST   | /api/properties         | admin  | Create                          |
| GET    | /api/properties/:id     | public | By id or slug                   |
| PUT    | /api/properties/:id     | admin  | Update                          |
| DELETE | /api/properties/:id     | admin  | Delete                          |
| GET    | /api/news               | public | Published articles              |
| POST   | /api/news               | admin  | Create                          |
| GET    | /api/news/:id           | public | By id or slug                   |
| PUT    | /api/news/:id           | admin  | Update                          |
| DELETE | /api/news/:id           | admin  | Delete                          |
| POST   | /api/newsletter         | public | Subscribe                       |
| GET    | /api/newsletter         | admin  | Paginated subscribers           |
| GET    | /api/off-plan           | public | Paginated projects              |
| POST   | /api/off-plan           | admin  | Create                          |
| GET    | /api/off-plan/:id       | public | By id or slug                   |
| PUT    | /api/off-plan/:id       | admin  | Update                          |
| DELETE | /api/off-plan/:id       | admin  | Delete                          |
| POST   | /api/upload             | admin  | Multipart file -> FTP           |
| GET    | /api/settings           | public | All site settings (key/value)   |
| PUT    | /api/settings           | admin  | Upsert site settings            |
| GET    | /api/health             | public | Liveness probe                  |

## Database

Apply the schema (idempotent) once:

```bash
mysql -u <user> -p <database> < schema.sql
```

`schema.sql` also seeds default agents, a placeholder admin user, and default
site settings.
