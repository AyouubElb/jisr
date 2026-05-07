"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, Compass, ListChecks, Mic, School } from "lucide-react";
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
        <p className="text-sm font-medium">Contexte d&apos;entrée</p>
        <details>
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Afficher les données brutes
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
  const audio = c.mix?.audio_passage ?? 0;
  const perAudioMcq = c.questionsPerAudioPassage?.mcq ?? 0;
  const perAudioFill = c.questionsPerAudioPassage?.fill_blank ?? 0;
  const perAudioTotal = perAudioMcq + perAudioFill;
  const directTotal = mcq + fill + free;

  const mixParts: string[] = [];
  if (mcq) mixParts.push(`${mcq} QCM`);
  if (fill) mixParts.push(`${fill} à compléter`);
  if (free) mixParts.push(`${free} réponse${free > 1 ? "s" : ""} libre${free > 1 ? "s" : ""}`);

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Demande de l&apos;instructeur
          </h2>
          {course?.level ? (
            <Badge
              className={LEVEL_BADGE_COLORS[course.level as CEFRLevel] ?? ""}
            >
              {course.level}
            </Badge>
          ) : null}
        </div>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ContextRow
            icon={<School className="h-4 w-4" />}
            label="Cours"
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
            label="Sujet ciblé"
            value={
              c.focusTopic ? (
                <span>{c.focusTopic}</span>
              ) : (
                <span className="text-muted-foreground">Aucun</span>
              )
            }
          />

          <ContextRow
            icon={<BookOpen className="h-4 w-4" />}
            label={`Leçons sources (${lessonIds.length})`}
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
            label={`Composition (${directTotal} questions directes)`}
            value={
              mixParts.length > 0 ? (
                <span>{mixParts.join(" · ")}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
          />

          {audio > 0 ? (
            <ContextRow
              icon={<Mic className="h-4 w-4" />}
              label="Passages audio"
              value={
                <span>
                  {audio} passage{audio > 1 ? "s" : ""} × {perAudioTotal} question
                  {perAudioTotal !== 1 ? "s" : ""}
                  {perAudioMcq > 0 || perAudioFill > 0 ? (
                    <span className="text-muted-foreground">
                      {" "}({[perAudioMcq > 0 ? `${perAudioMcq} QCM` : "", perAudioFill > 0 ? `${perAudioFill} à trous` : ""].filter(Boolean).join(" + ")})
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
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}
