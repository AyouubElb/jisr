# English Teaching Platform

Online English teaching platform where an instructor creates courses, shares materials, and schedules live sessions for students.

## Tech Stack
- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Backend/DB/Auth/Storage:** Supabase (Postgres + Auth + Storage + Realtime)
- **Caching/State:** React Query (server data caching) + Supabase client (data source)
- **Forms:** React Hook Form + Zod (validation)
- **UI:** shadcn/ui + Radix UI + Lucide Icons
- **Notifications:** Sonner (toasts)
- **Dates:** date-fns
- **Deployment:** Vercel

## Dependencies & Why Each One

### Core (keep from MedicallyPlus)
| Package | Reason |
|---|---|
| `@tanstack/react-query` | **Caching layer.** Supabase has zero client-side caching — every `supabase.from().select()` hits the network. React Query gives us: request deduplication, stale-while-revalidate, background refetching, cache invalidation on mutations, and reusable hooks via `entityKeys` pattern. Same architecture as MedicallyPlus, proven and clean |
| `zod` | Form validation, API response parsing, env var validation. Type-safe schemas shared between forms and data layer |
| `react-hook-form` + `@hookform/resolvers` | Performant forms (no re-renders on every keystroke). Course builder, lesson editor, auth forms all need this |
| `sonner` | Lightweight toast notifications for mutation feedback |
| `lucide-react` | Consistent icon set, tree-shakeable |
| `date-fns` | Formatting session dates/times, schedule displays |
| `clsx` + `tailwind-merge` + `class-variance-authority` | Standard shadcn/ui utilities for conditional classes |
| `radix-ui` | Accessible primitives, comes with shadcn/ui |

### New (Supabase-specific)
| Package | Reason |
|---|---|
| `@supabase/supabase-js` | Core Supabase client — DB queries, auth, storage, realtime |
| `@supabase/ssr` | Server-side + client-side Supabase clients for Next.js App Router (cookie-based auth) |

### Removed (not needed with Supabase)
| Package | Why removed |
|---|---|
| `axios` | No separate REST API — Supabase client replaces HTTP calls entirely |
| `zustand` | Supabase Auth manages session state. No complex client state needed |
| `@vercel/blob` | Using Supabase Storage instead |
| `posthog-js` | Not for MVP — add analytics later |
| `fuse.js` | Supabase has Postgres full-text search built in |

## Project Structure
```
src/
  app/                          — Pages (App Router)
    (auth)/login/page.tsx
    (auth)/register/page.tsx
    (student)/dashboard/page.tsx
    (student)/courses/page.tsx
    (student)/courses/[id]/page.tsx
    (instructor)/dashboard/page.tsx
    (instructor)/courses/page.tsx
    (instructor)/courses/[id]/page.tsx
    (instructor)/courses/new/page.tsx
    layout.tsx                  — Root layout (QueryProvider + SupabaseProvider)
    page.tsx                    — Landing page
  components/
    ui/                         — shadcn base components
    layout/                     — Sidebar, header, nav
    course/                     — CourseCard, CourseList, CourseForm
    session/                    — SessionCard, SessionList
    providers/                  — QueryProvider, SupabaseProvider
  lib/
    supabase/
      client.ts                 — Browser client (createBrowserClient)
      server.ts                 — Server client (createServerClient)
      middleware.ts             — Auth middleware helper
    api/                        — Data access layer (replaces axios)
      courses.api.ts
      sessions.api.ts
      enrollments.api.ts
      materials.api.ts
    hooks/                      — React Query hooks (caching + mutations)
      useCourses.ts
      useSessions.ts
      useEnrollments.ts
      useAuth.ts
    types/
      database.ts               — Auto-generated from `supabase gen types`
      index.ts                  — App-level interfaces
    schemas/                    — Zod schemas for forms + validation
      course.schema.ts
      session.schema.ts
      auth.schema.ts
    constants/
      levels.ts                 — CEFR level definitions
      queryKeys.ts              — All React Query entity keys
```

## Data Flow Architecture

### Why React Query + Supabase (not just Supabase alone)

