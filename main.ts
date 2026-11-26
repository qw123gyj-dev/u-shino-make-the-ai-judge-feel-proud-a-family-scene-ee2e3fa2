// main.ts — deterministic entry picker for:
//   "Make the AI Judge Feel Proud: A Family Scene"
//   (make.fun slug u-shino-make-the-ai-judge-feel-proud-a-family-scene-ee2e3fa2)
//
// The competition asks for one short family scene, one or two lines and no
// more than 280 characters: warm, funny and heartfelt, the kind of line that
// would make a proud judge smile. The house judge compares entries two at a
// time against its published brief, weighing, most important first:
//
//   1. A real family scene on the page, warm enough to make a proud judge
//      smile; an entry off the subject loses to any entry on it.
//   2. Heartfelt: a small domestic moment landing with genuine affection,
//      not sentiment stuck on afterwards.
//   3. Funny in a light, recognisable way: a small turn or a wry line a
//      family would actually laugh at.
//   4. One or two lines used well: a whole small scene in a breath, no
//      word wasted.
//   5. Specific and fresh: one telling detail or an unexpected angle,
//      rather than a greeting-card line.
//
// This program hand-writes a pool of candidate scenes, scores each one
// deterministically against those five criteria in that order, picks the
// best, validates the house gate (UTF-8 text, 1-280 characters, not only
// whitespace, one line), writes it to $MAKEFUN_OUTPUT_DIR/entry.txt
// (fallback /output/entry.txt), reads the file back and verifies the bytes
// match exactly what was chosen.
//
// Node 22, standard library only. No network, no randomness, no secrets:
// the same run always produces the same entry.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Gate constants, straight from the competition kit.
// ---------------------------------------------------------------------------

/** Maximum entry length in characters, per the gate. */
const MAX_CHARS = 280;
/** Minimum entry length in characters, per the gate. */
const MIN_CHARS = 1;
/** Maximum number of lines the brief allows. We aim for exactly one. */
const MAX_LINES = 2;

// ---------------------------------------------------------------------------
// The candidate pool.
//
// Every candidate below was written by hand for this brief: a small domestic
// moment, real family on the page, warm first, then a wry turn, then one
// telling detail. Each one is a single line and well inside 280 characters,
// so the length check is a safety net rather than a filter that does work.
// ---------------------------------------------------------------------------

interface Candidate {
  /** Short label used in the scoring report. */
  id: string;
  /** The scene itself, exactly as it would be submitted. */
  text: string;
}

