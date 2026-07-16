import { useState } from "react";

const GENRES = [
  "Pop", "R&B", "Hip-Hop", "Rock", "Indie", "Electronic",
  "Jazz", "Classical", "Folk", "Country", "Latin", "Afrobeats",
  "Lo-fi", "Cinematic", "Synthwave", "Reggae"
];

const MOODS = [
  "Melancholic", "Euphoric", "Romantic", "Angry", "Nostalgic",
  "Dreamy", "Energetic", "Peaceful", "Dark", "Hopeful"
];

const VOICES = [
  "Female vocal", "Male vocal", "Duet M+F",
  "Choir", "Children's choir", "Harmony vocals", "No vocals"
];

const ERAS = ["20s","30s","40s","50s","60s","70s","80s","90s","2000s","Modern"];

const GENRE_COMPAT = {
  "Pop":        { good: ["R&B","Indie","Folk","Electronic","Synthwave","Lo-fi","Cinematic","Latin","Afrobeats","Reggae","Country","Jazz"], conflict: ["Classical","Hip-Hop"] },
  "R&B":        { good: ["Pop","Jazz","Hip-Hop","Electronic","Lo-fi","Soul"], conflict: ["Rock","Classical","Folk","Country","Synthwave","Cinematic"] },
  "Hip-Hop":    { good: ["R&B","Electronic","Lo-fi","Afrobeats"], conflict: ["Classical","Folk","Country","Cinematic","Jazz","Rock","Synthwave","Reggae","Latin","Indie"] },
  "Rock":       { good: ["Indie","Country","Electronic","Synthwave"], conflict: ["R&B","Classical","Lo-fi","Latin","Afrobeats","Reggae","Jazz","Hip-Hop"] },
  "Indie":      { good: ["Folk","Pop","Lo-fi","Cinematic","Country","Rock","Jazz"], conflict: ["Afrobeats","Latin","Hip-Hop","Electronic","Reggae","Synthwave"] },
  "Electronic": { good: ["Pop","Synthwave","Hip-Hop","R&B","Lo-fi","Rock"], conflict: ["Classical","Folk","Country","Jazz","Cinematic","Afrobeats","Latin","Reggae"] },
  "Jazz":       { good: ["Classical","Lo-fi","Cinematic","Folk","Indie","Pop"], conflict: ["Hip-Hop","Electronic","Synthwave","Afrobeats","Latin","Rock","R&B","Reggae"] },
  "Classical":  { good: ["Jazz","Cinematic","Folk"], conflict: ["Pop","Hip-Hop","Electronic","Afrobeats","Latin","Synthwave","Reggae","R&B","Rock","Country","Lo-fi","Indie"] },
  "Folk":       { good: ["Indie","Country","Pop","Jazz","Lo-fi","Cinematic"], conflict: ["Hip-Hop","Electronic","Afrobeats","Latin","Synthwave","Rock","R&B","Reggae"] },
  "Country":    { good: ["Folk","Indie","Rock","Pop"], conflict: ["Hip-Hop","Electronic","Afrobeats","Latin","Synthwave","R&B","Jazz","Classical","Reggae"] },
  "Latin":      { good: ["Pop","Afrobeats","Reggae"], conflict: ["Rock","Classical","Folk","Country","Lo-fi","Cinematic","Jazz","Indie","Synthwave","Electronic","R&B","Hip-Hop"] },
  "Afrobeats":  { good: ["Pop","Latin","Reggae","Hip-Hop"], conflict: ["Rock","Classical","Folk","Country","Lo-fi","Cinematic","Jazz","Indie","Synthwave","Electronic","R&B"] },
  "Lo-fi":      { good: ["Jazz","Hip-Hop","Folk","Indie","Electronic","Cinematic","Pop","R&B"], conflict: ["Rock","Latin","Afrobeats","Reggae","Synthwave","Classical","Country"] },
  "Cinematic":  { good: ["Classical","Folk","Indie","Lo-fi","Jazz","Pop"], conflict: ["Hip-Hop","Afrobeats","Latin","Reggae","Electronic","Rock","R&B","Synthwave","Country"] },
  "Synthwave":  { good: ["Electronic","Pop","Rock","Indie"], conflict: ["Classical","Folk","Country","Jazz","Afrobeats","Latin","Reggae","Lo-fi","R&B","Hip-Hop","Cinematic"] },
  "Reggae":     { good: ["Afrobeats","Latin","Pop"], conflict: ["Rock","Classical","Folk","Country","Electronic","Synthwave","Cinematic","Jazz","R&B","Hip-Hop","Indie","Lo-fi"] },
};

const getGenreStatus = (g, selectedGenres) => {
  if (selectedGenres.length === 0) return "neutral";
  if (selectedGenres.includes(g)) return "selected";
  const hasConflict = selectedGenres.some(s => GENRE_COMPAT[s]?.conflict?.includes(g));
  if (hasConflict) return "conflict";
  const allGood = selectedGenres.every(s => GENRE_COMPAT[s]?.good?.includes(g));
  if (allGood) return "good";
  return "neutral";
};

const VOICE_RANGES = {
  "Male vocal":   [{ label: "Bass", range: "E2–E4" }, { label: "Baritone", range: "G2–G4" }, { label: "Tenor", range: "C3–B4" }, { label: "Not sure", range: "" }],
  "Female vocal": [{ label: "Alto", range: "G3–E5" }, { label: "Mezzo", range: "A3–F5" }, { label: "Soprano", range: "C4–A5" }, { label: "Not sure", range: "" }],
  "Duet M+F":     [{ label: "Bar + Mezzo", range: "G2–G4 | A3–F5" }, { label: "Ten + Sop", range: "C3–B4 | C4–A5" }, { label: "Not sure", range: "" }],
};

const DAILY_LIMIT = 5;

const getUsage = () => {
  try {
    const today = new Date().toDateString();
    const stored = localStorage.getItem("suno_usage");
    if (!stored) return { date: today, count: 0 };
    const parsed = JSON.parse(stored);
    if (parsed.date !== today) return { date: today, count: 0 };
    return parsed;
  } catch { return { date: new Date().toDateString(), count: 0 }; }
};

const incrementUsage = () => {
  try {
    const usage = getUsage();
    usage.count += 1;
    localStorage.setItem("suno_usage", JSON.stringify(usage));
    return usage.count;
  } catch { return 1; }
};

