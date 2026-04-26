import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";

const BodySchema = z.object({
  quizId: z.uuid(),
  action: z.enum(["save", "delete"]),
});

type AnyRecord = Record<string, unknown>;

const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const sorted: AnyRecord = {};
    for (const key of Object.keys(value as AnyRecord).sort()) {
      sorted[key] = sortKeys((value as AnyRecord)[key]);
    }
    return sorted;
  }
  return value;
};

const canonical = (block: {
  type: string;
  content: unknown;
  weight: unknown;
  order: number;
}): string =>
  JSON.stringify({
    type: block.type,
    content: sortKeys(block.content),
    weight: block.weight,
    order: block.order,
  });

export async function POST(req: Request): Promise<Response> {
  const supabase = await createServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const { data: gen, error: genError } = await supabase
    .from("ai_generations")
    .select(
      "id, output, instructor_accepted, instructor_edited, instructor_rejected",
    )
    .eq("output_quiz_id", body.quizId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (genError) {
    return NextResponse.json({ error: genError.message }, { status: 500 });
  }

  // Not AI-generated (or RLS hid it) — nothing to flag.
  if (!gen) return NextResponse.json({ resolved: false });

  // First flag wins — later saves/deletes must not overwrite it.
  const alreadyResolved =
    gen.instructor_accepted === true ||
    gen.instructor_edited === true ||
    gen.instructor_rejected === true;

  if (alreadyResolved) return NextResponse.json({ resolved: false });

  if (body.action === "delete") {
    const { error } = await supabase
      .from("ai_generations")
      .update({
        instructor_accepted: false,
        instructor_edited: false,
        instructor_rejected: true,
      })
      .eq("id", gen.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ resolved: true, state: "rejected" });
  }

  const snapshotRaw = (gen.output as AnyRecord | null)?.blocks_snapshot;
  if (!Array.isArray(snapshotRaw)) {
    return NextResponse.json({ resolved: false, reason: "no_snapshot" });
  }

  const { data: currentBlocks, error: blocksError } = await supabase
    .from("quiz_blocks")
    .select("type, content, weight, order")
    .eq("quiz_id", body.quizId)
    .order("order", { ascending: true });

  if (blocksError) {
    return NextResponse.json({ error: blocksError.message }, { status: 500 });
  }

  const snapshotCanon = (
    snapshotRaw as Array<{
      type: string;
      content: unknown;
      weight: unknown;
      order: number;
    }>
  )
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(canonical);

  const currentCanon = (currentBlocks ?? []).map((b) =>
    canonical(b as { type: string; content: unknown; weight: unknown; order: number }),
  );

  const unchanged =
    snapshotCanon.length === currentCanon.length &&
    snapshotCanon.every((s, i) => s === currentCanon[i]);

  const { error: updateError } = await supabase
    .from("ai_generations")
    .update(
      unchanged
        ? {
            instructor_accepted: true,
            instructor_edited: false,
            instructor_rejected: false,
          }
        : {
            instructor_accepted: false,
            instructor_edited: true,
            instructor_rejected: false,
          },
    )
    .eq("id", gen.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    resolved: true,
    state: unchanged ? "accepted" : "edited",
  });
}
