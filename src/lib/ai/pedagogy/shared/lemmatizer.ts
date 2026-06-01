// Lightweight English lemmatizer for the Oxford 3000 vocab check.
// Regular suffix rules + irregular map for highest-frequency English words.

const IRREGULARS: Record<string, string> = {
  am: "be", is: "be", are: "be", was: "be", were: "be", been: "be", being: "be",
  has: "have", had: "have", having: "have",
  does: "do", did: "do", done: "do", doing: "do",
  goes: "go", went: "go", gone: "go", going: "go",
  got: "get", gotten: "get", getting: "get",
  made: "make", makes: "make", making: "make",
  said: "say", says: "say", saying: "say",
  took: "take", takes: "take", taken: "take", taking: "take",
  came: "come", comes: "come", coming: "come",
  saw: "see", seen: "see", sees: "see", seeing: "see",
  knew: "know", known: "know", knows: "know", knowing: "know",
  thought: "think", thinks: "think", thinking: "think",
  gave: "give", given: "give", gives: "give", giving: "give",
  found: "find", finds: "find", finding: "find",
  told: "tell", tells: "tell", telling: "tell",
  became: "become", becomes: "become", becoming: "become",
  left: "leave", leaves: "leave", leaving: "leave",
  felt: "feel", feels: "feel", feeling: "feel",
  brought: "bring", brings: "bring", bringing: "bring",
  began: "begin", begun: "begin", begins: "begin", beginning: "begin",
  kept: "keep", keeps: "keep", keeping: "keep",
  held: "hold", holds: "hold", holding: "hold",
  wrote: "write", written: "write", writes: "write", writing: "write",
  stood: "stand", stands: "stand", standing: "stand",
  heard: "hear", hears: "hear", hearing: "hear",
  lets: "let", letting: "let",
  meant: "mean", means: "mean", meaning: "mean",
  sets: "set", setting: "set",
  met: "meet", meets: "meet", meeting: "meet",
  ran: "run", runs: "run", running: "run",
  paid: "pay", pays: "pay", paying: "pay",
  sat: "sit", sits: "sit", sitting: "sit",
  spoke: "speak", spoken: "speak", speaks: "speak", speaking: "speak",
  lay: "lie", lain: "lie", lies: "lie", lying: "lie",
  led: "lead", leads: "lead", leading: "lead",
  reads: "read", reading: "read",
  grew: "grow", grown: "grow", grows: "grow", growing: "grow",
  lost: "lose", loses: "lose", losing: "lose",
  fell: "fall", fallen: "fall", falls: "fall", falling: "fall",
  sent: "send", sends: "send", sending: "send",
  built: "build", builds: "build", building: "build",
  understood: "understand", understands: "understand", understanding: "understand",
  drew: "draw", drawn: "draw", draws: "draw", drawing: "draw",
  broke: "break", broken: "break", breaks: "break", breaking: "break",
  spent: "spend", spends: "spend", spending: "spend",
  caught: "catch", catches: "catch", catching: "catch",
  taught: "teach", teaches: "teach", teaching: "teach",
  bought: "buy", buys: "buy", buying: "buy",
  sold: "sell", sells: "sell", selling: "sell",
  won: "win", wins: "win", winning: "win",
  ate: "eat", eaten: "eat", eats: "eat", eating: "eat",
  drank: "drink", drunk: "drink", drinks: "drink", drinking: "drink",
  drove: "drive", driven: "drive", drives: "drive", driving: "drive",
  slept: "sleep", sleeps: "sleep", sleeping: "sleep",
  rode: "ride", ridden: "ride", rides: "ride", riding: "ride",
  wore: "wear", worn: "wear", wears: "wear", wearing: "wear",
  sang: "sing", sung: "sing", sings: "sing", singing: "sing",
  swam: "swim", swum: "swim", swims: "swim", swimming: "swim",
  flew: "fly", flown: "fly", flies: "fly", flying: "fly",
  threw: "throw", thrown: "throw", throws: "throw", throwing: "throw",
  chose: "choose", chosen: "choose", chooses: "choose", choosing: "choose",
  froze: "freeze", frozen: "freeze", freezes: "freeze", freezing: "freeze",
  forgot: "forget", forgotten: "forget", forgets: "forget", forgetting: "forget",
  forgave: "forgive", forgiven: "forgive", forgives: "forgive", forgiving: "forgive",
  hid: "hide", hidden: "hide", hides: "hide", hiding: "hide",
  shone: "shine", shines: "shine", shining: "shine",
  shot: "shoot", shoots: "shoot", shooting: "shoot",
  hits: "hit", hitting: "hit",
  cuts: "cut", cutting: "cut",
  puts: "put", putting: "put",
  shuts: "shut", shutting: "shut",
  costs: "cost", costing: "cost",
  hurts: "hurt", hurting: "hurt",
  these: "this", those: "that",
  her: "she", hers: "she", herself: "she",
  him: "he", his: "he", himself: "he",
  its: "it", itself: "it",
  our: "we", ours: "we", us: "we", ourselves: "we",
  their: "they", theirs: "they", them: "they", themselves: "they",
  your: "you", yours: "you", yourself: "you", yourselves: "you",
  my: "i", mine: "i", myself: "i", me: "i",
  better: "good", best: "good", worse: "bad", worst: "bad",
  more: "much", most: "much", less: "little", least: "little",
  further: "far", farther: "far", farthest: "far", furthest: "far",
  elder: "old", eldest: "old", older: "old", oldest: "old",
};