const lyricsPrompt = `You are a professional hitmaker lyricist with deep knowledge of song craft. Your lyrics must be publication-ready, emotionally powerful, and rhythmically precise.

ABSOLUTE RULE: Do NOT mention any musical instruments in the lyrics text unless the user explicitly provided them in "Key instruments" field.
ABSOLUTE RULE: Section tags ALWAYS in English only — NEVER in Russian or any other language. Suno will SING Russian tags as lyrics.
ABSOLUTE RULE: Output PURE LYRICS ONLY — just section tags ([Verse 1], [Chorus] etc) and the lines of text. Do NOT add a Vocal Settings block, do NOT add [Mood], [Energy], [BPM], [Key] or any other technical metatags. Those are added later in a separate step, after the person has edited and approved this text. Adding them here is WRONG.

OUTPUT FORMAT (strict JSON, no markdown):
{
  "title": "Song title",
  "lyrics": "Full lyrics — see rules below"
}

═══ RHYME DICTIONARIES ═══
RUSSIAN — FORBIDDEN: любовь–кровь | ночь–дочь | друг–вдруг | огонь–горизонт | волна–волна
RUSSIAN QUALITY RHYMES:
- огонь: миллион, сезон, закон, патрон, телефон, туман, обман, план, титан
- звезда: всегда, вода, сюда, тогда, навсегда, страна, война, тишина, цена
- мечта: красота, суета, темнота, пустота, чистота, высота
- сон: закон, телефон, поклон, район, сезон, вагон, балкон
- тень: день, лень, сирень, олень, ступень
- свет: ответ, портрет, привет, билет, поэт, расцвет, предмет
- мир: эфир, командир, кумир, сувенир, ампир
- жизнь: держись, борись, явись, откройся
- вера: сфера, атмосфера, карьера, вечера
- свобода: природа, погода, народа, похода, года
- волна: весна, луна, стена, она, страна, тишина
- земля: семья, моя, друзья, края, судья
- сердце: солнце, конец, отец, наконец, певец, венец
- дом: кругом, хором, объёмом, знакомо
- глаз: сейчас, враз, приказ, показ, рассказ
ENGLISH — FORBIDDEN: love–above | heart–start | home–alone
ENGLISH QUALITY RHYMES:
- night: light, right, bright, fight, flight, height, sight, midnight, twilight
- fire: higher, wire, admire, desire, inspire, require, entire
- dream: seem, team, scream, stream, gleam, beam, esteem, redeem
- time: rhyme, climb, prime, chime, sublime, lifetime
- sky: high, fly, try, cry, deny, reply, goodbye
- pain: rain, gain, chain, brain, train, insane, explain, remain
- song: long, wrong, strong, belong, prolong, lifelong
- star: are, far, scar, guitar, avatar, superstar
- moon: soon, tune, balloon, monsoon, afternoon

═══ HIT FORMULA ═══
- Song length: 3:24 optimal
- Intro: max 10 seconds
- Chorus: must appear before 0:50 mark
- Hook: 3-note earworm — simple + singable + familiar-but-new
- Max 3-4 unique melodies

WRITING TECHNIQUES:
1. Open vowels А О Э on strong beats (not Ы Й Щ)
2. Alliteration in chorus — repeated consonants create momentum
3. Internal rhymes within lines for density
4. Dynamic phrase pattern: long–short–long OR short–long–short
5. Bounce words with stress on beat 1: кайф, рай, бой, старт, бам

IMAGE RULES (apply to every verse):
- Each line must carry ONE clear image — not two half-ideas joined by "но/и/а"
- BAD: "Я кричу, но ты не помнишь" — two weak ideas glued together
- GOOD: "Я кричу — волна уносит" — one action, one consequence, one image
- Images must be CONCRETE: не "грусть", а "мёртвый омут" / не "боль", а "соль на губах"
- Every verse must have ONE anchor image that carries the whole section
- Avoid abstract nouns as subject: не "любовь ушла", а "ты закрыла дверь"

RHYTHM RULES (check every line):
- Stress must fall on ODD syllables (1st, 3rd, 5th) — never on weak endings
- BAD stress: "Я кричу́, но ты не по́мнишь" — "помнишь" ends on weak syllable
- GOOD stress: "Я кричу́ — волна́ уно́сит" — every stress lands cleanly
- Lines in same section must match syllable count ±1
- Never end a line on a gerund (-я, -ясь) or weak particle (же, бы, ли)

FORBIDDEN images (too clichéd):
- звёзды светят / сердце бьётся / слёзы льются / ночь темна
- душа поёт / мечта зовёт / любовь как сон
- Replace with SPECIFIC physical detail: запах, звук, движение, температура

TIMBRAL VOICE PRESETS:
- Deep male: worn velvet baritone / smoky tenement tenor / gravelled storyteller voice
- Young male: raw street tenor / close-mic bedroom voice / cracked-edge earnest vocal
- Gentle female: crystalline mezzo / breath-first folk soprano / intimate whisper alto
- Powerful female: arena-stage alto belt / emotional floodgate mezzo / gospel-tinged contralto
- Duet: worn velvet baritone x crystalline mezzo / smoky tenor x breath-first alto
- Choir: SATB cathedral swell / layered gospel choir / cinematic mass choir

PRE-OUTPUT CHECKLIST:
- [ ] All rhymes from dictionaries — none invented freely
- [ ] Zero verb-verb rhyme chains — max 1 per verse
- [ ] Rhyme density ≥ 0.42
- [ ] Hook repeated ≥ 3 times
- [ ] Word stress on strong beats — no weak endings stressed
- [ ] Syllables: RU 9–11, EN 8–10 — lines in same section match ±1
- [ ] First Chorus line ≤ 8 syllables
- [ ] Russian grammar correct
- [ ] Verse 2 carries NEW meaning
- [ ] Bridge contrasts in rhythm or perspective
- [ ] Section tags ALL in English
- [ ] No Vocal Settings block, no [Mood]/[Energy]/[BPM]/[Key] tags — pure lyrics only
- [ ] Every line has ONE clear image — no two half-ideas joined by "но/и/а"
- [ ] Zero clichéd abstractions (звёзды светят / сердце бьётся / душа поёт)
- [ ] Each verse has ONE anchor concrete image (physical detail)
- [ ] No line ends on weak syllable (-ишь, -ешь, -же, -бы, -ли)

GENRE-SPECIFIC RULES:
ROCK: Lines 6-8 syllables MAX. Strong accent beat 1. AABB. Short punchy phrases.
FOLK: Lines 8-10 syllables. Narrative storytelling. ABAB.
HIP-HOP: Dense 12-16 syllables. Internal rhymes. Multi-syllabic.
R&B: Smooth 8-10 syllables. Repetition with "~". Intimate sensory.
POP: Exactly 8-10 syllables. AABB. Maximum catchiness.
JAZZ: Free 7-12 syllables. Unexpected rhymes. Impressionistic.
LATIN: Short 6-8 syllables. Strong downbeat. Dance energy.
ELECTRONIC/SYNTHWAVE/LO-FI: Minimalist 5-8 syllables. Hypnotic repetition.
CINEMATIC/CLASSICAL: Long 10-13 syllables. Rich imagery.
COUNTRY: Conversational 8-10 syllables. AABB. Storytelling.
INDIE: 8-10 syllables. ABAB or free. Introspective quirky.

VOCAL TECHNIQUES (max 2-3 per song):
- (whispered: текст) — intimate moments
- [Screamed] TEXT — aggressive Rock
- WORD+ — vowel stretch for peaks
- [Ad-lib] ах-ах x2 — rhythmic decoration
- [Backing vocals: female] — harmony layer

MAX MARTIN FORMULA:
- 60-76 BPM → 6-7 syllables
- 80-100 BPM → 7-9 syllables
- 105-120 BPM → 8-10 syllables
- 126-150 BPM → 9-12 syllables

STRUCTURE (3:00–3:30):
[Intro] 1-2 lines
[Verse 1] 4 lines
[Pre-Chorus] 2 lines
[Chorus] 4 lines — HOOK
[Verse 2] 4 lines — NEW angle
[Pre-Chorus] 2 lines
[Chorus] 4 lines
[Bridge] 3 lines — contrast
[Final Chorus] 4 lines
[Outro] 1-2 lines

ERA shapes vocabulary:
- 20s-40s: swing/cabaret, short punchy, simple rhymes
- 50s-60s: clean romance, simple emotions
- 70s: storytelling, longer lines, "мы двое", дорога/надежда/рассвет/звёзды
- 80s: theatrical, character-mask, night city, neon
- 90s: raw conversational, grunge/r&b energy
- Modern: hook-first, streaming-optimized

SOVIET/RETRO MODE (Russian + era 60s-80s):
- Concrete detail → universal feeling
- 60s: 58-76 BPM, hero in situation (dance floor, train, park)
- 70s: 72-88 BPM, philosophical, road/hope/dawn/stars
- 80s: 84-110 BPM, theatrical, маэстро/художник, night city
- FORBIDDEN: стресс, депрессия, хайп, лайк, контент, токсичность
- Use: грусть/тоска, работа/труд, душа/сердце
- NEVER end hopeless — at least one line of hope
- Anchor: НАДЕЖДА РОДИНА МОЛОДОСТЬ СУДЬБА ДОРОГА ВЕРНОСТЬ ПАМЯТЬ ОГОНЬ
- For Soviet songs use Russian section tags: [Куплет 1], [Припев] etc

INSTRUMENTAL: replace lyrics with [haunting melody rises] [tension builds] etc

Deliver ONLY valid JSON, nothing else`;

