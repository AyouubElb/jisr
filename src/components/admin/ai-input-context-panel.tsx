"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, Compass, FileText, ListChecks, Mic, School } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { LEVEL_BADGE_COLORS } from "@/lib/constants/levels";
import { Badge } from "@/components/ui/badge";
import type { CEFRLevel } from "@/lib/types";

interface AIInputContextPanelProps {
  feature: string;
  inputContext: Record<string, unknown> | null;
}

/**
 * Friendly renderer for ai_generations.input_context. Maps the typed quiz_gen
 * shape to labelled rows; falls back to a collapsible JSON dump for unknown
 * features so the panel always tells you something.
 */
export function AIInputContextPanel({
  feature,
  inputContext,
}: AIInputContextPanelProps): React.JSX.Element | null {
  if (!inputContext) return null;

  if (feature === "quiz_gen") {
    return <QuizGenContext ctx={inputContext} />;
  }

  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <p className="text-sm font-medium">Input context</p>
        <details>
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Show raw data
          </summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-muted/50 p-3 text-xs">
            {JSON.stringify(inputContext, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}

interface QuizGenInput {
  courseId?: string;
  sectionId?: string;
  lessonIds?: string[];
  numQuestions?: number;
  mix?: {
    mcq?: number;
    fill_blank?: number;
    free_text?: number;
    voice_response?: number;
    text_passage?: number;
    audio_passage?: number;
  };
  questionsPerTextPassage?: { mcq?: number; fill_blank?: number };
  questionsPerAudioPassage?: { mcq?: number; fill_blank?: number };
  focusTopic?: string;
}

function QuizGenContext({
  ctx,
}: {
  ctx: Record<string, unknown>;
}): React.JSX.Element {
  const c = ctx as QuizGenInput;
  const lessonIds = Array.isArray(c.lessonIds) ? c.lessonIds : [];

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["ai-input-course", c.courseId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("courses")
        .select("title, level")
        .eq("id", c.courseId as string)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!c.courseId,
  });

  const { data: lessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ["ai-input-lessons", lessonIds.join(",")],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title")
        .in("id", lessonIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: lessonIds.length > 0,
  });

  const mcq = c.mix?.mcq ?? 0;
  const fill = c.mix?.fill_blank ?? 0;
  const free = c.mix?.free_text ?? 0;
  const voice = c.mix?.voice_response ?? 0;
  const text = c.mix?.text_passage ?? 0;
  const audio = c.mix?.audio_passage ?? 0;
  const perTextMcq = c.questionsPerTextPassage?.mcq ?? 0;
  const perTextFill = c.questionsPerTextPassage?.fill_blank ?? 0;
  const perTextTotal = perTextMcq + perTextFill;
  const perAudioMcq = c.questionsPerAudioPassage?.mcq ?? 0;
  const perAudioFill = c.questionsPerAudioPassage?.fill_blank ?? 0;
  const perAudioTotal = perAudioMcq + perAudioFill;
  const directTotal = mcq + fill + free + voice;

  const mixParts: string[] = [];
  if (mcq) mixParts.push(`${mcq} MCQ`);
  if (fill) mixParts.push(`${fill} fill-blank`);
  if (free) mixParts.push(`${free} free-text`);
  if (voice) mixParts.push(`${voice} voice`);

  const subLabel = (m: number, f: number): string =>
    [m > 0 ? `${m} MCQ` : "", f > 0 ? `${f} fill-blank` : ""]
      .filter(Boolean)
      .join(" + ");

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Instructor request
          </h2>
          {course?.level ? (
            <Badge
              className={LEVEL_BADGE_COLORS[course.level as CEFRLevel] ?? ""}
            >
              {course.level}
            </Badge>
          ) : null}
        </div>

        <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ContextRow
            icon={<School className="h-4 w-4" />}
            label="Course"
            value={
              courseLoading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                course?.title ?? "—"
              )
            }
          />

          <ContextRow
            icon={<Compass className="h-4 w-4" />}
            label="Focus topic"
            value={
              c.focusTopic ? (
                <span>{c.focusTopic}</span>
              ) : (
                <span className="text-muted-foreground">None</span>
              )
            }
          />

          <ContextRow
            icon={<BookOpen className="h-4 w-4" />}
            label={`Source lessons (${lessonIds.length})`}
            value={
              lessonsLoading ? (
                <Skeleton className="h-4 w-48" />
              ) : lessons && lessons.length > 0 ? (
                <ul className="space-y-1">
                  {lessons.map((l) => (
                    <li key={l.id} className="text-sm">
                      • {l.title}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
            wide
          />

          <ContextRow
            icon={<ListChecks className="h-4 w-4" />}
            label={`Mix (${directTotal} direct questions)`}
            value={
              mixParts.length > 0 ? (
                <span>{mixParts.join(" · ")}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
          />

          {text > 0 ? (
            <ContextRow
              icon={<FileText className="h-4 w-4" />}
              label="Text passages"
              value={
                <span>
                  {text} passage{text > 1 ? "s" : ""} × {perTextTotal} question
                  {perTextTotal !== 1 ? "s" : ""}
                  {perTextMcq > 0 || perTextFill > 0 ? (
                    <span className="text-muted-foreground">
                      {" "}
                      ({subLabel(perTextMcq, perTextFill)})
                    </span>
                  ) : null}
                </span>
              }
            />
          ) : null}

          {audio > 0 ? (
            <ContextRow
              icon={<Mic className="h-4 w-4" />}
              label="Audio passages"
              value={
                <span>
                  {audio} passage{audio > 1 ? "s" : ""} × {perAudioTotal} question
                  {perAudioTotal !== 1 ? "s" : ""}
                  {perAudioMcq > 0 || perAudioFill > 0 ? (
                    <span className="text-muted-foreground">
                      {" "}
                      ({subLabel(perAudioMcq, perAudioFill)})
                    </span>
                  ) : null}
                </span>
              }
            />
          ) : null}
        </dl>
      </CardContent>
    </Card>
  );
}

function ContextRow({
  icon,
  label,
  value,
  wide,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  wide?: boolean;
}): React.JSX.Element {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <dt className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}
