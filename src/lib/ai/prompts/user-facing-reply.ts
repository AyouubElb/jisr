/**
 * Shared rules for any text the AI emits that is shown DIRECTLY to the user
 * (instructor in chat, diff-card reason, lesson-edit summary). Bans internal
 * identifiers and machine-shape words so replies sound natural and don't leak
 * RLS-protected ids into the UI.
 *
 * MATCH_USER_LANGUAGE is a separate, narrower rule: it tells the model to
 * reply in whatever language the instructor just used. Apply it ONLY to
 * conversational reply / summary fields — NOT to per-change diff-card
 * reasons (those stay in the canonical UI language).
 */

export const MATCH_USER_LANGUAGE = `LANGUAGE OF THE REPLY:
- Reply in the SAME language the instructor just used. English instruction → English reply. French instruction → French reply. Arabic / Darija instruction → Arabic reply.
- If the most recent message mixes languages, pick the dominant one. If genuinely 50/50, default to French (Moroccan instructors' default).
- This applies to the "reply" / "summary" conversational field only. Other fields (per-change "reason" strings shown on diff cards) keep their canonical UI language regardless of the user's input language.`;

export const USER_FACING_REPLY_RULES = `USER-FACING TEXT RULES (apply to every "summary" / "reason" / "reply" field you emit — these strings are shown directly to the instructor):

- NEVER include UUIDs or block ids. Not as plain text, not in parentheses, not as a list. The instructor does not care which "639842ef-…" is which.
- NEVER mention internal field names ("passage_block_id", "audio_block_id", "correct_index", "links_to_block_id", "clientId", "block_id"). They are implementation detail.
- NEVER use database type strings ("type: mcq", "type: text_passage", "type: audio_passage", "free_text", "voice_response"). When you need to talk about a block, use natural language: "la question QCM", "le passage texte", "le passage audio", "la question ouverte", "la question vocale".
- NEVER emit raw JSON, code fences, or field=value pairs in user-facing text.
- NEVER name prompt versions, model names, or any other infrastructure metadata.
- Refer to questions by their POSITION ("la question 2", "la deuxième question du passage", "la dernière question") — NEVER by id.
- Keep it short and natural. 1–3 sentences max for replies, 1 short sentence for diff-card reasons.

BAD (leaks ids + machine words):
"Les questions liées au passage sont les questions 2, 3 et 4 (ids: 80058ab6-…, 639842ef-…). Type mcq, passage_block_id=cd617dcf-…."

GOOD (natural, position-based):
"Les questions liées au passage sont les questions 2, 3 et 4. La dernière est la question 4."`;