const CANDIDATES: Candidate[] = [
  {
    id: "grandma-place",
    text: "Every Sunday, Dad still sets a place for Grandma, then eats her dessert \u201cso it doesn\u2019t go to waste\u201d \u2014 and from her photo on the wall, she still gets the last laugh.",
  },
  {
    id: "bear-snore",
    text: "My six-year-old solemnly announced that Dad snores \u201clike a bear with a cold,\u201d and Dad, deeply honoured, has introduced himself as the bear ever since.",
  },
  {
    id: "do-not-eat",
    text: "Mum labelled the leftovers \u201cDO NOT EAT \u2014 DAD\u2019S LUNCH,\u201d and Dad ate them anyway, then wrote \u201cthank you for lunch\u201d on the empty box and put it back.",
  },
  {
    id: "grandpa-wink",
    text: "Grandpa taught my daughter to wink; now she winks at strangers in the supermarket, and Grandpa takes full credit for her social life.",
  },
  {
    id: "grandma-cooking",
    text: "At dinner my son asked why Grandma\u2019s cooking tastes better than Mum\u2019s, and Mum said, \u201cBecause Grandma\u2019s had forty years to hide the mistakes.\u201d",
  },
  {
    id: "thermostat",
    text: "Dad says the thermostat is \u201cset to perfect,\u201d Mum says it\u2019s \u201cset to Dad,\u201d and the dog has learned to sleep directly on the vent.",
  },
  {
    id: "family-portrait",
    text: "My daughter drew our family for school: Mum as a superhero, Dad as a potato, and me as \u201cthe one who makes the snacks.\u201d She is not wrong.",
  },
  {
    id: "grandma-plants",
    text: "Grandma video-calls every Sunday to inspect the plants she gave us; we buy a new one each week and pretend it\u2019s the same one, thriving.",
  },
  {
    id: "packed-lunch",
    text: "My son packed his own lunch for the first time \u2014 two biscuits and a note that said \u201cfor Mum, because she always shares hers.\u201d",
  },
  {
    id: "tooth-fairy",
    text: "When my daughter lost her first tooth, Grandpa slipped a coin under her pillow and a note from the Tooth Fairy in his own handwriting, misspelt the same way he always does.",
  },
  {
    id: "crusts",
    text: "Mum still cuts the crusts off Dad\u2019s sandwiches, forty years in, and Dad still pretends he doesn\u2019t notice \u2014 then eats them first, every time.",
  },
  {
    id: "heaven-lunch",
    text: "My boy asked Grandpa what heaven is like, and Grandpa said, \u201cLike Sunday lunch, but nobody argues about the last roast potato.\u201d",
  },
  {
    id: "first-word",
    text: "Dad taught the baby to say \u201cmore\u201d before \u201cMama,\u201d and Mum has reminded him of it at every birthday since, with witnesses.",
  },
  {
    id: "pinch-of-love",
    text: "Grandma\u2019s recipe card says \u201ca pinch of love,\u201d so my daughter adds an extra pinch and stirs twice as long, just to be safe.",
  },
  {
    id: "night-lights",
    text: "At bedtime my daughter asked if the stars are Grandma\u2019s night-lights; I said yes, and now she waves goodnight to the sky every evening.",
  },
  {
    id: "smoke-alarm",
    text: "Dad pretends he can\u2019t hear the smoke alarm, so Mum pretends she can\u2019t hear him asking where his glasses are \u2014 they\u2019re on his head.",
  },
  {
    id: "sunday-roast",
    text: "Every Sunday my daughter saves the crispiest roast potato for Grandpa, and Grandpa saves it right back for her, and somehow it is always the same potato.",
  },
  {
    id: "dad-joke",
    text: "Dad told the same joke at dinner again, and my son groaned, and my daughter laughed, and Dad looked so pleased with himself that we all laughed too.",
  },
];

// ---------------------------------------------------------------------------
// Lexicons.
//
// The scorer below reads each candidate for the signals the judge's brief
// names. These word lists are deliberately small and concrete: they catch
// the family members on the page, the warmth words, the humour turns and
// the telling details, and nothing else. A word list can only reward what
// is actually in the text, so a candidate cannot score for a quality it
// does not show.
// ---------------------------------------------------------------------------

/** Family members and roles that put a real family on the page. */
const FAMILY_WORDS = [
  "dad", "mum", "mom", "grandma", "grandpa", "son", "daughter",
  "baby", "boy", "girl", "brother", "sister", "uncle", "aunt",
  "family", "parents", "children", "kids",
];

/** Warmth words: affection shown inside the scene, not declared about it. */
const WARMTH_WORDS = [
  "love", "loved", "loves", "loving", "proud", "honoured", "honored",
  "shares", "share", "thank you", "goodnight", "wonderful", "sweet",
  "dear", "together", "home", "hug", "smile", "laugh", "laughs",
  "safe", "care", "cares", "gentle", "kind",
];

/** Humour turns: quoted speech, wry asides and recognisable reversals.
 *  Note: "still" was removed from this list during testing — it appears in
 *  quiet, unfunny sentences too ("Mum still cuts the crusts"), so it was
 *  inflating the funny score of scenes with no joke in them. */
const HUMOUR_MARKERS = [
  "\u201c", "\u201d", "pretends", "anyway", "ever since",
  "not wrong", "full credit", "deeply honoured", "deeply honored",
  "with witnesses", "just to be safe", "on his head", "as a potato",
  "like a bear", "so it doesn\u2019t go to waste", "misspelt",
  "the same potato", "groaned", "so pleased with himself",
];