const stylePrompt = `You are a professional Suno AI music producer. You receive APPROVED, already-edited lyrics (plain text — section tags only, no settings yet). Your job has two parts: (1) annotate the lyrics with Vocal Settings and structural metatags, (2) generate a Suno style string.

OUTPUT FORMAT (strict JSON, no markdown):
{
  "lyrics": "the SAME lyrics, annotated — see PART 1 below",
  "style": "the style string — see PART 2 below"
}

═══ PART 1 — ANNOTATE THE LYRICS ═══
ABSOLUTE RULE: Do NOT change, rewrite, shorten, or fix any lyric line. Keep every line of text and every section tag EXACTLY as given, in the same order. You are only INSERTING new tag lines — never touching the wording.
ABSOLUTE RULE: If the input already contains a Vocal Settings block and/or [Mood]/[Energy]/[BPM]/[Key] tags (from a previous pass), strip the old ones out first and insert fresh ones — never leave duplicates.

STEP A — Vocal Settings block, inserted as the very first line, before any section tag:
Format: [Type] [Range + Range Description] [Vocal Style: per-section delivery]

RANGE DESCRIPTION — always add after the note range, describing how voice behaves:
- Bass E1–E3: [resonant chest depth, loses body above D3, powerful low-mid]
- Baritone A1–A3: [rich velvet tone in chest, slightly thinning above G3, warm dark centre]
- Tenor C2–C4: [bright chest below A3, ringing passaggio C3–E3, soaring head above]
- Contralto E2–E4: [deep smoky chest, full-bodied through F3, silky upper register]
- Mezzo A2–A4: [rich chest voice in lower octave, soft and thin above E4, warm mid-range power]
- Soprano C3–C5: [light crystalline tone, full bloom above A4, effortless top register]
- Lyric Soprano D3–D5: [gentle airy chest, luminous middle, floating pianissimo top]

VOCAL STYLE — FORBIDDEN formats (these will be rejected):
FORBIDDEN: [Vocal Style: crystalline, dreamy]
FORBIDDEN: [Vocal Style: warm, emotional]
FORBIDDEN: [Vocal Style: soft, melancholic]
FORBIDDEN: [Vocal Style: powerful, belting]
→ Any Vocal Style with only adjectives and NO section names is WRONG.

REQUIRED format — must name delivery technique FOR EACH SECTION:
CORRECT: [Vocal Style: breathy intimate verse, vocal cry pre-chorus, crescendo belting chorus, falsetto bridge, fading subtone outro]
CORRECT: [Vocal Style: parlando storytelling verse, chest push pre-chorus, full belt chorus, raw spoken bridge, hummed outro]

Per-section delivery — choose one per section based on the actual lyrics and mood/genre given:
- Verse: breathy intimate, close-mic whisper, parlando storytelling, intimate chest
- Pre-Chorus: vocal cry, rising intensity, speech-to-song, chest push
- Chorus: crescendo belting, full chest power, arena projection, soaring head voice
- Bridge: falsetto, subtone ghost, spoken word, raw exposed vocal
- Outro: fading subtone, dying fall, whispered echo, hummed close

ABSOLUTE RULE: Vocal Style MUST contain section names (verse/pre-chorus/chorus/bridge/outro) paired with technique.
MINIMUM 3 sections described.
For duets tag each section: [Verse — Male], [Chorus — Duet], [Bridge — Male + Female]
Range ALWAYS with notes: G2–G4, C4–A5 — never "low" or "high"

Examples:
[Female Vocal] [Mezzo-Soprano A3–A5] [rich chest voice in lower octave, soft and thin above E5, warm mid-range power] [Vocal Style: breathy intimate verse, vocal cry pre-chorus, crescendo belting chorus, falsetto bridge, fading subtone outro]
[Male Vocal] [Baritone G2–G4] [rich velvet tone in chest, slightly thinning above G3] [Vocal Style: parlando storytelling verse, chest push pre-chorus, full belt chorus, raw spoken bridge, hummed outro]

STEP B — after EACH section tag, on its own line, insert structural metatags:
- [Mood: Melancholic/Euphoric/Dark etc] — pick based on genre/mood and the section's role in the story
- [Energy: Low/Medium/High]
- [BPM: 110] — Intro only
- [Key: C Minor] or [Key: G Major] — Intro only
Example section with metatags:
[Verse 1]
[Mood: Sinister] [Energy: Low]
<the original lyric lines, unchanged>

═══ PART 2 — STYLE STRING FORMAT ═══
<genre> <BPM> BPM <vocal descriptor> <2-3 sound descriptors> <2-3 hook words from chorus> <finish tags>
TARGET LENGTH: 180-220 characters

BPM GRID — use ONLY: 60 64 68 72 76 80 84 88 92 96 100 105 110 115 120 126 132 138 144 150 156 162 168 174 180

GENRE BPM DEFAULTS:
- Ballad/Classical/Lo-fi: 60-80 · Folk/Country/Jazz: 80-100 · Pop/R&B/Indie: 96-115
- Rock/Synthwave: 110-132 · Electronic/Latin/Afrobeats: 120-138 · Hip-Hop: 138-150

FINISH TAGS:
- EMOTIONAL: | deep emotional warmth | close-mic intimacy | analog texture | no generic AI polish | human breath imperfection
- ENERGETIC: | raw energy no overproduce | organic punch | wide stereo depth | no safe AI sound | unexpected texture
- ATMOSPHERIC: | cinematic space | subtle tape noise | unhurried tempo feel | no clean digital polish | air and silence matter
- RETRO (eras 20s-90s): | analog tape saturation | vinyl crackle | [era]s mix | warm tube mastering
- INSTRUMENTAL: | no-vocals | instrumental | [chosen finish]

NEGATIVE TAGS:
- Ballad/acoustic/retro → no-808
- Folk/Classical/Cinematic → no-drums
- Clean Pop/Indie/Lo-fi → no-808 no-clap
- EDM/Hip-Hop/Electronic/Afrobeats → do NOT add no-808

TIMBRAL VOICE PRESETS:
- Deep male: worn velvet baritone / smoky tenement tenor / gravelled storyteller voice
- Young male: raw street tenor / close-mic bedroom voice / cracked-edge earnest vocal
- Gentle female: crystalline mezzo / breath-first folk soprano / intimate whisper alto
- Powerful female: arena-stage alto belt / emotional floodgate mezzo / gospel-tinged contralto
- Duet: worn velvet baritone x crystalline mezzo / smoky tenor x breath-first alto
- Choir: SATB cathedral swell / layered gospel choir / cinematic mass choir

VOCAL STYLE DESCRIPTORS:
- Rhythmic/Hip-hop: syllabic vocals, rhythmic delivery, on-grid phrasing, percussive vocals
- Intimate/Folk: breathy intimate, close-mic warmth, whisper-to-belt dynamic
- Powerful/Rock: belting, emotional floodgate, full chest voice, arena-stage delivery
- Jazz/Soul: melismatic, soulful runs, blue note bends, gospel-tinged
- Electronic/Pop: syllabic locked to beat, punchy consonants, precise timing

GENRE MIX TABLE:
- sad pop → cinematic indie-folk x lo-fi x dream-pop
- rock ballad → post-grunge x cinematic strings x alt-rock
- pop ballad → neo-soul x 70s orchestral pop x bedroom pop
- dance pop → disco-funk x synth-pop x future bass
- chill → organic house x lo-fi jazz x ambient pop
- russian pop → 70s soft rock x modern indie-folk x chamber pop warmth

ERA ANCHORS:
- 70s: Late 1970s LA session musician warmth
- 80s: 1983 New York downtown club night
- 90s: 1990s Seattle basement recording
- 2000s: Early 2000s indie bedroom tape

NEVER include language names like "Russian" or "English".
Deliver ONLY valid JSON, nothing else`;

