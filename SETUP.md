# DSVV CS Event Attendance System — Setup Guide

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click **New Project**, fill in the details, and wait for it to be ready

---

## 2. Create the Database Tables

In your Supabase project, go to **SQL Editor** and run the following SQL:

```sql
-- 1. Students Table
CREATE TABLE students (
  scholar_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
  course TEXT CHECK (course IN ('BCA', 'BIT', 'MCA')),
  semester INT CHECK (semester BETWEEN 1 AND 6),
  contact_number TEXT DEFAULT '',
  email TEXT DEFAULT ''
);

-- 2. Events Table
CREATE TABLE events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME
);

-- 3. Attendance Table
CREATE TABLE attendance (
  attendance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar_id TEXT REFERENCES students(scholar_id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(event_id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('Present', 'Absent')) NOT NULL,
  UNIQUE(scholar_id, event_id)
);
```

---

## 3. Enable Row Level Security (RLS) — Optional

Since this is an internal tool with no authentication, you can disable RLS on all tables, or add an open policy:

```sql
-- Run for each table if you get "permission denied" errors
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON students FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON events FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON attendance FOR ALL USING (true) WITH CHECK (true);
```

---

## 4. Add Your Supabase Keys

1. In **Supabase > Project Settings > API**, copy:
   - **Project URL** (looks like `https://xyzxyz.supabase.co`)
   - **anon / public** key

2. In the project folder (`attendance-app/`), create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## 5. Run the App

```bash
cd attendance-app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
attendance-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout (Sidebar + Footer)
│   │   ├── page.tsx            # Dashboard / Home
│   │   ├── students/page.tsx   # Student management
│   │   ├── events/page.tsx     # Event management
│   │   └── attendance/page.tsx # Attendance marking + CSV export
│   ├── components/
│   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   └── Footer.tsx          # Footer
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client
│   │   └── db/
│   │       ├── students.ts     # Student CRUD
│   │       ├── events.ts       # Event CRUD
│   │       └── attendance.ts   # Attendance CRUD + report
│   └── types/index.ts          # TypeScript types
├── .env.local                  # Your Supabase keys (create this)
├── .env.local.example          # Template
└── SETUP.md                    # This file
```
