import type { LessonPattern } from "../styles";

const templateBlock = `A1/A2 VOCABULARY TEMPLATE (documentary — pattern-driven, screen-share-friendly, pure English, no metalanguage):

Output shape, in this order:

  <h2>{theme}</h2>
  <p>{one-line function frame: when the student will use these words. ONE sentence.}</p>

  [for EACH word — 6-8 at A1, 10-12 at A2]
    <h3>{word}</h3>
    <blockquote>{one simple phrase using the word — e.g. "I drink tea."}</blockquote>
    <blockquote>{one mini dialogue — two short lines — e.g. "Do you want tea?" → "Yes, please."}</blockquote>
    <blockquote><em>Speaking task:</em> {one open question that invites the student to use the word — e.g. "What do you drink in the morning?"}</blockquote>
  [end per-word]

  <h2>Conversations</h2>
  [2-3 short conversations (Conversation 1, Conversation 2, Conversation 3) — natural, realistic, varied across scenes related to the theme. Each conversation is 6-10 short lines between two named or labelled speakers (Man / Woman, Waiter / Customer, Friend A / Friend B, etc.). Every target word from the list above MUST appear at least once across the conversations and be wrapped in <strong> each time it appears.]

  Format for each conversation — wrap the ENTIRE conversation in a <div data-conversation="N" data-voices='{...}'> container (N = 1, 2, 3…). The container is the stable marker the audio player keys off; the visible heading text can be anything (e.g. "Conversation 1", "Dialog 1", localized variants).

    data-voices is REQUIRED — a JSON object mapping each speaker label EXACTLY as it appears in <strong>Speaker:</strong> to a voice id from this list:
      male voices: onyx, echo, ash, ballad
      female voices: nova, shimmer, coral, sage
    Picking the voice (do this honestly — students rely on it):
      - Speaker label says man / boy / father / Mr. X / waiter / doctor / a man's first name → male voice.
      - Speaker label says woman / girl / mother / Mrs. X / Ms. X / waitress / a woman's first name → female voice.
      - Ambiguous labels (Friend A, Friend B, Speaker 1, Speaker 2): assign one male and one female so the dialogue contrasts.
      - Use DIFFERENT voices for different speakers in the same conversation. Two males → onyx + echo (or any two male voices). Two females → nova + shimmer.

    <div data-conversation="{N}" data-voices='{"{Speaker A}":"{voice}","{Speaker B}":"{voice}"}'>
      <h3>Conversation {N}</h3>
      <p><strong>{Speaker A}:</strong> {short line — wrap any target word in <strong>}</p>
      <p><strong>{Speaker B}:</strong> {short line — wrap any target word in <strong>}</p>
      [continue alternating, 6-10 lines total]
    </div>

  <h2>Try saying it</h2>   ← only if includeExercises = true
  [3-4 pattern fill-in prompts, each as a <p>. No answer keys.]
    <p>{Substitution prompt with ___ marking the blank. Then list 3-4 option words in parentheses.}</p>

Rules:
- NO "About these words" intro paragraph. The theme card + function-frame line IS the intro.
- Pure English only.
- NO definition paragraphs per word. The phrase + dialogue + speaking task ARE the word's context.
- NO "Common mistakes" section.
- NO "Say this, not this" pairs in the vocabulary template (those belong in the GRAMMAR template).
- ZERO metalanguage ("uncountable", "article", "preposition" all banned).
- Conversations must be CREATIVE and varied — different scenes, different speakers, different situations. Do NOT recycle the same speaking task questions as conversation lines.
- Every target word MUST appear bolded (<strong>) at least once across the conversations. A word can appear in multiple conversations.
- Conversations stay short and CEFR-appropriate: A1 lines max 8 words each, A2 max 12 words each.
- "Try saying it" is pattern drills, NOT multiple-choice tests.`;

export const documentaryA1A2Vocabulary: LessonPattern = {
  id: "documentary-a1-a2-vocabulary",
  style: "documentary",
  levelBucket: "a1-a2",
  lessonType: "vocabulary",
  whenToUse:
    "Default A1/A2 vocabulary lesson. The instructor screen-shares this in class; the same artifact is the student's revision doc later. Pattern-driven per-word entries + realistic conversations that use every target word.",
  templateBlock,
  examples: [],
  styleChecks: [
    {
      id: "A1A2_VOCAB_COUNT",
      description:
        "Number of <h3>word</h3> entries between the theme intro and the Conversations section is within range: A1 = 6-8, A2 = 10-12.",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "A1A2_VOCAB_THREE_BLOCKQUOTES_PER_WORD",
      description:
        "Each <h3>word</h3> entry is followed by exactly 3 <blockquote> elements in order: phrase, mini dialogue, speaking task (with <em>Speaking task:</em> prefix).",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "A1A2_VOCAB_NO_DEFINITION_PARAGRAPH",
      description:
        "No <p> definition paragraph appears under any <h3>word</h3>. The 3 blockquotes ARE the word's context.",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "A1A2_VOCAB_HAS_CONVERSATIONS_SECTION",
      description:
        "A <h2>Conversations</h2> section exists with 2-3 conversation containers (<div data-conversation>).",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "A1A2_VOCAB_CONVERSATION_VOICES_VALID",
      description:
        "Every conversation <div> has a data-voices JSON attribute mapping each speaker label to a valid voice id (onyx, echo, ash, ballad, nova, shimmer, coral, sage).",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "A1A2_VOCAB_ALL_WORDS_BOLDED_IN_CONVERSATIONS",
      description:
        "Every target word from the <h3> entries appears at least once inside a conversation wrapped in <strong>.",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "A1A2_NO_METALANGUAGE",
      description:
        "Student-facing text contains no banned metalanguage: 'uncountable', 'auxiliary', 'third-person', 'article', 'preposition', 'modal', 'infinitive'.",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "A1A2_NO_COMMON_MISTAKES",
      description:
        "No <h2>Common mistakes</h2> section (does not belong in the A1/A2 vocabulary pattern).",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "A1A2_NO_SAY_NOT_PAIRS",
      description:
        "No 'Say this, not this' pairs (those belong in the A1/A2 grammar pattern, not vocabulary).",
      kind: "hard",
      severity: "must_fix",
    },
    {
      id: "A1A2_VOCAB_SENTENCE_LENGTH",
      description:
        "Conversation lines stay within length limits: A1 max 8 words per line, A2 max 12 words per line.",
      kind: "hard",
      severity: "should_fix",
    },
    {
      id: "A1A2_VOCAB_CONVERSATIONS_VARIED",
      description:
        "Across ALL the conversations in the lesson, no two conversations use the same scene + same speaker pair + same situation. Different settings (home / work / shop / station / etc.), different speaker pairs, and different reasons for talking. Only flag if two or more conversations are clearly the SAME (same setting AND same speaker pair AND same situation).",
      kind: "soft",
      severity: "should_fix",
    },
  ],
};
