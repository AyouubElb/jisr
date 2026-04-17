// This file will be replaced by `supabase gen types typescript` once the DB is set up.
// For now, it provides the type structure so code compiles and queries are type-safe.

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: "student" | "instructor";
          avatar_url: string | null;
          level: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role: "student" | "instructor";
          avatar_url?: string | null;
          level?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: "student" | "instructor";
          avatar_url?: string | null;
          level?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          instructor_id: string;
          title: string;
          description: string;
          level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
          thumbnail_url: string | null;
          is_published: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          instructor_id: string;
          title: string;
          description: string;
          level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
          thumbnail_url?: string | null;
          is_published?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          instructor_id?: string;
          title?: string;
          description?: string;
          level?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
          thumbnail_url?: string | null;
          is_published?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_instructor_id_fkey";
            columns: ["instructor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      sections: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          order: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sections_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          }
        ];
      };
      lessons: {
        Row: {
          id: string;
          section_id: string;
          title: string;
          content: string;
          type: "grammar" | "vocabulary" | "resource";
          order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          section_id: string;
          title: string;
          content?: string;
          type: "grammar" | "vocabulary" | "resource";
          order: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          section_id?: string;
          title?: string;
          content?: string;
          type?: "grammar" | "vocabulary" | "resource";
          order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["id"];
          }
        ];
      };
      exercises: {
        Row: {
          id: string;
          section_id: string;
          title: string;
          content: string;
          order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          section_id: string;
          title: string;
          content?: string;
          order: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          section_id?: string;
          title?: string;
          content?: string;
          order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exercises_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["id"];
          }
        ];
      };
      live_sessions: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          meeting_link: string;
          scheduled_at: string;
          duration_minutes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          meeting_link: string;
          scheduled_at: string;
          duration_minutes: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          meeting_link?: string;
          scheduled_at?: string;
          duration_minutes?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "live_sessions_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          }
        ];
      };
      enrollments: {
        Row: {
          id: string;
          student_id: string;
          course_id: string;
          enrolled_at: string;
          last_active_at: string | null;
        };
        Insert: {
          id?: string;
          student_id: string;
          course_id: string;
          enrolled_at?: string;
          last_active_at?: string | null;
        };
        Update: {
          id?: string;
          student_id?: string;
          course_id?: string;
          enrolled_at?: string;
          last_active_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "enrollments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          }
        ];
      };
      materials: {
        Row: {
          id: string;
          lesson_id: string | null;
          exercise_id: string | null;
          name: string;
          file_url: string;
          file_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          lesson_id?: string | null;
          exercise_id?: string | null;
          name: string;
          file_url: string;
          file_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string | null;
          exercise_id?: string | null;
          name?: string;
          file_url?: string;
          file_type?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "materials_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materials_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          }
        ];
      };
      quizzes: {
        Row: {
          id: string;
          section_id: string;
          title: string;
          description: string;
          time_limit_minutes: number | null;
          passing_score: number;
          order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          section_id: string;
          title: string;
          description?: string;
          time_limit_minutes?: number | null;
          passing_score?: number;
          order: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          section_id?: string;
          title?: string;
          description?: string;
          time_limit_minutes?: number | null;
          passing_score?: number;
          order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quizzes_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["id"];
          }
        ];
      };
      quiz_blocks: {
        Row: {
          id: string;
          quiz_id: string;
          type: "text" | "audio" | "image" | "mcq" | "fill_blank" | "free_text" | "voice";
          content: Record<string, unknown>;
          weight: number | null;
          model_answer: string | null;
          grading_notes: string | null;
          order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          type: "text" | "audio" | "image" | "mcq" | "fill_blank" | "free_text" | "voice";
          content: Record<string, unknown>;
          weight?: number | null;
          model_answer?: string | null;
          grading_notes?: string | null;
          order: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          type?: "text" | "audio" | "image" | "mcq" | "fill_blank" | "free_text" | "voice";
          content?: Record<string, unknown>;
          weight?: number | null;
          model_answer?: string | null;
          grading_notes?: string | null;
          order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_blocks_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          }
        ];
      };
      student_attempts: {
        Row: {
          id: string;
          quiz_id: string;
          student_id: string;
          started_at: string;
          submitted_at: string | null;
          auto_score: number | null;
          final_score: number | null;
          status: "in_progress" | "submitted" | "pending_review" | "graded";
          graded_at: string | null;
          graded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          student_id: string;
          started_at?: string;
          submitted_at?: string | null;
          auto_score?: number | null;
          final_score?: number | null;
          status?: "in_progress" | "submitted" | "pending_review" | "graded";
          graded_at?: string | null;
          graded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          student_id?: string;
          started_at?: string;
          submitted_at?: string | null;
          auto_score?: number | null;
          final_score?: number | null;
          status?: "in_progress" | "submitted" | "pending_review" | "graded";
          graded_at?: string | null;
          graded_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_attempts_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_attempts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      student_answers: {
        Row: {
          id: string;
          attempt_id: string;
          block_id: string;
          answer: Record<string, unknown>;
          is_correct: boolean | null;
          earned_weight: number | null;
          instructor_feedback: string | null;
          graded_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          block_id: string;
          answer?: Record<string, unknown>;
          is_correct?: boolean | null;
          earned_weight?: number | null;
          instructor_feedback?: string | null;
          graded_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          attempt_id?: string;
          block_id?: string;
          answer?: Record<string, unknown>;
          is_correct?: boolean | null;
          earned_weight?: number | null;
          instructor_feedback?: string | null;
          graded_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_answers_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "student_attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_answers_block_id_fkey";
            columns: ["block_id"];
            isOneToOne: false;
            referencedRelation: "quiz_blocks";
            referencedColumns: ["id"];
          }
        ];
      };
      lesson_completions: {
        Row: {
          id: string;
          lesson_id: string;
          student_id: string;
          completed_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          student_id: string;
          completed_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          student_id?: string;
          completed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_completions_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_completions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      session_attendance: {
        Row: {
          id: string;
          session_id: string;
          student_id: string;
          attended: boolean;
          marked_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          student_id: string;
          attended?: boolean;
          marked_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          student_id?: string;
          attended?: boolean;
          marked_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_attendance_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "live_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_attendance_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      touch_enrollment_activity: {
        Args: { p_course_id: string };
        Returns: void;
      };
    };
  };
};