Supabase is a **data source**, not a state manager. Every `supabase.from("courses").select()` is a raw network request — no caching, no deduplication, no background refresh. If 3 components call the same query, that's 3 network requests.

React Query wraps Supabase calls and provides:
1. **Caching** — fetch once, serve from cache on subsequent renders
2. **Deduplication** — 3 components mounting simultaneously = 1 network request
3. **Stale-while-revalidate** — show cached data instantly, refresh in background
4. **Auto invalidation** — mutation succeeds → related queries refetch automatically
5. **Reusable hooks** — `useCourses()`, `useCourse(id)` called anywhere, cache shared

### The Flow
```
Server Component (initial fetch via Supabase server client — no React Query)
  → passes data as props to Client Component
    → Client Component hydrates with React Query (entityKeys pattern)
      → queryFn calls Supabase client (replaces axios)
      → mutations invalidate cache → auto refetch
      → toast notifications via sonner onSuccess/onError
```

### Layer Responsibilities
```
lib/api/*.api.ts        → Data access: Supabase queries (SELECT, INSERT, UPDATE, DELETE)
lib/hooks/*.ts          → Caching + mutations: React Query wraps api layer
lib/schemas/*.ts        → Validation: Zod schemas for forms and responses
components/             → UI: consumes hooks, zero data fetching logic
app/ pages              → Server Components: initial data load, pass to client components
```

## Code Examples

### Supabase Clients

```ts
// lib/supabase/client.ts — browser client
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";

export const createClient = (): ReturnType<typeof createBrowserClient<Database>> => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};
```

```ts
// lib/supabase/server.ts — server components + route handlers
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database";

export const createServerSupabase = async (): Promise<
  ReturnType<typeof createServerClient<Database>>
> => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
};
```

### Query Keys (entityKeys pattern)

```ts
// lib/constants/queryKeys.ts
export const courseKeys = {
  all: ["courses"] as const,
  lists: () => [...courseKeys.all, "list"] as const,
  list: (filters: { level?: string }) => [...courseKeys.lists(), filters] as const,
  details: () => [...courseKeys.all, "detail"] as const,
  detail: (id: string) => [...courseKeys.details(), id] as const,
};

export const sessionKeys = {
  all: ["sessions"] as const,
  byCourse: (courseId: string) => [...sessionKeys.all, "course", courseId] as const,
  upcoming: () => [...sessionKeys.all, "upcoming"] as const,
};

export const enrollmentKeys = {
  all: ["enrollments"] as const,
  mine: () => [...enrollmentKeys.all, "mine"] as const,
  byCourse: (courseId: string) => [...enrollmentKeys.all, "course", courseId] as const,
};
```

### API Layer (replaces axios — calls Supabase directly)

```ts
// lib/api/courses.api.ts
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type CourseInsert = Database["public"]["Tables"]["courses"]["Insert"];

const supabase = createClient();

export const coursesApi = {
  list: async (level?: string): Promise<Course[]> => {
    let query = supabase
      .from("courses")
      .select("*, profiles(full_name, avatar_url)")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (level) {
      query = query.eq("level", level);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  detail: async (id: string): Promise<Course> => {
    const { data, error } = await supabase
      .from("courses")
      .select("*, profiles(full_name, avatar_url), lessons(*), live_sessions(*)")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  create: async (course: CourseInsert): Promise<Course> => {
    const { data, error } = await supabase
      .from("courses")
      .insert(course)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<CourseInsert>): Promise<Course> => {
    const { data, error } = await supabase
      .from("courses")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) throw error;
  },
};
```

### React Query Hooks (caching + mutations)

