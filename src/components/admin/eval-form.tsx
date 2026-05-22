"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  isBelowPassBar,
  validateScores,
  type Rubric,
} from "@/lib/ai/eval/rubrics";
import { useUpsertEvaluation } from "@/lib/hooks/useAIAdmin";
import type { Database } from "@/lib/types/database";

type AIEvaluationRow =
  Database["public"]["Tables"]["generation_evaluations"]["Row"];

interface EvalFormProps {
  generationId: string;
  rubric: Rubric;
  humanEval: AIEvaluationRow | null;
  llmEval: AIEvaluationRow | null;
}

export function EvalForm({
  generationId,
  rubric,
  humanEval,
  llmEval,
}: EvalFormProps): React.JSX.Element {
  // Prefill from human if it exists, else fall back to LLM judge.
  const seedSource = humanEval ?? llmEval;

  const initial = useMemo(() => {
    const seed: Record<string, number | boolean | null> = {};
    for (const c of rubric.criteria) {
      const v = (seedSource?.scores as Record<string, unknown> | undefined)?.[
        c.key
      ];
      if (c.type === "scale_1_5") {
        seed[c.key] = typeof v === "number" ? v : null;
      } else {
        seed[c.key] = typeof v === "boolean" ? v : null;
      }
    }
    return seed;
  }, [rubric, seedSource]);

  const [scores, setScores] = useState(initial);
  // Strip the LLM enumeration when seeding — keep only the trailing NOTES.
  const seedNotes = humanEval
    ? (humanEval.notes ?? "")
    : extractJudgeNotes(llmEval?.notes ?? "");
  const [notes, setNotes] = useState(seedNotes);
  const { mutate, isPending } = useUpsertEvaluation();

  const allFilled = rubric.criteria.every((c) => scores[c.key] !== null);
  const failingScores = isBelowPassBar(
    rubric,
    scores as Record<string, unknown>,
  );
  // Notes mandatory when at least one criterion is below pass bar — that's
  // the rule from docs/AI-EVAL-CRITERIA.md ("note answers what to fix").
  const notesRequired = failingScores;
  const notesOk = notesRequired ? notes.trim().length >= 10 : true;
  const canSubmit = allFilled && notesOk && !isPending;

  const onSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    try {
      const validated = validateScores(
        rubric,
        scores as Record<string, unknown>,
      );
      mutate({
        generationId,
        rubricKey: rubric.key,
        scores: validated,
        notes: notes.trim() || null,
      });
    } catch (err) {
      // validateScores throws human-readable French message
      // eslint-disable-next-line no-alert
      alert(err instanceof Error ? err.message : "Erreur de validation");
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {rubric.label}
        </h3>
        {humanEval ? (
          <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <p className="font-medium">Validated by admin</p>
            <p className="text-emerald-700/80">
              Your changes update this evaluation.
            </p>
          </div>
        ) : llmEval ? (
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <p className="font-medium">LLM evaluation — not validated</p>
            <p className="text-amber-700/80">
              Scores pre-filled by the AI judge. Validate as-is or edit, then
              save.
            </p>
          </div>
        ) : null}
      </div>

      {rubric.criteria.map((c) => (
        <div key={c.key} className="space-y-2">
          <div>
            <Label className="text-sm font-medium">{c.label}</Label>
            <p className="text-xs text-slate-500">{c.description}</p>
          </div>

          {c.type === "scale_1_5" ? (
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => {
                const selected = scores[c.key] === n;
                const passBar = c.passBar as number;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      setScores((prev) => ({ ...prev, [c.key]: n }))
                    }
                    className={`flex h-9 w-9 items-center justify-center rounded border text-sm font-medium transition ${
                      selected
                        ? n < passBar
                          ? "border-red-500 bg-red-500 text-white"
                          : "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setScores((prev) => ({ ...prev, [c.key]: true }))
                }
                className={`flex-1 rounded border px-3 py-2 text-sm font-medium transition ${
                  scores[c.key] === true
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Pass
              </button>
              <button
                type="button"
                onClick={() =>
                  setScores((prev) => ({ ...prev, [c.key]: false }))
                }
                className={`flex-1 rounded border px-3 py-2 text-sm font-medium transition ${
                  scores[c.key] === false
                    ? "border-red-500 bg-red-500 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Fail
              </button>
            </div>
          )}
        </div>
      ))}

      <div className="space-y-1">
        <Label htmlFor="eval-notes" className="text-sm font-medium">
          Notes{" "}
          {notesRequired ? (
            <span className="text-xs text-red-600">
              (required — at least one criterion below the bar)
            </span>
          ) : (
            <span className="text-xs text-slate-500">(optional)</span>
          )}
        </Label>
        <Textarea
          id="eval-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What should change in the prompt to score better next time?"
          rows={4}
        />
      </div>

      <Button type="submit" disabled={!canSubmit} className="w-full">
        {isPending ? "Saving…" : "Save evaluation"}
      </Button>

      {!allFilled ? (
        <p className="text-xs text-slate-500">
          Fill in all criteria to save.
        </p>
      ) : !notesOk ? (
        <p className="text-xs text-red-600">
          A note of at least 10 characters is required when a criterion fails.
        </p>
      ) : null}
    </form>
  );
}

// Strip OBSERVED BLOCKS / MIX CHECK sections from the judge's composed notes
// so the human textarea seeds only with the trailing NOTES content.
function extractJudgeNotes(raw: string): string {
  if (!raw) return "";
  const marker = "NOTES:";
  const idx = raw.indexOf(marker);
  if (idx === -1) {
    return raw.includes("OBSERVED BLOCKS:") || raw.includes("MIX CHECK:")
      ? ""
      : raw;
  }
  return raw.slice(idx + marker.length).trim();
}
