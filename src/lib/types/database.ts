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
          role: "student" | "instructor" | "admin";
          avatar_url: string | null;
          level: string | null;
          status: "pending" | "active";
          tier: "free" | "pro" | "studio";
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role: "student" | "instructor" | "admin";
          avatar_url?: string | null;
          level?: string | null;
          status?: "pending" | "active";
          tier?: "free" | "pro" | "studio";
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: "student" | "instructor" | "admin";
          avatar_url?: string | null;
          level?: string | null;
          status?: "pending" | "active";
          tier?: "free" | "pro" | "studio";
          created_at?: string;
        };
        Relationships: [];
      };
      invites: {
        Row: {
          id: string;
          token: string;
          email: string;
          kind: "student" | "instructor";
          instructor_id: string | null;
          full_name: string | null;
          expires_at: string;
          consumed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          token: string;
          email: string;
          kind: "student" | "instructor";
          instructor_id?: string | null;
          full_name?: string | null;
          expires_at: string;
          consumed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          token?: string;
          email?: string;
          kind?: "student" | "instructor";
          instructor_id?: string | null;
          full_name?: string | null;
          expires_at?: string;
          consumed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      instructor_students: {
        Row: {
          instructor_id: string;
          student_id: string;
          added_at: string;
        };
        Insert: {
          instructor_id: string;
          student_id: string;
          added_at?: string;
        };
        Update: {
          instructor_id?: string;
          student_id?: string;
          added_at?: string;
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
      section_items: {
        Row: {
          id: string;
          section_id: string;
          item_type: "lesson" | "quiz";
          item_id: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          section_id: string;
          item_type: "lesson" | "quiz";
          item_id: string;
          position: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          section_id?: string;
          item_type?: "lesson" | "quiz";
          item_id?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "section_items_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
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
          removed_at: string | null;
        };
        Insert: {
          id?: string;
          student_id: string;
          course_id: string;
          enrolled_at?: string;
          last_active_at?: string | null;
          removed_at?: string | null;
        };
        Update: {
          id?: string;
          student_id?: string;
          course_id?: string;
          enrolled_at?: string;
          last_active_at?: string | null;
          removed_at?: string | null;
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
          lesson_id: string;
          name: string;
          file_url: string;
          file_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          name: string;
          file_url: string;
          file_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
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
          max_attempts: number | null;
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
          max_attempts?: number | null;
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
          max_attempts?: number | null;
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
          type: "text" | "audio" | "image" | "mcq" | "fill_blank" | "free_text" | "voice" | "section";
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
          type: "text" | "audio" | "image" | "mcq" | "fill_blank" | "free_text" | "voice" | "section";
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
          type?: "text" | "audio" | "image" | "mcq" | "fill_blank" | "free_text" | "voice" | "section";
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
          ai_score: number | null;
          ai_is_correct: boolean | null;
          ai_rationale: string | null;
          ai_errors: Record<string, unknown> | null;
          ai_graded_at: string | null;
          ai_model: string | null;
          ai_prompt_version: string | null;
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
          ai_score?: number | null;
          ai_is_correct?: boolean | null;
          ai_rationale?: string | null;
          ai_errors?: Record<string, unknown> | null;
          ai_graded_at?: string | null;
          ai_model?: string | null;
          ai_prompt_version?: string | null;
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
          ai_score?: number | null;
          ai_is_correct?: boolean | null;
          ai_rationale?: string | null;
          ai_errors?: Record<string, unknown> | null;
          ai_graded_at?: string | null;
          ai_model?: string | null;
          ai_prompt_version?: string | null;
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
      course_questions: {
        Row: {
          id: string;
          course_id: string;
          student_id: string;
          title: string;
          body: string;
          status: "open" | "resolved";
          created_at: string;
          last_activity_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          course_id: string;
          student_id: string;
          title: string;
          body: string;
          status?: "open" | "resolved";
          created_at?: string;
          last_activity_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          course_id?: string;
          student_id?: string;
          title?: string;
          body?: string;
          status?: "open" | "resolved";
          created_at?: string;
          last_activity_at?: string;
          resolved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "course_questions_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_questions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      course_question_replies: {
        Row: {
          id: string;
          question_id: string;
          author_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          author_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          question_id?: string;
          author_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_question_replies_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "course_questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_question_replies_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      ai_generations: {
        Row: {
          id: string;
          created_at: string;
          user_id: string | null;
          feature: string;
          model: string;
          provider: string;
          prompt_version: string;
          input_context: Record<string, unknown> | null;
          input_hash: string | null;
          output: Record<string, unknown> | null;
          schema_valid: boolean;
          retry_count: number;
          input_tokens: number | null;
          output_tokens: number | null;
          cache_read_tokens: number | null;
          latency_ms: number | null;
          cost_cents: number | null;
          output_quiz_id: string | null;
          instructor_accepted: boolean | null;
          instructor_edited: boolean | null;
          instructor_rejected: boolean | null;
          instructor_rating: number | null;
          error: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          feature: string;
          model: string;
          provider: string;
          prompt_version: string;
          input_context?: Record<string, unknown> | null;
          input_hash?: string | null;
          output?: Record<string, unknown> | null;
          schema_valid?: boolean;
          retry_count?: number;
          input_tokens?: number | null;
          output_tokens?: number | null;
          cache_read_tokens?: number | null;
          latency_ms?: number | null;
          cost_cents?: number | null;
          output_quiz_id?: string | null;
          instructor_accepted?: boolean | null;
          instructor_edited?: boolean | null;
          instructor_rejected?: boolean | null;
          instructor_rating?: number | null;
          error?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          feature?: string;
          model?: string;
          provider?: string;
          prompt_version?: string;
          input_context?: Record<string, unknown> | null;
          input_hash?: string | null;
          output?: Record<string, unknown> | null;
          schema_valid?: boolean;
          retry_count?: number;
          input_tokens?: number | null;
          output_tokens?: number | null;
          cache_read_tokens?: number | null;
          latency_ms?: number | null;
          cost_cents?: number | null;
          output_quiz_id?: string | null;
          instructor_accepted?: boolean | null;
          instructor_edited?: boolean | null;
          instructor_rejected?: boolean | null;
          instructor_rating?: number | null;
          error?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_generations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_generations_output_quiz_id_fkey";
            columns: ["output_quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          }
        ];
      };
      generation_evaluations: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          generation_id: string;
          evaluator_id: string | null;
          evaluator_type: "human" | "llm_judge";
          rubric_key: string;
          scores: Record<string, unknown>;
          notes: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          generation_id: string;
          evaluator_id?: string | null;
          evaluator_type?: "human" | "llm_judge";
          rubric_key: string;
          scores: Record<string, unknown>;
          notes?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          generation_id?: string;
          evaluator_id?: string | null;
          evaluator_type?: "human" | "llm_judge";
          rubric_key?: string;
          scores?: Record<string, unknown>;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_evaluations_generation_id_fkey";
            columns: ["generation_id"];
            isOneToOne: false;
            referencedRelation: "ai_generations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_evaluations_evaluator_id_fkey";
            columns: ["evaluator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      ai_audio_cache: {
        Row: {
          id: string;
          created_at: string;
          script_hash: string;
          voice_id: string;
          speed: number;
          audio_url: string;
          storage_path: string;
          char_count: number;
          duration_seconds: number | null;
          provider: string;
          model: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          script_hash: string;
          voice_id: string;
          speed?: number;
          audio_url: string;
          storage_path: string;
          char_count: number;
          duration_seconds?: number | null;
          provider?: string;
          model?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          script_hash?: string;
          voice_id?: string;
          speed?: number;
          audio_url?: string;
          storage_path?: string;
          char_count?: number;
          duration_seconds?: number | null;
          provider?: string;
          model?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      generation_eval_agreement: {
        Row: {
          generation_id: string;
          rubric_key: string;
          human_scores: Record<string, unknown>;
          human_notes: string | null;
          human_evaluator_id: string | null;
          human_updated_at: string;
          judge_scores: Record<string, unknown>;
          judge_notes: string | null;
          judge_updated_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      touch_enrollment_activity: {
        Args: { p_course_id: string };
        Returns: void;
      };
      get_invite_by_token: {
        Args: { p_token: string };
        Returns: {
          email: string;
          kind: "student" | "instructor";
          full_name: string | null;
          expires_at: string;
        }[];
      };
      consume_invite_and_create_profile: {
        Args: {
          p_token: string;
          p_email: string;
          p_user_id: string;
          p_full_name: string;
        };
        Returns: void;
      };
      create_student_profile_and_enroll: {
        Args: {
          p_student_id: string;
          p_full_name: string;
          p_level: string | null;
          p_instructor_id: string;
          p_course_id: string | null;
        };
        Returns: void;
      };
      start_quiz_attempt: {
        Args: { p_quiz_id: string };
        Returns: {
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
      };
      reorder_section_item: {
        Args: { p_section_item_id: string; p_new_position: number };
        Returns: void;
      };
      save_quiz_blocks: {
        Args: { p_quiz_id: string; p_blocks: unknown };
        Returns: {
          id: string;
          quiz_id: string;
          type: "text" | "audio" | "image" | "mcq" | "fill_blank" | "free_text" | "voice" | "section";
          content: Record<string, unknown>;
          weight: number | null;
          model_answer: string | null;
          grading_notes: string | null;
          order: number;
          created_at: string;
        }[];
      };
    };
  };
};