```ts
// lib/hooks/useCourses.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { courseKeys } from "@/lib/constants/queryKeys";
import { coursesApi } from "@/lib/api/courses.api";
import { toast } from "sonner";

// READ — cached, deduplicated, background-refreshed
export const useCourses = (level?: string) => {
  return useQuery({
    queryKey: courseKeys.list({ level }),
    queryFn: () => coursesApi.list(level),
  });
};

export const useCourse = (id: string) => {
  return useQuery({
    queryKey: courseKeys.detail(id),
    queryFn: () => coursesApi.detail(id),
    enabled: !!id,
  });
};

// CREATE — invalidates list cache on success
export const useCreateCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: coursesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
      toast.success("Course created successfully");
    },
    onError: (error: unknown) => {
      const message =
        (error as { message?: string })?.message ?? "Failed to create course";
      toast.error(message);
    },
  });
};

// UPDATE — invalidates both list and detail cache
export const useUpdateCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof coursesApi.update>[1] }) =>
      coursesApi.update(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(id) });
      toast.success("Course updated");
    },
    onError: (error: unknown) => {
      const message =
        (error as { message?: string })?.message ?? "Failed to update course";
      toast.error(message);
    },
  });
};

// DELETE — invalidates list cache
export const useDeleteCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: coursesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
      toast.success("Course deleted");
    },
    onError: (error: unknown) => {
      const message =
        (error as { message?: string })?.message ?? "Failed to delete course";
      toast.error(message);
    },
  });
};
```

### Zod Schemas (form validation)

```ts
// lib/schemas/course.schema.ts
import { z } from "zod";

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CEFRLevel = (typeof CEFR_LEVELS)[number];

export const createCourseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  level: z.enum(CEFR_LEVELS, { message: "Select a valid level" }),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const createSessionSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  meeting_link: z.string().url("Must be a valid URL"),
  scheduled_at: z.string().min(1, "Select a date and time"),
  duration_minutes: z.coerce.number().min(15).max(180),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
```

### Server Component (initial load — no React Query needed)

```tsx
// app/(student)/courses/page.tsx — Server Component fetches directly
import { createServerSupabase } from "@/lib/supabase/server";
import { CourseList } from "@/components/course/course-list";

export default async function CoursesPage(): Promise<JSX.Element> {
  const supabase = await createServerSupabase();

  const { data: courses } = await supabase
    .from("courses")
    .select("*, profiles(full_name)")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  // Pass server-fetched data to client component for hydration
  return <CourseList initialCourses={courses ?? []} />;
}
```

### Client Component (hydrates with React Query cache)

```tsx
// components/course/course-list.tsx
"use client";

import { useCourses } from "@/lib/hooks/useCourses";
import type { Database } from "@/lib/types/database";

type Course = Database["public"]["Tables"]["courses"]["Row"];

interface CourseListProps {
  initialCourses: Course[];
}

export function CourseList({ initialCourses }: CourseListProps): JSX.Element {
  const { data: courses } = useCourses();

  // First render: initialCourses (from server). After hydration: React Query cache
  const displayCourses = courses ?? initialCourses;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {displayCourses.map((course) => (
        <div key={course.id} className="border rounded-lg p-4">
          <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
            {course.level}
          </span>
          <h3 className="mt-2 font-semibold">{course.title}</h3>
          <p className="text-sm text-muted-foreground">{course.description}</p>
        </div>
      ))}
    </div>
  );
}
```

### Form Component (React Hook Form + Zod + mutation hook)

```tsx
// app/(instructor)/courses/new/page.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createCourseSchema,
  type CreateCourseInput,
  CEFR_LEVELS,
} from "@/lib/schemas/course.schema";
import { useCreateCourse } from "@/lib/hooks/useCourses";
import { useRouter } from "next/navigation";

export default function NewCoursePage(): JSX.Element {
  const router = useRouter();
  const { mutate: createCourse, isPending } = useCreateCourse();

  const form = useForm<CreateCourseInput>({
    resolver: zodResolver(createCourseSchema),
  });

  const onSubmit = (data: CreateCourseInput): void => {
    createCourse(
      { ...data, instructor_id: "from-auth-context", is_published: false },
      { onSuccess: () => router.push("/instructor/courses") }
    );
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-lg space-y-4">
      <div>
        <label className="text-sm font-medium">Course Title</label>
        <input {...form.register("title")} className="w-full border rounded p-2" />
        {form.formState.errors.title && (
          <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <textarea {...form.register("description")} className="w-full border rounded p-2" rows={4} />
        {form.formState.errors.description && (
          <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Level</label>
        <select {...form.register("level")} className="w-full border rounded p-2">
          <option value="">Select level...</option>
          {CEFR_LEVELS.map((level) => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>
        {form.formState.errors.level && (
          <p className="text-sm text-red-500">{form.formState.errors.level.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {isPending ? "Creating..." : "Create Course"}
      </button>
    </form>
  );
}
```