const fixPrompt = `You are a lyric editor. Fix the lyrics based on the request. Return ONLY the corrected full lyrics with all section tags preserved. No JSON, no explanation.`;

const smartFullPrompt = `You are a music producer AND lyricist. Based on the song idea, choose parameters AND write full lyrics in one response.
Return ONLY valid JSON, no markdown:
{"genres":["genre1"],"mood":"mood","voices":["voice"],"era":"","title":"Song title","lyrics":"Full lyrics with vocal settings block on line 1, then section tags. Max 4 lines per section. Section tags in English only."}
Genres from: Pop, R&B, Hip-Hop, Rock, Indie, Electronic, Jazz, Classical, Folk, Country, Latin, Afrobeats, Lo-fi, Cinematic, Synthwave, Reggae. Max 2.
Mood from: Melancholic, Euphoric, Romantic, Angry, Nostalgic, Dreamy, Energetic, Peaceful, Dark, Hopeful.
Voices from: Female vocal, Male vocal, Duet M+F, Choir, Children's choir, Harmony vocals, No vocals. Max 1.
Era: 20s/30s/40s/50s/60s/70s/80s/90s/2000s/Modern or empty string.
First line of lyrics must be vocal settings. Section tags always in English. Lyrics language must match the language instruction provided.`;

const vocalPrompt = `You are a Suno vocal settings editor. Generate ONLY one line in this format:
[Voice Type] [Range Notes] [Vocal Style: description]
Examples:
[Male Vocal] [Baritone G2-G4] [Vocal Style: warm, emotional]
[Female Vocal] [Mezzo-Soprano A3-F5] [Vocal Style: soft, melancholic]
[Duet] [Male Baritone G2-G4 | Female Mezzo A3-F5] [Vocal Style: romantic, close-mic]
[Choir] [SATB] [Vocal Style: full choral, epic]
Return ONLY the single line, nothing else.`;