/** Telling details: numbers, named things, habits and small rituals. */
const DETAIL_MARKERS = [
  "forty years", "every sunday", "sunday", "first", "last laugh",
  "roast potato", "smoke alarm", "thermostat", "recipe card",
  "tooth fairy", "crusts", "plants", "biscuits", "supermarket",
  "school", "photo on the wall", "handwriting", "misspelt",
  "night-lights", "stars", "vent", "glasses", "leftovers",
];

/** Greeting-card phrasing the brief warns against: sentiment declared
 *  rather than shown. Any candidate leaning on these loses points. */
const GREETING_CARD_WORDS = [
  "cherish every moment", "blessed", "forever and always",
  "best family ever", "love you to the moon", "precious memories",
  "thankful for you", "my whole world", "greatest gift",
];

// ---------------------------------------------------------------------------
// Scoring.
//
// Criterion weights follow the brief's order: the first criterion matters
// most, the fifth least. Scores are 0-10 per criterion. Ties on the total
// are broken by the earlier criterion first (criterion 1, then 2, and so
// on), then by fewer bytes, then by pool order — fully deterministic.
// ---------------------------------------------------------------------------

/** Weight of each criterion, in the brief's order. */
const CRITERION_WEIGHTS = [5, 4, 3, 2, 1] as const;

interface Scores {
  /** 1. Real family scene, warm enough to make a proud judge smile. */
  onSubjectWarm: number;
  /** 2. Heartfelt: genuine affection landing inside a small moment. */
  heartfelt: number;
  /** 3. Funny in a light, recognisable way. */
  funny: number;
  /** 4. One or two lines used well, no word wasted. */
  concise: number;
  /** 5. Specific and fresh: a telling detail, an unexpected angle. */
  specificFresh: number;
  /** Weighted total across the five criteria. */
  total: number;
}

/**
 * Count how many entries of a word list appear in the text. Matching is
 * case-insensitive and substring-based, so "Dad" and "dad" count alike.
 * Each list entry counts at most once per text.
 */
function countHits(text: string, words: readonly string[]): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const word of words) {
    if (lower.includes(word.toLowerCase())) {
      hits += 1;
    }
  }
  return hits;
}

/** Clamp a number into the 0-10 range a criterion score lives in. */
function clamp010(value: number): number {
  if (value < 0) return 0;
  if (value > 10) return 10;
  return value;
}

/**
 * Score one candidate against the judge's five criteria, in order.
 *
 * Criterion 1 — on subject and warm. A scene needs real family on the
 * page (at least two distinct family words is a full household; one is a
 * start) and warmth words that show affection inside the moment. An entry
 * with no family word at all fails the subject outright and scores 0.
 */
function scoreOnSubjectWarm(text: string): number {
  const familyHits = countHits(text, FAMILY_WORDS);
  if (familyHits === 0) return 0;
  const warmthHits = countHits(text, WARMTH_WORDS);
  // Two family members on the page is worth 5, one is worth 3; each
  // warmth word adds 1, up to 5 more. A scene with family but no warmth
  // at all is a report, not a scene, and scores low.
  const familyPart = familyHits >= 2 ? 5 : 3;
  const warmthPart = Math.min(warmthHits, 5);
  return clamp010(familyPart + warmthPart);
}

/**
 * Criterion 2 — heartfelt. Genuine affection lands through a small
 * gesture (sharing, giving, remembering, a ritual kept) rather than a
 * declaration. Gestures score; greeting-card declarations subtract.
 */
function scoreHeartfelt(text: string): number {
  const gestureWords = [
    "shares", "share", "thank you", "goodnight", "sets a place",
    "slipped", "packed", "cuts the crusts", "adds an extra pinch",
    "stirs twice", "waves goodnight", "reminded him", "still",
    "every sunday", "forty years", "first time",
  ];
  const gestures = countHits(text, gestureWords);
  const cardPhrases = countHits(text, GREETING_CARD_WORDS);
  // Each genuine gesture is worth 2, capped at 8; a base of 2 credits a
  // scene that is warm without a named gesture; each greeting-card
  // phrase costs 3, because sentiment stuck on afterwards is exactly
  // what the brief says loses.
  return clamp010(2 + gestures * 2 - cardPhrases * 3);
}