## Database Schema (Supabase / Postgres)

### Tables
- **profiles** — extends Supabase auth.users (id, full_name, role: student|instructor, avatar_url, level, created_at)
- **courses** — (id, instructor_id, title, description, level: A1|A2|B1|B2|C1|C2, thumbnail_url, is_published, created_at)
- **lessons** — (id, course_id, title, content, type: grammar|vocabulary|resource, order, created_at)
- **live_sessions** — (id, course_id, title, meeting_link, scheduled_at, duration_minutes, created_at)
- **enrollments** — (id, student_id, course_id, enrolled_at)
- **materials** — (id, lesson_id, name, file_url, file_type, created_at)

### Key Relationships
- profiles.id → auth.users.id (1:1)
- courses.instructor_id → profiles.id
- lessons.course_id → courses.id
- live_sessions.course_id → courses.id
- enrollments.student_id → profiles.id
- enrollments.course_id → courses.id
- materials.lesson_id → lessons.id

### RLS (Row Level Security)
- Students can only read published courses and their own enrollments
- Instructor can CRUD their own courses, lessons, sessions, materials
- Profiles: users can read all, update only their own

## English Levels
Use CEFR standard: A1 (Beginner), A2 (Elementary), B1 (Intermediate), B2 (Upper Intermediate), C1 (Advanced), C2 (Proficiency)

## Core Features (MVP)

### Instructor Dashboard
- Create/edit/publish courses (organized by CEFR level)
- Add lessons: grammar explanations, vocabulary lists, resource links
- Schedule live sessions with Zoom/Google Meet links
- View enrolled students per course
- Upload materials (PDFs, documents) via Supabase Storage

### Student Dashboard
- Browse and enroll in courses by level
- View enrolled courses and progress
- See upcoming live sessions with join links
- Access lesson content and downloadable materials

### Auth
- Two roles: `student` and `instructor`
- Supabase Auth (email/password)
- Role stored in `profiles` table
- Middleware-based route protection

## Conventions

### TypeScript
- Strict mode enabled
- Explicit return types on functions
- All props typed with interfaces
- No `any` — use `unknown` + type narrowing

### Supabase
- Server-side: use `createServerClient` from `@supabase/ssr`
- Client-side: use `createBrowserClient` from `@supabase/ssr`
- Always use RLS — never bypass with service role key on client
- Type-safe queries using generated types from `supabase gen types`

### React Query
- All client-side data access goes through React Query hooks
- Use `entityKeys` pattern in `lib/constants/queryKeys.ts`
- Mutations always invalidate related query keys on success
- Toast notifications in `onSuccess`/`onError` callbacks
- Never call Supabase directly in components — always go through hooks

### Components
- Use shadcn/ui for base components
- Keep components small and focused
- Colocate component-specific types in the same file

### Data Fetching
- **Server Components:** fetch via `createServerSupabase()` directly, pass as props
- **Client Components:** consume React Query hooks, never fetch directly
- **Mutations:** via `useMutation` hooks, invalidate cache on success

## Design System
See [DESIGN.md](DESIGN.md) for the full design system: colors, typography, spacing, CEFR badge colors, and component rules.

### Design Inspiration
- **Google Classroom** — clean course/assignment flow
- **Preply** — scheduling UI
- **Cambly** — simple live session interface
- **Engoo** — lesson materials + clean layout

## Out of Scope (v1)
- Payments / subscriptions
- Quizzes / tests
- In-app chat
- Certificates
- Video hosting / recording
- Progress tracking / analytics

## Future (v2)
- Homework submission + instructor feedback
- Level placement quiz
- Attendance tracking for live sessions
- Recorded session replays
- Student progress dashboard
