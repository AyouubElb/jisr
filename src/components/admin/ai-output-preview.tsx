"use client";

import { Badge } from "@/components/ui/badge";
import type { AIQuizOutput } from "@/lib/ai/schemas/quiz-output.schema";

interface AIOutputPreviewProps {
  output: AIQuizOutput;
}

/**
 * Read-only renderer for an AI quiz generation. Renders the FLAT model
 * output (not the rich quiz_blocks DB shape) so eval is performed on what
 * the model actually produced, before any instructor edits.
 */
export function AIOutputPreview({
  output,
}: AIOutputPreviewProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge>{output.cefr_targeted}</Badge>
          {output.skills_covered.map((s) => (
            <Badge key={s}>{s}</Badge>
          ))}
        </div>
        <h2 className="text-lg font-semibold">{output.title}</h2>
        <p className="text-sm text-muted-foreground">{output.description}</p>
      </header>

      <ol className="space-y-4">
        {output.blocks.map((block, idx) => (
          <li
            key={idx}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500">
                #{idx + 1}
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase text-slate-700">
                {block.type}
              </span>
            </div>

            {block.type === "mcq" && (
              <div className="space-y-2">
                <p className="font-medium">{block.question}</p>
                <ul className="space-y-1 pl-4">
                  {block.options.map((opt, i) => (
                    <li
                      key={i}
                      className={
                        i === block.correct_index
                          ? "font-medium text-green-700"
                          : "text-slate-700"
                      }
                    >
                      {String.fromCharCode(65 + i)}. {opt}
                      {i === block.correct_index ? " ✓" : ""}
                    </li>
                  ))}
                </ul>
                {block.explanation ? (
                  <p className="text-xs italic text-slate-500">
                    {block.explanation}
                  </p>
                ) : null}
              </div>
            )}

            {block.type === "fill_blank" && (
              <div className="space-y-2">
                <p className="font-medium">{block.sentence}</p>
                <ul className="space-y-1 pl-4">
                  {block.options.map((opt, i) => (
                    <li
                      key={i}
                      className={
                        i === block.correct_index
                          ? "font-medium text-green-700"
                          : "text-slate-700"
                      }
                    >
                      {String.fromCharCode(65 + i)}. {opt}
                      {i === block.correct_index ? " ✓" : ""}
                    </li>
                  ))}
                </ul>
                {block.explanation ? (
                  <p className="text-xs italic text-slate-500">
                    {block.explanation}
                  </p>
                ) : null}
              </div>
            )}

            {block.type === "free_text" && (
              <div className="space-y-2">
                <p className="font-medium">{block.question}</p>
                <p className="text-xs text-slate-500">
                  {block.min_words ?? "?"}–{block.max_words ?? "?"} words
                </p>
                <details className="text-sm">
                  <summary className="cursor-pointer text-slate-600">
                    Model answer + rubric
                  </summary>
                  <div className="mt-2 space-y-2 rounded bg-slate-50 p-3">
                    <p>
                      <span className="font-medium">Model:</span>{" "}
                      {block.model_answer}
                    </p>
                    <p>
                      <span className="font-medium">Rubric:</span>{" "}
                      {block.rubric}
                    </p>
                  </div>
                </details>
              </div>
            )}

            {block.type === "voice_response" && (
              <div className="space-y-2">
                <p className="font-medium">{block.question}</p>
                <p className="text-xs text-slate-500">
                  Voice answer
                  {block.max_seconds ? ` · ${block.max_seconds}s max` : ""}
                </p>
                <details className="text-sm">
                  <summary className="cursor-pointer text-slate-600">
                    Model answer + rubric
                  </summary>
                  <div className="mt-2 space-y-2 rounded bg-slate-50 p-3">
                    <p>
                      <span className="font-medium">Model:</span>{" "}
                      {block.model_answer}
                    </p>
                    <p>
                      <span className="font-medium">Rubric:</span>{" "}
                      {block.rubric}
                    </p>
                  </div>
                </details>
              </div>
            )}

            {block.type === "text_passage" && (
              <div className="space-y-3">
                {block.caption ? (
                  <p className="text-xs italic text-slate-500">
                    {block.caption}
                  </p>
                ) : null}
                <p className="whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm">
                  {block.passage}
                </p>
                <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
                  {(block.questions ?? []).map((q, qi) => (
                    <li key={qi} className="space-y-1">
                      <p className="font-medium">
                        {q.type === "fill_blank" ? q.sentence : q.question}
                      </p>
                      <ul className="space-y-1 pl-4">
                        {q.options.map((opt, i) => (
                          <li
                            key={i}
                            className={
                              i === q.correct_index
                                ? "font-medium text-green-700"
                                : "text-slate-700"
                            }
                          >
                            {String.fromCharCode(65 + i)}. {opt}
                            {i === q.correct_index ? " ✓" : ""}
                          </li>
                        ))}
                      </ul>
                      {q.explanation ? (
                        <p className="text-xs italic text-slate-500">
                          {q.explanation}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {block.type === "audio_passage" && (
              <div className="space-y-3">
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">
                    Script ({block.voice_hint ?? "default voice"})
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm">
                    {block.script}
                  </p>
                </details>
                {block.caption ? (
                  <p className="text-xs italic text-slate-500">
                    {block.caption}
                  </p>
                ) : null}
                <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
                  {(block.questions ?? []).map((q, qi) => (
                    <li key={qi} className="space-y-1">
                      <p className="font-medium">
                        {q.type === "fill_blank" ? q.sentence : q.question}
                      </p>
                      <ul className="space-y-1 pl-4">
                        {q.options.map((opt, i) => (
                          <li
                            key={i}
                            className={
                              i === q.correct_index
                                ? "font-medium text-green-700"
                                : "text-slate-700"
                            }
                          >
                            {String.fromCharCode(65 + i)}. {opt}
                            {i === q.correct_index ? " ✓" : ""}
                          </li>
                        ))}
                      </ul>
                      {q.explanation ? (
                        <p className="text-xs italic text-slate-500">
                          {q.explanation}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