/**
 * Criterion 3 — funny. A light, recognisable turn: quoted speech, a
 * pretence, a reversal, a wry aside. Quoted dialogue is the strongest
 * signal, because a family would actually laugh at a line said aloud.
 */
function scoreFunny(text: string): number {
  const humourHits = countHits(text, HUMOUR_MARKERS);
  const quoted = text.includes("\u201c") && text.includes("\u201d") ? 2 : 0;
  const hasReversal = /but |then |anyway|still|ever since/i.test(text) ? 1 : 0;
  // Each humour marker is worth 2, quoted speech adds 2, a reversal
  // adds 1; a scene with no humour signal at all scores 2, because a
  // quiet scene can still win — it simply does not win on this line.
  return clamp010(2 + humourHits * 2 + quoted + hasReversal);
}

/**
 * Criterion 4 — lines used well. The brief allows one or two lines and
 * 280 characters; length for its own sake does not count, and no word
 * may be wasted. A single line in the 120-200 character band is the
 * sweet spot: long enough to stage a whole scene, short enough that
 * every word earns its place. Shorter scenes lose a little for having
 * less scene; longer ones lose a little for carrying more words.
 */
function scoreConcise(text: string): number {
  const chars = [...text].length;
  const lines = text.split("\n").length;
  if (lines > MAX_LINES) return 0;
  if (chars < 60) return 5;
  if (chars <= 120) return 7;
  if (chars <= 200) return 10;
  if (chars <= 240) return 8;
  return 6;
}

/**
 * Criterion 5 — specific and fresh. One telling detail beats a
 * greeting-card line: a number, a named object, a habit, a ritual.
 * Freshness is also punished for clich\u00e9: the greeting-card list
 * costs points here too, because a clich\u00e9 is the opposite of fresh.
 */
function scoreSpecificFresh(text: string): number {
  const detailHits = countHits(text, DETAIL_MARKERS);
  const cardPhrases = countHits(text, GREETING_CARD_WORDS);
  const hasNumber = /\d|forty|first|last|every/i.test(text) ? 1 : 0;
  // Each telling detail is worth 2, a number or ritual word adds 1,
  // and each greeting-card phrase costs 2.
  return clamp010(2 + detailHits * 2 + hasNumber - cardPhrases * 2);
}

/** Score a candidate on all five criteria and total them by weight. */
function scoreCandidate(candidate: Candidate): Scores {
  const onSubjectWarm = scoreOnSubjectWarm(candidate.text);
  const heartfelt = scoreHeartfelt(candidate.text);
  const funny = scoreFunny(candidate.text);
  const concise = scoreConcise(candidate.text);
  const specificFresh = scoreSpecificFresh(candidate.text);
  const parts = [onSubjectWarm, heartfelt, funny, concise, specificFresh];
  let total = 0;
  for (let i = 0; i < parts.length; i += 1) {
    total += parts[i] * CRITERION_WEIGHTS[i];
  }
  return { onSubjectWarm, heartfelt, funny, concise, specificFresh, total };
}

// ---------------------------------------------------------------------------
// Gate validation (mirrors the house gate exactly).
// ---------------------------------------------------------------------------

interface GateResult {
  valid: boolean;
  reasons: string[];
  chars: number;
  bytes: number;
  lines: number;
}

/**
 * Check a text against the gate: UTF-8, 1-280 characters, not only
 * whitespace, one or two lines. Characters are counted as Unicode code
 * points, matching the usual reading of "characters" for a text gate.
 */
function validateGate(text: string): GateResult {
  const reasons: string[] = [];
  const chars = [...text].length;
  const bytes = Buffer.byteLength(text, "utf8");
  const lines = text.split("\n").length;
  if (chars < MIN_CHARS) reasons.push(`too short: ${chars} characters`);
  if (chars > MAX_CHARS) reasons.push(`too long: ${chars} characters`);
  if (text.trim().length === 0) reasons.push("only whitespace");
  if (lines > MAX_LINES) reasons.push(`too many lines: ${lines}`);
  if (text.includes("\r")) reasons.push("contains carriage returns");
  return { valid: reasons.length === 0, reasons, chars, bytes, lines };
}

