# YouTube Growth Intelligence - Backend API Console

This is the secure, scalable Next.js backend for your multi-channel YouTube analytics dashboard. It handles Google OAuth authentication, connects and queries YouTube's Data and Analytics APIs (including monetization metrics), maintains a daily sync state in a local PostgreSQL database, and runs rule-based AI recommendations.

---

## 🛠️ Technology Stack
- **Framework**: Next.js (App Router, TypeScript)
- **Database**: PostgreSQL (Docker-based)
- **ORM**: Prisma
- **APIs**: YouTube Data API v3 & YouTube Analytics API v2

---

## 🚀 Step-by-Step Local Setup

### 1. Pre-requisites
Ensure you have the following installed on your machine:
- **Node.js** (v18 or higher)
- **Docker & Docker Desktop** (for the database container)

### 2. Start the PostgreSQL Database Container
Run the following command in the root directory to spin up the local PostgreSQL instance:
```bash
docker compose up -d
```
This launches a PostgreSQL container named `yt-analytics-db` running on port `5432` with database `yt_analytics`.

### 3. Configure Environment Variables
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Open `.env` and replace the placeholder credentials:
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: Put your credentials from the Google Cloud Console.
- `NEXTAUTH_SECRET`: Add a secure, random string (e.g., generator or random characters).

### 4. Push Database Schema
Verify that your database is running, then push the Prisma schema to create the tables:
```bash
npx prisma db push
```
This automatically configures the tables and indexes in your local PostgreSQL database and generates the Prisma Client.

### 5. Start Next.js Development Server
Run the local dev server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view your console.

---

## ⚙️ Cron Jobs & Manual Sync
To fetch yesterday's analytics for all tracked channels, run the following standalone runner command:
```bash
npx tsx src/jobs/dailySync.ts
```
You can register this command in Windows Task Scheduler or as a daily crontab on a server to automate daily pulls.

---

## 🧪 Verification & Testing
To re-run the validation test suite verifying all RPM, projection, trending, and growth formulas:
```bash
npx tsx verifyCalculations.ts
```
All tests should return `✅ PASS`.
