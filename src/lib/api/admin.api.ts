import { createClient } from "@/lib/supabase/client";

export interface AdminStats {
  totalInstructors: number;
  totalStudents: number;
  totalCourses: number;
  totalEnrollments: number;
}

export interface AdminInstructorCourse {
  id: string;
  title: string;
  level: string;
  is_published: boolean;
  student_count: number;
}

export interface AdminInstructor {
  id: string;
  full_name: string;
  avatar_url: string | null;
  status: "pending" | "active";
  tier: "free" | "pro" | "studio";
  created_at: string;
  course_count: number;
  student_count: number;
  courses: AdminInstructorCourse[];
}

export interface AdminStudentEnrollment {
  course_id: string;
  course_title: string;
  course_level: string;
  is_published: boolean;
  instructor_name: string;
}

export interface AdminStudent {
  id: string;
  full_name: string;
  avatar_url: string | null;
  level: string | null;
  status: "pending" | "active";
  created_at: string;
  enrollment_count: number;
  instructor_names: string[];
  enrollments: AdminStudentEnrollment[];
}

export const adminApi = {
  stats: async (): Promise<AdminStats> => {
    const supabase = createClient();

    const [instructors, students, courses, enrollments] = await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "instructor"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "student"),
      supabase
        .from("courses")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true),
      supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true }),
    ]);

    return {
      totalInstructors: instructors.count ?? 0,
      totalStudents: students.count ?? 0,
      totalCourses: courses.count ?? 0,
      totalEnrollments: enrollments.count ?? 0,
    };
  },

  recentInvites: async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("invites")
      .select("id, email, full_name, consumed_at, expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) throw error;
    return data;
  },

  instructors: async (): Promise<AdminInstructor[]> => {
    const supabase = createClient();

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, status, tier, created_at")
      .eq("role", "instructor")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!profiles.length) return [];

    const instructorIds = profiles.map((p) => p.id);

    const { data: allCourses } = await supabase
      .from("courses")
      .select("id, title, level, is_published, instructor_id")
      .in("instructor_id", instructorIds)
      .order("created_at", { ascending: false });

    const courseIds = (allCourses ?? []).map((c) => c.id);

    const { data: enrollments } = courseIds.length
      ? await supabase
          .from("enrollments")
          .select("student_id, course_id")
          .in("course_id", courseIds)
      : { data: [] };

    // students per course
    const studentsByCourse = new Map<string, Set<string>>();
    for (const e of enrollments ?? []) {
      if (!studentsByCourse.has(e.course_id)) studentsByCourse.set(e.course_id, new Set());
      studentsByCourse.get(e.course_id)!.add(e.student_id);
    }

    // aggregate per instructor
    const coursesByInstructor = new Map<string, NonNullable<typeof allCourses>>();
    for (const c of allCourses ?? []) {
      if (!coursesByInstructor.has(c.instructor_id)) coursesByInstructor.set(c.instructor_id, []);
      coursesByInstructor.get(c.instructor_id)!.push(c);
    }

    return profiles.map((p) => {
      const instructorCourses = coursesByInstructor.get(p.id) ?? [];
      const totalStudents = new Set(
        instructorCourses.flatMap((c) => Array.from(studentsByCourse.get(c.id) ?? [])),
      ).size;

      return {
        ...p,
        course_count: instructorCourses.length,
        student_count: totalStudents,
        courses: instructorCourses.map((c) => ({
          id: c.id,
          title: c.title,
          level: c.level,
          is_published: c.is_published,
          student_count: studentsByCourse.get(c.id)?.size ?? 0,
        })),
      };
    });
  },

  students: async (): Promise<AdminStudent[]> => {
    const supabase = createClient();

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, level, status, created_at")
      .eq("role", "student")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!profiles.length) return [];

    const studentIds = profiles.map((p) => p.id);

    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("student_id, course_id")
      .in("student_id", studentIds);

    const courseIds = [...new Set((enrollments ?? []).map((e) => e.course_id))];

    const { data: courses } = courseIds.length
      ? await supabase
          .from("courses")
          .select("id, title, level, is_published, instructor_id, profiles(full_name)")
          .in("id", courseIds)
      : { data: [] };

    type CourseRow = {
      id: string;
      title: string;
      level: string;
      is_published: boolean;
      instructor_id: string;
      profiles: { full_name: string } | null;
    };

    const courseMap = new Map<string, CourseRow>();
    for (const c of (courses ?? []) as CourseRow[]) {
      courseMap.set(c.id, c);
    }

    const enrollmentsByStudent = new Map<string, {
      count: number;
      instructors: Set<string>;
      items: AdminStudentEnrollment[];
    }>();

    for (const e of enrollments ?? []) {
      if (!enrollmentsByStudent.has(e.student_id)) {
        enrollmentsByStudent.set(e.student_id, { count: 0, instructors: new Set(), items: [] });
      }
      const entry = enrollmentsByStudent.get(e.student_id)!;
      entry.count++;
      const course = courseMap.get(e.course_id);
      if (course) {
        const instructorName = course.profiles?.full_name ?? "—";
        entry.instructors.add(instructorName);
        entry.items.push({
          course_id: course.id,
          course_title: course.title,
          course_level: course.level,
          is_published: course.is_published,
          instructor_name: instructorName,
        });
      }
    }

    return profiles.map((p) => ({
      ...p,
      enrollment_count: enrollmentsByStudent.get(p.id)?.count ?? 0,
      instructor_names: Array.from(enrollmentsByStudent.get(p.id)?.instructors ?? []),
      enrollments: enrollmentsByStudent.get(p.id)?.items ?? [],
    }));
  },

  updateInstructorTier: async (id: string, tier: "free" | "pro" | "studio"): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ tier }).eq("id", id);
    if (error) throw error;
  },

  updateInstructorStatus: async (id: string, status: "pending" | "active"): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) throw error;
  },
};