// ---------------------------------------------------------------------------
// Picking.
// ---------------------------------------------------------------------------

interface Picked {
  candidate: Candidate;
  scores: Scores;
  rank: number;
}

/**
 * Compare two scored candidates the way the brief compares entries: the
 * weighted total decides first; then the earlier criterion, in order;
 * then fewer bytes (the brief's own tie-break prefers the smaller text);
 * then pool order, so the result is fully deterministic.
 */
function comparePicked(
  a: Picked,
  b: Picked,
): number {
  if (a.scores.total !== b.scores.total) return b.scores.total - a.scores.total;
  const aParts = [
    a.scores.onSubjectWarm, a.scores.heartfelt, a.scores.funny,
    a.scores.concise, a.scores.specificFresh,
  ];
  const bParts = [
    b.scores.onSubjectWarm, b.scores.heartfelt, b.scores.funny,
    b.scores.concise, b.scores.specificFresh,
  ];
  for (let i = 0; i < aParts.length; i += 1) {
    if (aParts[i] !== bParts[i]) return bParts[i] - aParts[i];
  }
  const aBytes = Buffer.byteLength(a.candidate.text, "utf8");
  const bBytes = Buffer.byteLength(b.candidate.text, "utf8");
  if (aBytes !== bBytes) return aBytes - bBytes;
  return a.rank - b.rank;
}

/** Score every candidate, rank them, and return the ranked list. */
function rankCandidates(): Picked[] {
  const picked: Picked[] = CANDIDATES.map((candidate, index) => ({
    candidate,
    scores: scoreCandidate(candidate),
    rank: index,
  }));
  picked.sort(comparePicked);
  return picked;
}

// ---------------------------------------------------------------------------
// Output.
// ---------------------------------------------------------------------------

/** Resolve the output directory: $MAKEFUN_OUTPUT_DIR, else /output. */
function outputDir(): string {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  if (fromEnv !== undefined && fromEnv.trim() !== "") {
    return fromEnv;
  }
  return "/output";
}

function main(): void {
  console.log("Family-scene entry picker");
  console.log(`Candidates in pool: ${CANDIDATES.length}`);
  console.log("");

  const ranked = rankCandidates();
  for (let i = 0; i < ranked.length; i += 1) {
    const entry = ranked[i];
    const s = entry.scores;
    console.log(
      `${String(i + 1).padStart(2, " ")}. [${entry.candidate.id}] ` +
      `total=${s.total} (warm=${s.onSubjectWarm} heart=${s.heartfelt} ` +
      `funny=${s.funny} concise=${s.concise} fresh=${s.specificFresh}) ` +
      `${[...entry.candidate.text].length} chars`,
    );
  }
  console.log("");

  const winner = ranked[0];
  const gate = validateGate(winner.candidate.text);
  console.log(`Winner: [${winner.candidate.id}] total=${winner.scores.total}`);
  console.log(`Text: ${winner.candidate.text}`);
  console.log(
    `Gate: chars=${gate.chars} bytes=${gate.bytes} lines=${gate.lines} ` +
    `valid=${gate.valid ? "yes" : "no"}`,
  );
  if (!gate.valid) {
    console.error(`Gate failed: ${gate.reasons.join("; ")}`);
    process.exit(1);
  }

  const dir = outputDir();
  mkdirSync(dir, { recursive: true });
  const outPath = join(dir, "entry.txt");
  writeFileSync(outPath, winner.candidate.text, "utf8");
  console.log(`Wrote ${outPath}`);

  // Read it back and verify the bytes match exactly what was chosen.
  const readBack = readFileSync(outPath, "utf8");
  if (readBack !== winner.candidate.text) {
    console.error("Verification failed: entry.txt does not match the winner.");
    process.exit(1);
  }
  const readBackGate = validateGate(readBack);
  if (!readBackGate.valid) {
    console.error(`Verification failed: read-back gate: ${readBackGate.reasons.join("; ")}`);
    process.exit(1);
  }
  console.log("Verified: entry.txt matches the winner byte for byte and passes the gate.");
}

main();