// Words whose -s/-ed/-ing is part of the base form, not an inflection.
const LEMMA_PROTECTED = new Set([
  "this", "us", "gas", "bus", "boss", "kiss", "miss", "class", "glass",
  "grass", "pass", "press", "address", "process", "across", "less", "unless",
  "always", "perhaps", "yes", "news", "series", "species", "thus", "campus",
  "virus", "circus", "downstairs", "upstairs", "stairs", "trousers", "jeans",
  "pants", "clothes", "king", "ring", "string", "thing", "spring", "evening",
  "morning", "ceiling", "during", "wedding", "wood", "good", "food",
]);

// Strip a regular English suffix. Returns null if no rule matches.
const tryRegularLemma = (word: string): string | null => {
  if (word.length > 4 && word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.length > 4 && word.endsWith("ied")) return word.slice(0, -3) + "y";
  if (word.length > 3 && word.endsWith("es")) {
    const stem = word.slice(0, -2);
    if (/[bcdfghjklmnpqrstvwxz][aeiou][bcdfghjklmnpqrstvwxz]$/.test(stem) === false) {
      return word.slice(0, -1);
    }
    return stem;
  }
  if (word.length > 2 && word.endsWith("s") && !word.endsWith("ss")) {
    return word.slice(0, -1);
  }
  if (word.length > 5 && word.endsWith("ing")) {
    const stem = word.slice(0, -3);
    if (
      stem.length >= 2 &&
      stem[stem.length - 1] === stem[stem.length - 2] &&
      /[bcdfghjklmnpqrstvwxz]/.test(stem[stem.length - 1]!)
    ) {
      return stem.slice(0, -1);
    }
    if (/[bcdfghjklmnpqrstvwxz][aeiou]$/.test(stem)) return stem + "e";
    return stem;
  }
  if (word.length > 4 && word.endsWith("ed")) {
    const stem = word.slice(0, -2);
    if (
      stem.length >= 2 &&
      stem[stem.length - 1] === stem[stem.length - 2] &&
      /[bcdfghjklmnpqrstvwxz]/.test(stem[stem.length - 1]!)
    ) {
      return stem.slice(0, -1);
    }
    if (/[bcdfghjklmnpqrstvwxz][aeiou]$/.test(stem)) return stem + "e";
    return stem;
  }
  // -er comparative: cheaper → cheap, nearer → near, bigger → big.
  if (word.length > 4 && word.endsWith("er")) {
    const stem = word.slice(0, -2);
    if (
      stem.length >= 2 &&
      stem[stem.length - 1] === stem[stem.length - 2] &&
      /[bcdfghjklmnpqrstvwxz]/.test(stem[stem.length - 1]!)
    ) {
      return stem.slice(0, -1);
    }
    return stem;
  }
  // -est superlative: nearest → near, cheapest → cheap, biggest → big.
  if (word.length > 5 && word.endsWith("est")) {
    const stem = word.slice(0, -3);
    if (
      stem.length >= 2 &&
      stem[stem.length - 1] === stem[stem.length - 2] &&
      /[bcdfghjklmnpqrstvwxz]/.test(stem[stem.length - 1]!)
    ) {
      return stem.slice(0, -1);
    }
    return stem;
  }
  return null;
};

/** Reduce a word to a likely base form. Returns the word unchanged if no rule applies. */
export const lemmatize = (raw: string): string => {
  const w = raw.toLowerCase().trim();
  if (!w) return w;
  if (IRREGULARS[w]) return IRREGULARS[w]!;
  if (LEMMA_PROTECTED.has(w)) return w;
  return tryRegularLemma(w) ?? w;
};

/** Return all plausible lemmas (handles silent-e + doubled-consonant ambiguity). */
export const lemmaCandidates = (raw: string): string[] => {
  const w = raw.toLowerCase().trim();
  if (!w) return [];
  const set = new Set<string>([w]);
  const irr = IRREGULARS[w];
  if (irr) set.add(irr);
  if (!LEMMA_PROTECTED.has(w)) {
    const reg = tryRegularLemma(w);
    if (reg) {
      set.add(reg);
      if (reg.endsWith("e")) set.add(reg.slice(0, -1));
      else set.add(reg + "e");
    }
    // Un-collapsed doubled-consonant alt: called → call, filling → fill.
    for (const [suffix, len] of [["ed", 2], ["ing", 3], ["er", 2], ["est", 3]] as const) {
      if (w.length > len + 2 && w.endsWith(suffix)) {
        const stem = w.slice(0, -len);
        if (
          stem.length >= 2 &&
          stem[stem.length - 1] === stem[stem.length - 2] &&
          /[bcdfghjklmnpqrstvwxz]/.test(stem[stem.length - 1]!)
        ) {
          set.add(stem);
        }
      }
    }
  }
  return Array.from(set);
};