export default function SunoAssistant() {
  const [theme, setTheme] = useState("");
  const [lang, setLang] = useState("RU");
  const [genres, setGenres] = useState([]);
  const [mood, setMood] = useState("");
  const [voices, setVoices] = useState([]);
  const [lyrics, setLyrics] = useState("");
  const [title, setTitle] = useState("");
  const [lyricsReady, setLyricsReady] = useState(false);
  const [generatingLyrics, setGeneratingLyrics] = useState(false);
  const [fixRequest, setFixRequest] = useState("");
  const [fixing, setFixing] = useState(false);
  const [error1, setError1] = useState("");
  const [instruments, setInstruments] = useState("");
  const [styleString, setStyleString] = useState("");
  const [styleReady, setStyleReady] = useState(false);
  const [generatingStyle, setGeneratingStyle] = useState(false);
  const [error2, setError2] = useState("");
  const [updatingVocal, setUpdatingVocal] = useState(false);
  const [updatingBoth, setUpdatingBoth] = useState(false);
  const [copied, setCopied] = useState("");
  const [usageCount, setUsageCount] = useState(() => getUsage().count);
  const remaining = DAILY_LIMIT - usageCount;

  const T = {
    RU: {
      tagline: "Твоя песня,",
      tagline2: "за 30 секунд.",
      subtitle: "Настрой параметры — и получи текст и стиль для Suno.",
      step1title: "Параметры и текст песни",
      step2title: "Настройки в текст + строка стиля",
      themeLabel: "Тема / Идея",
      themePlaceholder: "Дождливый вечер в городе, который не забыть...",
      langLabel: "Язык текста",
      genreLabel: "Genre",
      genreMax: "(макс. 3)",
      genreHint: "Не знаешь? Оставь пустым — AI выберет сам",
      genreGood: "● подходит",
      genreConflict: "⚠ конфликт",
      genreMaxMsg: "✦ Выбрано максимум 3 жанра",
      moodLabel: "Mood",
      moodOptional: "(необязательно)",
      voiceLabel: "Voice",
      voiceMax: "(макс. 2)",
      voiceHint: "Не знаешь? Оставь пустым — AI выберет сам",
      voiceMaxMsg: "✦ Выбрано максимум 2 голоса",
      instrLabel: "Instruments",
      instrOptional: "(необязательно)",
      instrPlaceholder: "accordion, duduk, banjo, sitar, kora...",
      instrHint: "1-2 инструмента — оптимально",
      lyricsLabel: "Текст",
      lyricsEditHint: "— правь здесь или используй Исправить",
      lyricsPlaceholder: "Текст появится здесь — или вставь свой и переходи к шагу 2",
      fixPlaceholder: 'Опиши правку: "укороти строки" или "рифма на -ая"',
      fixBtn: "ИСПРАВИТЬ →",
      genLyricsBtn: "СГЕНЕРИРОВАТЬ ТЕКСТ →",
      regenLyricsBtn: "СГЕНЕРИРОВАТЬ СНОВА",
      genLyricsLoading: "ГЕНЕРИРУЮ ТЕКСТ...",
      genStyleBtn: "СГЕНЕРИРОВАТЬ СТИЛЬ →",
      genStyleLoading: "ГЕНЕРИРУЮ СТИЛЬ...",
      leftToday: "ГЕНЕРАЦИЙ ОСТАЛОСЬ СЕГОДНЯ",
      resetsTomorrow: "ОБНОВИТСЯ ЗАВТРА",
      readyLabel: "✦ ГОТОВО — ВСТАВЬ В SUNO",
      lyricsResultLabel: "Текст песни",
      copyLyrics: "СКОПИРОВАТЬ ТЕКСТ",
      copyStyle: "СКОПИРОВАТЬ СТИЛЬ",
      updateHint: "ИЗМЕНИЛ НАСТРОЙКИ? ОБНОВИ:",
      updateVocal: "ОБНОВИТЬ ВОКАЛ",
      updateStyle: "ОБНОВИТЬ СТИЛЬ",
      newSong: "↺ НОВАЯ ПЕСНЯ",
      feedbackTitle: "ОБРАТНАЯ СВЯЗЬ",
      feedbackText: "Нашёл ошибку? Есть идея? Хочешь больше генераций?",
      feedbackText2: "Напиши — отвечу лично.",
      errTheme: "Введите тему или идею.",
      errLimit: "Лимит на сегодня исчерпан. Возвращайся завтра.",
      errGen: "Ошибка генерации. Попробуй ещё раз.",
    },
    EN: {
      tagline: "Your song,",
      tagline2: "in 30 seconds.",
      subtitle: "Set your parameters — then generate lyrics and style string.",
      step1title: "Parameters & lyrics",
      step2title: "Insert settings + generate style string",
      themeLabel: "Theme / Idea",
      themePlaceholder: "A rainy evening in a city you can't forget...",
      langLabel: "Lyrics language",
      genreLabel: "Genre",
      genreMax: "(max 3)",
      genreHint: "Not sure? Leave empty — AI picks automatically",
      genreGood: "● good match",
      genreConflict: "⚠ may conflict",
      genreMaxMsg: "✦ Maximum 3 genres selected",
      moodLabel: "Mood",
      moodOptional: "(optional)",
      voiceLabel: "Voice",
      voiceMax: "(max 2)",
      voiceHint: "Not sure? Leave empty — AI picks automatically",
      voiceMaxMsg: "✦ Maximum 2 voices selected",
      instrLabel: "Instruments",
      instrOptional: "(optional)",
      instrPlaceholder: "accordion, duduk, banjo, sitar, kora...",
      instrHint: "1-2 instruments work best",
      lyricsLabel: "Lyrics",
      lyricsEditHint: "— edit directly or use Fix below",
      lyricsPlaceholder: "Lyrics will appear here — or paste your own and go to Step 2",
      fixPlaceholder: 'Describe the fix: "shorten lines" or "add rhyme"',
      fixBtn: "FIX →",
      genLyricsBtn: "GENERATE LYRICS →",
      regenLyricsBtn: "REGENERATE LYRICS",
      genLyricsLoading: "GENERATING LYRICS...",
      genStyleBtn: "GENERATE STYLE STRING →",
      genStyleLoading: "GENERATING STYLE...",
      leftToday: "GENERATIONS LEFT TODAY",
      resetsTomorrow: "RESETS TOMORROW",
      readyLabel: "✦ READY TO PASTE INTO SUNO",
      lyricsResultLabel: "Lyrics",
      copyLyrics: "COPY LYRICS",
      copyStyle: "COPY STYLE",
      updateHint: "CHANGED SOMETHING? UPDATE:",
      updateVocal: "UPDATE VOCAL",
      updateStyle: "UPDATE STYLE",
      newSong: "↺ START NEW SONG",
      feedbackTitle: "FEEDBACK",
      feedbackText: "Found a bug? Have an idea? Want more generations?",
      feedbackText2: "Write — I'll reply personally.",
      errTheme: "Enter a theme or idea.",
      errLimit: "Daily limit reached. Come back tomorrow.",
      errGen: "Generation failed. Try again.",
    }
  };
  const t = T[lang];

  const toggleGenre = (g) => {
    if (genres.includes(g)) { setGenres(prev => prev.filter(x => x !== g)); return; }
    if (genres.length >= 3) return;
    setGenres(prev => [...prev, g]);
  };

  const toggleVoice = (v) => {
    if (voices.includes(v)) { setVoices(prev => prev.filter(x => x !== v)); return; }
    if (voices.length >= 2) return;
    setVoices(prev => [...prev, v]);
  };

  const generateLyrics = async () => {
    if (!theme.trim()) { setError1(t.errTheme); return; }
    setError1(""); setGeneratingLyrics(true); setLyricsReady(false); setStyleReady(false); setStyleString("");
    const params = [
      `Theme: ${theme}`,
      `Lyrics language: ${lang === "RU" ? "Russian" : "English"} — write ALL lyrics strictly in this language only`,
      genres.length > 0 ? `Genre: ${genres.join(", ")}` : "Genre: choose the most fitting genre yourself based on theme and mood",
      mood ? `Mood: ${mood}` : "",
      voices.length > 0 ? `Voice: ${voices.join(", ")}` : "",
      instruments ? `Key instruments: ${instruments}` : "",
    ].filter(Boolean).join("\n");
    try {
      const response = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1500, system: lyricsPrompt, messages: [{ role: "user", content: params }] }) });
      const data = await response.json();
      if (data.error) throw new Error("API: " + data.error.message);
      const text = data.content?.map(i => i.text || "").join("") || "";
      if (!text) throw new Error("Empty response");
      const s = text.indexOf("{"); const e2 = text.lastIndexOf("}");
      if (s === -1) throw new Error("No JSON found");
      const parsed = JSON.parse(text.slice(s, e2 + 1));
      if (!parsed.lyrics) throw new Error("No lyrics in response");
      setTitle(parsed.title || ""); setLyrics(parsed.lyrics); setLyricsReady(true);
    } catch (e) { setError1(t.errTheme + " " + e.message); }
    setGeneratingLyrics(false);
  };

  const fixLyrics = async () => {
    if (!fixRequest.trim()) return;
    setFixing(true);
    try {
      const response = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1200, system: fixPrompt, messages: [{ role: "user", content: `Lyrics:\n${lyrics}\n\nFix: ${fixRequest}` }] }) });
      const data = await response.json();
      const fixed = data.content?.map(i => i.text || "").join("").trim();
      if (fixed) { setLyrics(fixed); setFixRequest(""); }
    } catch (e) { }
    setFixing(false);
  };

  const generateStyle = async () => {
    if (remaining <= 0) { setError2(t.errLimit); return; }
    setError2(""); setGeneratingStyle(true); setStyleReady(false);
    try {
      const params = [
        `Lyrics:\n${lyrics}`, `Genre mix: ${genres.join(", ")}`,
        mood ? `Mood: ${mood}` : "",
        voices.length > 0 ? `Voice: ${voices.join(", ")}` : "",
        voices.includes("No vocals") ? "INSTRUMENTAL — add no-vocals tag" : "",
        instruments ? `Instruments: ${instruments}` : "",
        `Language: ${lang === "RU" ? "Russian" : "English"} (do NOT include this in style string)`,
      ].filter(Boolean).join("\n");
      const response = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1500, system: stylePrompt, messages: [{ role: "user", content: params }] }) });
      const data = await response.json();
      const text = data.content?.map(i => i.text || "").join("") || "";
      const s = text.indexOf("{"); const e2 = text.lastIndexOf("}");
      if (s === -1) throw new Error("No JSON found");
      const parsed = JSON.parse(text.slice(s, e2 + 1));
      if (!parsed.lyrics || !parsed.style) throw new Error("Incomplete response");
      setLyrics(parsed.lyrics); setStyleString(parsed.style); setStyleReady(true); setUsageCount(incrementUsage());
    } catch (e) { setError2(t.errGen); }
    setGeneratingStyle(false);
  };

  const updateVocal = async () => {
    if (voices.length === 0) return;
    setUpdatingVocal(true);
    try {
      const response = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 100, system: vocalPrompt, messages: [{ role: "user", content: `Voice: ${voices.join(", ")}` }] }) });
      const data = await response.json();
      const newVocalLine = data.content?.map(i => i.text || "").join("").trim();
      if (newVocalLine) { const lines = lyrics.split("\n"); lines[0] = newVocalLine; setLyrics(lines.join("\n")); }
    } catch (e) { }
    setUpdatingVocal(false);
  };

  const updateBoth = async () => { setUpdatingBoth(true); await Promise.all([updateVocal(), generateStyle()]); setUpdatingBoth(false); };

  const copyText = (text, key) => {
    try {
      if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text); }
      else { const el = document.createElement("textarea"); el.value = text; el.style.position = "fixed"; el.style.opacity = "0"; document.body.appendChild(el); el.focus(); el.select(); document.execCommand("copy"); document.body.removeChild(el); }
    } catch (e) { }
    setCopied(key); setTimeout(() => setCopied(""), 2000);
  };

  const CopyBtn = ({ text, label, id }) => (
    <button onClick={() => copyText(text, id)} style={{ background: copied === id ? "#00e5a0" : "transparent", border: `1px solid ${copied === id ? "#00e5a0" : "#333"}`, color: copied === id ? "#000" : "#888", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", cursor: "pointer", transition: "all 0.2s", fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em" }}>
      {copied === id ? "✓ COPIED" : label}
    </button>
  );

  const settingsSummary = [genres.join(" · "), mood, voices.join(" · ")].filter(Boolean).join("  ·  ");

  const resetAll = () => {
    setTheme(""); setLang("RU"); setGenres([]); setMood("");
    setVoices([]); setLyrics(""); setTitle("");
    setLyricsReady(false); setStyleString(""); setStyleReady(false);
    setFixRequest(""); setError1(""); setError2(""); setInstruments("");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#e8e8e0", fontFamily: "'DM Sans', sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea:focus, input:focus { outline: none; }
        .ifield { background: #0f0f0f; border: 1px solid #1e1e1e; border-radius: 10px; color: #e8e8e0; font-family: 'DM Sans', sans-serif; font-size: 14px; transition: border-color 0.2s; width: 100%; }
        .ifield:focus { border-color: #00e5a0; }
        .pill { background: #0f0f0f; border: 1px solid #1e1e1e; border-radius: 8px; color: #888; padding: 8px 4px; font-size: 11px; cursor: pointer; transition: all 0.15s; font-family: 'DM Sans', sans-serif; text-align: center; user-select: none; line-height: 1.3; word-break: break-word; }
        .pill:hover { border-color: #333; color: #ccc; }
        .pill.active { border-color: #00e5a0; color: #00e5a0; background: #001a12; }
        .g4 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
        .g5 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
        .g3 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
        .g4-voice { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
        @media (min-width: 440px) {
          .g4 { grid-template-columns: repeat(4, 1fr); gap: 7px; }
          .g5 { grid-template-columns: repeat(5, 1fr); gap: 7px; }
          .g3 { grid-template-columns: repeat(3, 1fr); gap: 7px; }
          .g4-voice { grid-template-columns: repeat(4, 1fr); gap: 7px; }
          .pill { font-size: 12px; padding: 8px 6px; }
        }
        .btn-green { width: 100%; padding: 16px; background: #00e5a0; border: none; border-radius: 12px; color: #000; font-size: 14px; font-weight: 500; font-family: 'DM Mono', monospace; letter-spacing: 0.08em; cursor: pointer; transition: all 0.2s; }
        .btn-green:hover { background: #00ffb3; transform: translateY(-1px); }
        .btn-green:disabled { background: #1a1a1a; color: #444; cursor: not-allowed; transform: none; }
        .btn-outline { padding: 10px 12px; background: transparent; border: 1px solid #00e5a0; border-radius: 8px; color: #00e5a0; font-size: 12px; font-family: 'DM Mono', monospace; cursor: pointer; transition: all 0.2s; white-space: nowrap; flex-shrink: 0; }
        .btn-outline:hover { background: #001a12; }
        .btn-outline:disabled { border-color: #333; color: #444; cursor: not-allowed; }
        .card { background: #0c0c0c; border: 1px solid #1a1a1a; border-radius: 16px; padding: 16px; }
        @media (min-width: 440px) { .card { padding: 20px; } }
        .fl { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.15em; color: #444; text-transform: uppercase; margin-bottom: 8px; display: block; }
        .step-row { display: flex; align-items: center; gap: 8px; margin-bottom: 18px; flex-wrap: nowrap; }
        .snum { width: 26px; height: 26px; border-radius: 50%; background: #00e5a0; color: #000; font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 500; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .snum.done { background: #001a12; color: #00e5a0; border: 1px solid #00e5a0; }
        .snum.dim { background: #1a1a1a; color: #444; }
        .stitle { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.08em; color: #666; text-transform: uppercase; flex: 1; min-width: 0; }
        @media (min-width: 440px) { .stitle { font-size: 11px; letter-spacing: 0.1em; } }
        .hint { font-size: 11px; font-family: 'DM Mono', monospace; margin-top: 5px; color: #2e2e2e; }
        .sel-row { font-size: 11px; color: #00e5a0; font-family: 'DM Mono', monospace; margin-bottom: 8px; word-break: break-word; }
        .pulse { display: inline-block; width: 7px; height: 7px; background: #00e5a0; border-radius: 50%; animation: p 1s infinite; }
        @keyframes p { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
        .noise-bg { position: fixed; top:0; left:0; right:0; bottom:0; opacity: 0.025; pointer-events: none; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); background-size: 200px; z-index: 0; }
        .counter-row { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
        .update-grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
        @media (min-width: 360px) { .update-grid { grid-template-columns: repeat(3, 1fr); } }
      `}</style>

      <div className="noise-bg" />
      <div style={{ position: "relative", zIndex: 1, maxWidth: "500px", margin: "0 auto", padding: "28px 14px 60px" }}>

        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.2em", color: "#00e5a0", marginBottom: "10px", textTransform: "uppercase" }}>
            AI Music Lab ✦ Suno Assistant
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 7vw, 42px)", fontWeight: "700", fontStyle: "italic", lineHeight: "1.1", color: "#f0f0e8", marginBottom: "8px" }}>
            {t.tagline}<br />{t.tagline2}
          </h1>
          <p style={{ color: "#444", fontSize: "13px", lineHeight: "1.6" }}>
            {t.subtitle}
          </p>
        </div>

        <div className="card" style={{ marginBottom: "16px" }}>
          <div className="step-row">
            <div className={`snum ${lyricsReady ? "done" : ""}`}>{lyricsReady ? "✓" : "1"}</div>
            <div className="stitle">{t.step1title}</div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label className="fl">{t.themeLabel}</label>
            <textarea className="ifield" rows={3}
              placeholder={t.themePlaceholder}
              value={theme} onChange={e => setTheme(e.target.value)}
              style={{ padding: "12px 14px", resize: "none", lineHeight: "1.6" }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label className="fl">{t.langLabel}</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[["RU", "Русский"], ["EN", "English"]].map(([code, label]) => (
                <div key={code} className={`pill ${lang === code ? "active" : ""}`}
                  onClick={() => setLang(code)} style={{ padding: "12px", fontSize: "13px" }}>
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <label className="fl" style={{ marginBottom: 0 }}>{t.genreLabel} <span style={{ color: "#222", textTransform: "none", letterSpacing: 0 }}>{t.genreMax}</span></label>
              <div className="counter-row">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: i < genres.length ? "#00e5a0" : "#1e1e1e", transition: "all 0.3s" }} />
                ))}
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: genres.length === 3 ? "#00e5a0" : "#444" }}>
                  {genres.length}/3
                </span>
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "#2a2a2a", fontFamily: "'DM Mono', monospace", marginBottom: "8px" }}>
              {t.genreHint}
            </div>
            {genres.length > 0 && <div className="sel-row">✦ {genres.join(" · ")}</div>}
            <div className="g4">
              {GENRES.map(g => {
                const isSelected = genres.includes(g);
                const isMaxed = genres.length >= 3 && !isSelected;
                const status = getGenreStatus(g, genres);
                let style = {};
                if (isMaxed) style = { opacity: 0.25, cursor: "not-allowed", borderColor: "#1a1a1a", color: "#444" };
                else if (!isSelected) {
                  if (status === "good") style = { borderColor: "#00e5a040", color: "#00e5a0", background: "#001a0a" };
                  else if (status === "conflict") style = { borderColor: "#1a1a1a", color: "#333", background: "#0a0a0a", opacity: 0.6 };
                }
                return (
                  <div key={g} className={`pill ${isSelected ? "active" : ""}`} style={style}
                    onClick={() => !isMaxed && toggleGenre(g)}>
                    {status === "conflict" && !isSelected && !isMaxed ? <span style={{ marginRight: "2px", fontSize: "9px" }}>⚠</span> : null}
                    {g}
                  </div>
                );
              })}
            </div>
            {genres.length > 0 && genres.length < 3 && (
              <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", marginTop: "8px", color: "#2a2a2a" }}>
                <span style={{ color: "#00e5a030", marginRight: "10px" }}>{t.genreGood}</span>
                <span>{t.genreConflict}</span>
              </div>
            )}
            {genres.length === 3 && <div style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", marginTop: "8px", color: "#00e5a0" }}>{t.genreMaxMsg}</div>}
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label className="fl">{t.moodLabel} <span style={{ color: "#222", textTransform: "none", letterSpacing: 0 }}>{t.moodOptional}</span></label>
            <div className="g5">
              {MOODS.map(m => (
                <div key={m} className={`pill ${mood === m ? "active" : ""}`}
                  onClick={() => setMood(prev => prev === m ? "" : m)}>{m}</div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <label className="fl" style={{ marginBottom: 0 }}>{t.voiceLabel} <span style={{ color: "#222", textTransform: "none", letterSpacing: 0 }}>{t.voiceMax}</span></label>
              <div className="counter-row">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: i < voices.length ? "#00e5a0" : "#1e1e1e", transition: "all 0.3s" }} />
                ))}
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: voices.length === 2 ? "#00e5a0" : "#444" }}>
                  {voices.length}/2
                </span>
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "#2a2a2a", fontFamily: "'DM Mono', monospace", marginBottom: "8px" }}>
              {t.voiceHint}
            </div>
            {voices.length > 0 && <div className="sel-row">✦ {voices.join(" · ")}</div>}
            <div className="g3">
              {VOICES.map(v => {
                const isSelected = voices.includes(v);
                const isMaxed = voices.length >= 2 && !isSelected;
                return (
                  <div key={v} className={`pill ${isSelected ? "active" : ""}`}
                    style={isMaxed ? { opacity: 0.25, cursor: "not-allowed", borderColor: "#1a1a1a", color: "#444" } : {}}
                    onClick={() => !isMaxed && toggleVoice(v)}>{v}</div>
                );
              })}
            </div>
            {voices.length === 2 && <div style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", marginTop: "8px", color: "#00e5a0" }}>{t.voiceMaxMsg}</div>}
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label className="fl">{t.instrLabel} <span style={{ color: "#222", textTransform: "none", letterSpacing: 0 }}>{t.instrOptional}</span></label>
            <input className="ifield" type="text"
              placeholder={t.instrPlaceholder}
              value={instruments} onChange={e => setInstruments(e.target.value)}
              style={{ padding: "10px 14px", fontSize: "13px" }}
            />
            <div className="hint">{t.instrHint}</div>
          </div>

          <div style={{ borderTop: "1px solid #1a1a1a", marginBottom: "18px" }} />

          <div style={{ marginBottom: "12px" }}>
            <label className="fl">
              {t.lyricsLabel} {lyricsReady && <span style={{ color: "#00e5a0", textTransform: "none", letterSpacing: 0 }}>{t.lyricsEditHint}</span>}
            </label>
            <textarea className="ifield"
              rows={lyricsReady ? 14 : 4}
              placeholder={t.lyricsPlaceholder}
              value={lyrics} onChange={e => { setLyrics(e.target.value); if (e.target.value.trim()) setLyricsReady(true); }}
              style={{ padding: "12px 14px", fontFamily: lyricsReady ? "'DM Mono', monospace" : "'DM Sans', sans-serif", fontSize: "13px", lineHeight: "1.8", resize: "vertical" }}
            />
          </div>

          {(lyricsReady || lyrics.trim()) && (
            <div style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <textarea className="ifield" rows={2}
                  placeholder={t.fixPlaceholder}
                  value={fixRequest} onChange={e => setFixRequest(e.target.value)}
                  style={{ padding: "10px 12px", fontSize: "13px", resize: "none", lineHeight: "1.5", flex: 1 }}
                />
                <button className="btn-outline" onClick={fixLyrics} disabled={fixing || !fixRequest.trim()}>
                  {fixing ? <span className="pulse" /> : t.fixBtn}
                </button>
              </div>
            </div>
          )}

          {error1 && <div style={{ color: "#ff6b6b", fontSize: "12px", fontFamily: "'DM Mono', monospace", marginBottom: "12px" }}>✕ {error1}</div>}

          <button className="btn-green" onClick={generateLyrics} disabled={generatingLyrics}>
            {generatingLyrics
              ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}><span className="pulse" /> {t.genLyricsLoading}</span>
              : lyricsReady ? t.regenLyricsBtn : t.genLyricsBtn}
          </button>
        </div>

        <div className="card" style={{ opacity: lyrics.trim() ? 1 : 0.35, transition: "opacity 0.3s" }}>
          <div className="step-row">
            <div className={`snum ${styleReady ? "done" : lyrics.trim() ? "" : "dim"}`}>{styleReady ? "✓" : "2"}</div>
            <div className="stitle">{t.step2title}</div>
          </div>

          {settingsSummary && (
            <div style={{ fontSize: "11px", color: "#333", fontFamily: "'DM Mono', monospace", marginBottom: "14px", lineHeight: "1.6", wordBreak: "break-word" }}>
              {settingsSummary}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#080808", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px" }}>
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
                <span style={{ fontSize: "28px", fontWeight: "500", color: remaining > 1 ? "#e8e8e0" : remaining === 1 ? "#ffaa00" : "#ff6b6b" }}>{remaining}</span>
                <span style={{ fontSize: "14px", color: "#444" }}> / {DAILY_LIMIT}</span>
              </div>
              <div style={{ fontSize: "9px", fontFamily: "'DM Mono', monospace", color: "#444", marginTop: "3px", letterSpacing: "0.1em" }}>
                {remaining > 0 ? t.leftToday : t.resetsTomorrow}
              </div>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              {Array.from({ length: DAILY_LIMIT }).map((_, i) => (
                <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: i < usageCount ? "#1e1e1e" : "#00e5a0", transition: "all 0.4s" }} />
              ))}
            </div>
          </div>

          {error2 && <div style={{ color: "#ff6b6b", fontSize: "12px", fontFamily: "'DM Mono', monospace", marginBottom: "12px" }}>✕ {error2}</div>}

          <button className="btn-green" onClick={generateStyle} disabled={generatingStyle || !lyrics.trim() || remaining <= 0}>
            {generatingStyle
              ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}><span className="pulse" /> {t.genStyleLoading}</span>
              : t.genStyleBtn}
          </button>
        </div>

        {styleReady && (
          <div style={{ marginTop: "20px", background: "#0c0c0c", border: "1px solid #00e5a0", borderRadius: "16px", padding: "20px" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.2em", color: "#00e5a0", marginBottom: "14px" }}>
              {t.readyLabel}
            </div>

            {title && (
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", fontStyle: "italic", color: "#f0f0e8", marginBottom: "18px", lineHeight: "1.2" }}>
                {title}
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <label className="fl">{t.lyricsResultLabel}</label>
              <div style={{ background: "#080808", border: "1px solid #1e1e1e", borderRadius: "10px", padding: "14px", fontFamily: "'DM Mono', monospace", fontSize: "12px", lineHeight: "1.8", color: "#c8c8c0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {lyrics}
              </div>
              <div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end" }}>
                <CopyBtn text={lyrics} label={t.copyLyrics} id="lyr" />
              </div>
            </div>

            <div style={{ borderTop: "1px solid #1a1a1a", marginBottom: "16px" }} />

            <div style={{ marginBottom: "16px" }}>
              <label className="fl">Suno Style String</label>
              <div style={{ background: "#080808", border: "1px solid #1e1e1e", borderRadius: "10px", padding: "14px", fontFamily: "'DM Mono', monospace", fontSize: "12px", lineHeight: "1.6", color: "#c8c8c0", wordBreak: "break-word" }}>
                {styleString}
              </div>
              <div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end" }}>
                <CopyBtn text={styleString} label={t.copyStyle} id="sty" />
              </div>
            </div>

            <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: "16px" }}>
              <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: "#444", letterSpacing: "0.12em", marginBottom: "10px" }}>
                {t.updateHint}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <button onClick={updateVocal} disabled={updatingVocal || voices.length === 0}
                  style={{ padding: "12px 8px", background: "transparent", border: "1px solid #1e1e1e", borderRadius: "8px", color: voices.length === 0 ? "#333" : "#666", fontSize: "11px", fontFamily: "'DM Mono', monospace", cursor: voices.length === 0 ? "not-allowed" : "pointer", transition: "all 0.2s", opacity: voices.length === 0 ? 0.4 : 1 }}>
                  {updatingVocal ? <span className="pulse" /> : t.updateVocal}
                </button>
                <button onClick={generateStyle} disabled={generatingStyle || !lyrics.trim() || remaining <= 0}
                  style={{ padding: "12px 8px", background: "transparent", border: "1px solid #1e1e1e", borderRadius: "8px", color: "#666", fontSize: "11px", fontFamily: "'DM Mono', monospace", cursor: "pointer", transition: "all 0.2s" }}>
                  {generatingStyle ? <span className="pulse" /> : t.updateStyle}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: "32px", textAlign: "center" }}>
          <button onClick={resetAll} style={{
            background: styleReady ? "#001a12" : "transparent",
            border: `1px solid ${styleReady ? "#00e5a0" : "#2a2a2a"}`,
            borderRadius: "12px",
            color: styleReady ? "#00e5a0" : "#333",
            fontSize: "13px",
            fontFamily: "'DM Mono', monospace",
            padding: "14px 32px",
            cursor: "pointer",
            letterSpacing: "0.1em",
            transition: "all 0.2s",
            width: "100%",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#00e5a0"; e.currentTarget.style.color = "#00e5a0"; e.currentTarget.style.background = "#001a12"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = styleReady ? "#00e5a0" : "#2a2a2a"; e.currentTarget.style.color = styleReady ? "#00e5a0" : "#333"; e.currentTarget.style.background = styleReady ? "#001a12" : "transparent"; }}
          >
            {t.newSong}
          </button>
        </div>

        <div style={{ marginTop: "32px", borderTop: "1px solid #141414", paddingTop: "24px", textAlign: "center" }}>
          <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: "#2a2a2a", letterSpacing: "0.15em", marginBottom: "10px" }}>
            {t.feedbackTitle}
          </div>
          <p style={{ fontSize: "12px", color: "#333", lineHeight: "1.7", marginBottom: "14px" }}>
            {t.feedbackText}<br />{t.feedbackText2}
          </p>
          <a href="mailto:ashu3sdv@gmail.com" style={{
            display: "inline-block",
            fontFamily: "'DM Mono', monospace",
            fontSize: "11px",
            color: "#00e5a0",
            border: "1px solid #00e5a030",
            borderRadius: "8px",
            padding: "10px 20px",
            textDecoration: "none",
            letterSpacing: "0.08em",
            transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#00e5a0"; e.currentTarget.style.background = "#001a12"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#00e5a030"; e.currentTarget.style.background = "transparent"; }}
          >
            ✉ ashu3sdv@gmail.com
          </a>
        </div>

        <div style={{ marginTop: "24px", textAlign: "center", fontSize: "10px", fontFamily: "'DM Mono', monospace", color: "#1e1e1e", letterSpacing: "0.1em" }}>
          AI MUSIC LAB ✦ SUNO ASSISTANT ✦ V0.5
        </div>
      </div>
    </div>
  );
}
