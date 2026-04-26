/**
 * Static CEFR rubric included in every quiz-gen call. Kept in its own
 * module so it sits in the "stable" prompt tier and benefits from provider
 * caching. Edit with care — changes bump the prompt version.
 */
export const CEFR_RUBRIC = `CEFR level reference:

A1 (Beginner):
- Grammar: present simple, "to be", basic possessives.
- Vocabulary: ~500 words — greetings, family, numbers, daily objects.
- Topics: self-introduction, classroom, home.
- Sentence length: short (5–8 words).

A2 (Elementary):
- Grammar: past simple, present continuous, simple future (going to).
- Vocabulary: ~1000 words — shopping, food, weather, routines.
- Topics: daily life, simple travel, hobbies.
- Sentence length: short-to-medium (8–12 words).

B1 (Intermediate):
- Grammar: present perfect, conditionals (1st), passive voice (simple).
- Vocabulary: ~2000 words — work, opinions, plans, experiences.
- Topics: travel, work, opinions on familiar subjects.
- Sentence length: medium (12–18 words), some subordinate clauses.

B2 (Upper-Intermediate):
- Grammar: all conditionals, reported speech, advanced passive, modals of deduction.
- Vocabulary: ~4000 words — abstract ideas, nuance, collocations.
- Topics: current events, debates, specialised fields.
- Sentence length: long, multi-clause, discourse markers.

C1 (Advanced):
- Grammar: inversion, cleft sentences, complex tense combinations.
- Vocabulary: ~8000 words — idioms, register, formal/informal shifts.
- Topics: academic, professional, abstract argumentation.
- Sentence length: complex, cohesive across paragraphs.

C2 (Proficiency):
- Grammar: near-native control of all structures.
- Vocabulary: ~16000 words — subtle connotations, literary register.
- Topics: any, including highly abstract and specialised.
- Sentence length: equivalent to educated native speaker.
`;
