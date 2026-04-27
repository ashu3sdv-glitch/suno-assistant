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

// Genre compatibility map — fully symmetric
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
  // Conflict if ANY selected genre conflicts with this one
  const hasConflict = selectedGenres.some(s => GENRE_COMPAT[s]?.conflict?.includes(g));
  if (hasConflict) return "conflict";
  // Good only if ALL selected genres consider it good (intersection)
  const allGood = selectedGenres.every(s => GENRE_COMPAT[s]?.good?.includes(g));
  if (allGood) return "good";
  return "neutral";
};

const VOICE_RANGES = {
  "Male vocal":   [{ label: "Bass",     range: "E2–E4" }, { label: "Baritone", range: "G2–G4" }, { label: "Tenor",    range: "C3–B4" }, { label: "Not sure", range: "" }],
  "Female vocal": [{ label: "Alto",     range: "G3–E5" }, { label: "Mezzo",    range: "A3–F5" }, { label: "Soprano",  range: "C4–A5" }, { label: "Not sure", range: "" }],
  "Duet M+F":     [{ label: "Baritone + Mezzo", range: "G2–G4 | A3–F5" }, { label: "Tenor + Soprano", range: "C3–B4 | C4–A5" }, { label: "Not sure", range: "" }],
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

OUTPUT FORMAT (strict JSON, no markdown):
{
  "title": "Song title",
  "lyrics": "Full lyrics — see rules below"
}

═══ CRAFT RULES (non-negotiable) ═══

RHYME QUALITY:
- Minimum rhyme density: every 2nd line must rhyme (AABB or ABAB)
- FORBIDDEN Russian clichés: любовь–кровь, ночь–дочь, друг–вдруг, огонь–горизонт
- FORBIDDEN English clichés: love–above, heart–start, home–alone
- No more than 1 verb-verb rhyme per verse (иду–найду–пройду = forbidden)
- Last 2-3 sounds must match exactly — not approximate rhymes

HOOK (крючок):
- One KEY PHRASE — 3-6 words, emotionally charged
- Repeat it minimum 3 times across different sections
- First Chorus line ≤ 8 syllables — short, punchy, memorable
- Hook must be hinted in Intro before fully appearing in Chorus

SYLLABLE COUNT (count carefully before outputting):
- Russian Pop/R&B/Indie: 9–11 syllables per line
- Russian Ballad/Folk: 7–9 syllables per line
- English Pop: 8–10 syllables per line
- Strong beat falls on syllable 1 of each line

VERSE vs CHORUS contrast:
- Verse: conversational, narrow intervals, storytelling, specific imagery
- Chorus: soaring, open vowels (А, О, Э), universal emotion, wide intervals
- Bridge: contrast in rhythm or perspective, 3 lines only

═══ GENRE-SPECIFIC RULES ═══

ROCK: Lines 6-8 syllables MAX. Strong accent on beat 1. Simple powerful rhymes AABB. Short punchy phrases. Raw direct emotion. No flowery language.

FOLK: Lines 8-10 syllables. Narrative storytelling. ABAB rhyme scheme. Nature imagery allowed. Conversational but poetic. Ballad-like flow.

HIP-HOP: Dense lines 12-16 syllables. Internal rhymes within lines. Multi-syllabic rhymes. Rhythmic wordplay. Street-level imagery.

R&B: Smooth melodic lines 8-10 syllables. Repetition and runs indicated with "~". Intimate emotional language. Sensory details.

POP: Exactly 8-10 syllables. AABB rhyme. Maximum catchiness. Simple universal words. Hook dominates.

JAZZ: Free rhythm, 7-12 syllables variable. Unexpected rhymes. Impressionistic imagery. Sophisticated vocabulary.

LATIN: Short rhythmic lines 6-8 syllables. Strong downbeat accent. Passionate direct emotion. Dance energy in phrasing.

ELECTRONIC/SYNTHWAVE/LO-FI: Minimalist lines 5-8 syllables. Hypnotic repetition. Abstract or dreamlike imagery. Few unique lines, maximum repetition.

CINEMATIC/CLASSICAL: Long flowing lines 10-13 syllables. Rich imagery. Complex vocabulary. Operatic sweep.

COUNTRY: Conversational 8-10 syllables. AABB rhyme. Storytelling with specific details. Place names, emotions, nostalgia.

INDIE: 8-10 syllables. ABAB or free rhyme. Introspective, specific personal imagery. Quirky unexpected metaphors.

═══ VOCAL TECHNIQUES (use selectively for emotional impact) ═══

In-line vocal markers — add these INSIDE the lyrics text where appropriate:
- (whispered: текст) — for intimate or secret moments
- [Screamed] ТЕКСТ — for aggressive Rock/anger moments  
- [Shouted] ТЕКСТ — for powerful call-out moments
- СЛОВО+ — vowel stretch for emotional peaks: РАААА+, О-О-О+
- [Ad-lib] ах-ах-ах x2 — rhythmic decoration after hook
- [Backing vocals: female] — add harmony layer instruction
- [Add 3-part harmonies] — for choir-like sections

Use maximum 2-3 of these per song. Don't overload — one well-placed whisper is more powerful than ten effects.

═══ STRUCTURAL METATAGS (add after section tag, before lyrics) ═══

After each section tag add ONE relevant metatag:
- [Mood: Melancholic] or [Mood: Euphoric] or [Mood: Dark] etc — matches user's mood selection
- [Energy: Low] / [Energy: Medium] / [Energy: High] — Verse=Low/Medium, Chorus=High, Bridge=Medium
- [BPM: 110] — add to [Intro] section tag only, matching the BPM that will be in style string
- [Key: C Minor] or [Key: G Major] — choose based on mood (minor=sad/dark, major=happy/uplifting)
- [Vocal Style: Whisper] / [Belting] / [Falsetto] — add to Bridge or climax sections only

Example: [Chorus] [Energy: High] [Mood: Euphoric]

═══ MAX MARTIN FORMULA ═══

Syllable count by BPM:
- 60-76 BPM → 6-7 syllables per line
- 80-100 BPM → 7-9 syllables per line  
- 105-120 BPM → 8-10 syllables per line
- 126-150 BPM → 9-12 syllables per line

Apply this: estimate the likely BPM from genre, then count syllables accordingly.
- Chorus first line ≤ 8 syllables always (skip-rate optimization)
- Verse lines = speech-like, narrow pitch range → short sentences, specific words
- Chorus lines = singable, open vowels А О Э at stress points
- Bridge = rhythmic shift — change line length vs verses
- Alliteration in chorus: «Ты мой кайф, ты мой старт» (к-к, с-с)
- Dynamic phrase pattern: long–short–long OR short–long–short per verse

═══ STRUCTURE (exactly 3:00–3:30) ═══

[Intro] 1-2 lines — hint at the hook
[Verse 1] 4 lines — establish story/situation
[Pre-Chorus] 2 lines — build tension toward hook
[Chorus] 4 lines — HOOK dominates, universal emotion
[Verse 2] 4 lines — NEW angle, never repeat Verse 1 meaning
[Pre-Chorus] 2 lines
[Chorus] 4 lines
[Bridge] 3 lines — contrast, shift perspective
[Final Chorus] 4 lines — same as chorus or +1 intensifying word
[Outro] 1-2 lines — echo the hook softly

FIRST LINE of lyrics: always vocal settings block:
[Male Vocal] [Baritone G2–G4] [Vocal Style: warm, emotional]
[Female Vocal] [Mezzo-Soprano A3–F5] [Vocal Style: soft, melancholic]
[Duet] [Male Baritone G2–G4 | Female Mezzo A3–F5] [Vocal Style: romantic, close-mic]
Match voice and range from input. Section tags ALWAYS in English.

For duets tag each section: [Verse 1 — Male], [Chorus — Duet], etc.

ERA shapes vocabulary and imagery:
- 20s-40s: swing/cabaret feel, short punchy lines, simple rhymes
- 50s-60s: clean romance, simple direct emotions, rock-n-roll = short rhythmic lines
- 70s: storytelling, longer lines, STRONG 5-7 word slogan chorus, "мы двое" perspective, images: дорога/надежда/рассвет/звёзды
- 80s: dramatic theatrical imagery, character-mask (маэстро/художник), night city, neon
- 90s: raw conversational tone, grunge/r&b energy
- Modern: hook-first, streaming-optimized, conversational

SOVIET/RETRO MODE (Russian language + era 60s-80s):
- Use Soviet lyrical tradition: concrete detail → universal feeling
- Forbidden words: стресс, депрессия, хайп, лайк, контент, токсичность, деньги, бизнес
- Replace with: грусть/тоска, работа/труд/призвание, душа/сердце
- NEVER end with hopelessness — at least one line of hope or light
- Anchor words (2-3 per song): НАДЕЖДА РОДИНА МОЛОДОСТЬ СУДЬБА ДОРОГА ВЕРНОСТЬ ПАМЯТЬ ОГОНЬ
- Phonetics: stressed syllable MUST fall on strong beat. Long note = only А О Э У vowels.
- 70s structure: Verse = story, Chorus = 5-7 word eternal formula

INSTRUMENTAL (No vocals):
- Still write the section structure with tags
- Replace lyrics with mood/atmosphere descriptions in brackets: [haunting melody rises] [tension builds]
- No actual sung words needed

KEY INSTRUMENTS (only if provided): let cultural world subtly influence imagery only.

LYRICS LANGUAGE: follow strictly — never switch languages mid-song.

Deliver ONLY valid JSON, nothing else`;

const stylePrompt = `You are a professional Suno AI music producer. Generate a precise Suno style string.

OUTPUT FORMAT (strict JSON, no markdown):
{
  "style": "the style string here"
}

STYLE STRING FORMAT:
<genre> <BPM> BPM <vocal descriptor> <2-3 sound descriptors> <2-3 hook words from chorus> <finish tags>

TARGET LENGTH: 180-220 characters

BPM GRID — use ONLY: 60 64 68 72 76 80 84 88 92 96 100 105 110 115 120 126 132 138 144 150 156 162 168 174 180

GENRE BPM DEFAULTS:
- Ballad/Classical/Lo-fi: 60-80 · Folk/Country/Jazz: 80-100 · Pop/R&B/Indie: 96-115
- Rock/Synthwave: 110-132 · Electronic/Latin/Afrobeats: 120-138 · Hip-Hop: 138-150

FINISH TAGS — choose ONE based on mood/genre:
- EMOTIONAL (ballads, lyrical, retro, R&B, Folk, Cinematic):
  | deep emotional warmth | close-mic intimacy | analog texture | no generic AI polish | human breath imperfection
- ENERGETIC (Pop, Rock, Electronic, Hip-Hop, Latin, Afrobeats, Synthwave):
  | raw energy no overproduce | organic punch | wide stereo depth | no safe AI sound | unexpected texture
- ATMOSPHERIC (Lo-fi, Ambient, Cinematic instrumental, Jazz, Classical):
  | cinematic space | subtle tape noise | unhurried tempo feel | no clean digital polish | air and silence matter
- RETRO (eras 20s-90s — use instead of above):
  | analog tape saturation | vinyl crackle | [era]s mix | warm tube mastering
- INSTRUMENTAL (No vocals selected):
  | no-vocals | instrumental | [chosen finish from above]

NEGATIVE TAGS — add automatically:
- Ballad/acoustic/retro → no-808
- Folk/Classical/Cinematic → no-drums  
- Clean Pop/Indie/Lo-fi → no-808 no-clap
- EDM/Hip-Hop/Electronic/Afrobeats → do NOT add no-808

HOOK WORDS: extract 2-3 emotionally strong words from the chorus and include them in the style string. These help Suno match the musical energy to the lyrical hook.

VOCAL DESCRIPTORS: use the provided voice range — "male baritone", "female mezzo-soprano", "duet", "choir SATB", etc.

NEVER include language names like "Russian" or "English".
Deliver ONLY valid JSON, nothing else`;

const fixPrompt = `You are a lyric editor. Fix the lyrics based on the request.
Return ONLY the corrected full lyrics with all section tags preserved. No JSON, no explanation.`;

const smartFullPrompt = "You are a music producer AND lyricist. Based on the song idea, choose parameters AND write full lyrics in one response.\n\nReturn ONLY valid JSON, no markdown:\n{\"genres\":[\"genre1\"],\"mood\":\"mood\",\"voices\":[\"voice\"],\"era\":\"\",\"title\":\"Song title\",\"lyrics\":\"Full lyrics with vocal settings block on line 1, then [Intro][Verse 1][Pre-Chorus][Chorus][Verse 2][Pre-Chorus][Chorus][Bridge][Final Chorus][Outro] tags. Max 4 lines per section. Section tags in English only.\"}\n\nGenres from: Pop, R&B, Hip-Hop, Rock, Indie, Electronic, Jazz, Classical, Folk, Country, Latin, Afrobeats, Lo-fi, Cinematic, Synthwave, Reggae. Max 2.\nMood from: Melancholic, Euphoric, Romantic, Angry, Nostalgic, Dreamy, Energetic, Peaceful, Dark, Hopeful.\nVoices from: Female vocal, Male vocal, Duet M+F, Choir, Children's choir, Harmony vocals, No vocals. Max 1.\nEra: 20s/30s/40s/50s/60s/70s/80s/90s/2000s/Modern or empty string.\nFirst line of lyrics must be vocal settings: [Female Vocal] [Mezzo-Soprano A3-F5] [Vocal Style: warm, emotional]\nSection tags always in English. Lyrics language must match the language instruction provided.";

const vocalPrompt = "You are a Suno vocal settings editor. Generate ONLY one line in this format:\n[Voice Type] [Range Notes] [Vocal Style: description]\nExamples:\n[Male Vocal] [Baritone G2-G4] [Vocal Style: warm, emotional]\n[Female Vocal] [Mezzo-Soprano A3-F5] [Vocal Style: soft, melancholic]\n[Duet] [Male Baritone G2-G4 | Female Mezzo A3-F5] [Vocal Style: romantic, close-mic]\n[Choir] [SATB] [Vocal Style: full choral, epic]\nReturn ONLY the single line, nothing else.";

export default function SunoAssistant() {
  // Settings
  const [theme, setTheme] = useState("");
  const [lang, setLang] = useState("RU");
  const [era, setEra] = useState("");
  const [genres, setGenres] = useState([]);
  const [mood, setMood] = useState("");
  const [voices, setVoices] = useState([]);
  const [voiceRange, setVoiceRange] = useState("");

  // Step 1 — lyrics
  const [lyrics, setLyrics] = useState("");
  const [title, setTitle] = useState("");
  const [lyricsReady, setLyricsReady] = useState(false);
  const [generatingLyrics, setGeneratingLyrics] = useState(false);
  const [fixRequest, setFixRequest] = useState("");
  const [fixing, setFixing] = useState(false);
  const [error1, setError1] = useState("");

  // Step 2 — style
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

  const toggleGenre = (g) => {
    if (genres.includes(g)) {
      setGenres(prev => prev.filter(x => x !== g));
    } else {
      if (genres.length >= 3) return;
      setGenres(prev => [...prev, g]);
    }
  };
  const toggleVoice = (v) => {
    if (voices.includes(v)) {
      setVoices(prev => prev.filter(x => x !== v));
      setVoiceRange("");
    } else {
      if (voices.length >= 2) return;
      setVoices(prev => [...prev, v]);
      setVoiceRange("");
    }
  };

  const generateLyrics = async () => {
    if (!theme.trim()) { setError1("Enter a theme or idea."); return; }
    setError1("");
    setGeneratingLyrics(true);
    setLyricsReady(false);
    setStyleReady(false);
    setStyleString("");

    const params = [
      `Theme: ${theme}`,
      `Lyrics language: ${lang === "RU" ? "Russian" : "English"} — write ALL lyrics strictly in this language only`,
      era ? `Era: ${era}` : "",
      genres.length > 0 ? `Genre: ${genres.join(", ")}` : "Genre: choose the most fitting genre yourself based on theme and mood",
      mood ? `Mood: ${mood}` : "",
      voices.length > 0 ? `Voice: ${voices.join(", ")}${voiceRange ? " | Range: " + voiceRange : ""}` : "",
      instruments ? `Key instruments: ${instruments}` : "",
    ].filter(Boolean).join("\n");

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system: lyricsPrompt,
          messages: [{ role: "user", content: params }]
        })
      });
      const data = await response.json();
      if (data.error) throw new Error("API: " + data.error.message);
      if (!data.content) throw new Error("No content: " + JSON.stringify(data).slice(0, 80));
      const text = data.content?.map(i => i.text || "").join("") || "";
      if (!text) throw new Error("Empty response");
      const s = text.indexOf("{");
      const e2 = text.lastIndexOf("}");
      if (s === -1) throw new Error("No JSON found");
      const parsed = JSON.parse(text.slice(s, e2 + 1));
      if (!parsed.lyrics) throw new Error("No lyrics in response");
      setTitle(parsed.title || "");
      setLyrics(parsed.lyrics);
      setLyricsReady(true);
    } catch (e) { setError1("Failed: " + e.message); }
    setGeneratingLyrics(false);
  };

  const fixLyrics = async () => {
    if (!fixRequest.trim()) return;
    setFixing(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1200,
          system: fixPrompt,
          messages: [{ role: "user", content: `Lyrics:\n${lyrics}\n\nFix: ${fixRequest}` }]
        })
      });
      const data = await response.json();
      const fixed = data.content?.map(i => i.text || "").join("").trim();
      if (fixed) { setLyrics(fixed); setFixRequest(""); }
    } catch (e) { }
    setFixing(false);
  };

  const generateStyle = async () => {
    if (remaining <= 0) { setError2("Daily limit reached. Come back tomorrow."); return; }
    setError2("");
    setGeneratingStyle(true);
    setStyleReady(false);
    try {
      const params = [
        `Lyrics:\n${lyrics}`,
        `Genre mix: ${genres.join(", ")}`,
        era ? `Era: ${era}` : "",
        mood ? `Mood: ${mood}` : "",
        voices.length > 0 ? `Voice: ${voices.join(", ")}${voiceRange ? " (" + voiceRange + ")" : ""}` : "",
        voices.includes("No vocals") ? "INSTRUMENTAL — add no-vocals tag" : "",
        instruments ? `Instruments: ${instruments}` : "",
        `Language: ${lang === "RU" ? "Russian" : "English"} (do NOT include this in style string)`,
      ].filter(Boolean).join("\n");

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          system: stylePrompt,
          messages: [{ role: "user", content: params }]
        })
      });
      const data = await response.json();
      const text = data.content?.map(i => i.text || "").join("") || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setStyleString(parsed.style);
      setStyleReady(true);
      setUsageCount(incrementUsage());
    } catch (e) { setError2("Generation failed. Try again."); }
    setGeneratingStyle(false);
  };

  const smartChoose = async () => {
    if (!theme.trim()) return;
    setSmartLoading(true);
    setGeneratingLyrics(true);
    setError1("");
    setLyricsReady(false);
    setStyleReady(false);
    setStyleString("");
    try {
      const langInstruction = lang === "RU" ? "Write lyrics in Russian only." : "Write lyrics in English only.";
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system: smartFullPrompt,
          messages: [{ role: "user", content: "Song idea: " + theme + "\n" + langInstruction }]
        })
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const raw = data.content?.map(i => i.text || "").join("") || "";
      const s = raw.indexOf("{");
      const e = raw.lastIndexOf("}");
      if (s === -1) throw new Error("No JSON in response");
      const parsed = JSON.parse(raw.slice(s, e + 1));
      if (parsed.genres?.length) setGenres(parsed.genres.slice(0, 2));
      if (parsed.mood) setMood(parsed.mood);
      if (parsed.voices?.length) setVoices(parsed.voices.slice(0, 1));
      if (parsed.era !== undefined) setEra(parsed.era);
      if (parsed.title) setTitle(parsed.title);
      if (parsed.lyrics) { setLyrics(parsed.lyrics); setLyricsReady(true); }
    } catch (err) {
      setError1("Auto mode failed: " + err.message);
    }
    setSmartLoading(false);
    setGeneratingLyrics(false);
  };

  const updateVocal = async () => {
    if (voices.length === 0) return;
    setUpdatingVocal(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 100,
          system: vocalPrompt,
          messages: [{ role: "user", content: `Voice: ${voices.join(", ")}` }]
        })
      });
      const data = await response.json();
      const newVocalLine = data.content?.map(i => i.text || "").join("").trim();
      if (newVocalLine) {
        // Replace first line of lyrics with new vocal settings
        const lines = lyrics.split("\n");
        lines[0] = newVocalLine;
        setLyrics(lines.join("\n"));
      }
    } catch (e) { }
    setUpdatingVocal(false);
  };

  const updateBoth = async () => {
    setUpdatingBoth(true);
    await Promise.all([updateVocal(), generateStyle()]);
    setUpdatingBoth(false);
  };

  const copyText = (text, key) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
    } catch (e) { }
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  const CopyBtn = ({ text, label, id }) => (
    <button onClick={() => copyText(text, id)} style={{
      background: copied === id ? "#00e5a0" : "transparent",
      border: `1px solid ${copied === id ? "#00e5a0" : "#333"}`,
      color: copied === id ? "#000" : "#888",
      padding: "8px 16px", borderRadius: "8px", fontSize: "12px",
      cursor: "pointer", transition: "all 0.2s",
      fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em"
    }}>
      {copied === id ? "✓ COPIED" : label}
    </button>
  );

  const settingsSummary = [
    era, genres.join(" · "), mood, voices.join(" · ")
  ].filter(Boolean).join("  ·  ");

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#e8e8e0", fontFamily: "'DM Sans', sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea:focus, input:focus { outline: none; }
        .ifield {
          background: #0f0f0f; border: 1px solid #1e1e1e; border-radius: 10px;
          color: #e8e8e0; font-family: 'DM Sans', sans-serif; font-size: 14px;
          transition: border-color 0.2s; width: 100%;
        }
        .ifield:focus { border-color: #00e5a0; }
        .pill {
          background: #0f0f0f; border: 1px solid #1e1e1e; border-radius: 8px;
          color: #888; padding: 8px 10px; font-size: 12px; cursor: pointer;
          transition: all 0.15s; font-family: 'DM Sans', sans-serif; text-align: center; user-select: none;
        }
        .pill:hover { border-color: #333; color: #ccc; }
        .pill.active { border-color: #00e5a0; color: #00e5a0; background: #001a12; }
        .g4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 7px; }
        .g5 { display: grid; grid-template-columns: repeat(5,1fr); gap: 7px; }
        .g3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 7px; }
        .btn-green {
          width: 100%; padding: 16px; background: #00e5a0; border: none;
          border-radius: 12px; color: #000; font-size: 14px; font-weight: 500;
          font-family: 'DM Mono', monospace; letter-spacing: 0.08em;
          cursor: pointer; transition: all 0.2s;
        }
        .btn-green:hover { background: #00ffb3; transform: translateY(-1px); }
        .btn-green:disabled { background: #1a1a1a; color: #444; cursor: not-allowed; transform: none; }
        .btn-outline {
          padding: 10px 14px; background: transparent; border: 1px solid #00e5a0;
          border-radius: 8px; color: #00e5a0; font-size: 12px;
          font-family: 'DM Mono', monospace; cursor: pointer; transition: all 0.2s; white-space: nowrap; flex-shrink: 0;
        }
        .btn-outline:hover { background: #001a12; }
        .btn-outline:disabled { border-color: #333; color: #444; cursor: not-allowed; }
        .card { background: #0c0c0c; border: 1px solid #1a1a1a; border-radius: 16px; padding: 20px; }
        .fl { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.15em; color: #444; text-transform: uppercase; margin-bottom: 8px; display: block; }
        .step-row { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
        .snum { width: 26px; height: 26px; border-radius: 50%; background: #00e5a0; color: #000; font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 500; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .snum.done { background: #001a12; color: #00e5a0; border: 1px solid #00e5a0; }
        .snum.dim { background: #1a1a1a; color: #444; }
        .stitle { font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.1em; color: #666; text-transform: uppercase; }
        .hint { font-size: 11px; color: "#333"; font-family: 'DM Mono', monospace; margin-top: 5px; color: #2e2e2e; }
        .sel-row { font-size: 11px; color: #00e5a0; font-family: 'DM Mono', monospace; margin-bottom: 8px; }
        .pulse { display: inline-block; width: 7px; height: 7px; background: #00e5a0; border-radius: 50%; animation: p 1s infinite; }
        @keyframes p { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
        .noise-bg { position: fixed; top:0; left:0; right:0; bottom:0; opacity: 0.025; pointer-events: none; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); background-size: 200px; z-index: 0; }
      `}</style>

      <div className="noise-bg" />
      <div style={{ position: "relative", zIndex: 1, maxWidth: "500px", margin: "0 auto", padding: "36px 16px 60px" }}>

        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.2em", color: "#00e5a0", marginBottom: "10px", textTransform: "uppercase" }}>
            AI Music Lab ✦ Suno Assistant
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 7vw, 42px)", fontWeight: "700", fontStyle: "italic", lineHeight: "1.1", color: "#f0f0e8", marginBottom: "8px" }}>
            Your song,<br />in 30 seconds.
          </h1>
          <p style={{ color: "#444", fontSize: "13px", lineHeight: "1.6" }}>
            Set your parameters — then generate lyrics and style string.
          </p>
        </div>

        {/* ── STEP 1: SETTINGS + LYRICS ── */}
        <div className="card" style={{ marginBottom: "16px" }}>
          <div className="step-row">
            <div className={`snum ${lyricsReady ? "done" : ""}`}>{lyricsReady ? "✓" : "1"}</div>
            <div className="stitle">Set parameters & generate lyrics</div>
          </div>

          {/* Theme */}
          <div style={{ marginBottom: "16px" }}>
            <label className="fl">Theme / Idea</label>
            <textarea className="ifield" rows={3}
              placeholder="A rainy evening in a city you can't forget. A love that ended too quietly..."
              value={theme} onChange={e => setTheme(e.target.value)}
              style={{ padding: "12px 14px", resize: "none", lineHeight: "1.6" }}
            />
          </div>

          {/* Language */}
          <div style={{ marginBottom: "16px" }}>
            <label className="fl">Lyrics language</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[["RU", "Русский"], ["EN", "English"]].map(([code, label]) => (
                <div key={code} className={`pill ${lang === code ? "active" : ""}`}
                  onClick={() => setLang(code)}
                  style={{ padding: "12px", fontSize: "13px" }}>
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Era */}
          <div style={{ marginBottom: "16px" }}>
            <label className="fl">Era <span style={{ color: "#222", textTransform: "none", letterSpacing: 0 }}>(optional — shapes lyrics style & rhythm)</span></label>
            <div className="g5">
              {ERAS.map(e => (
                <div key={e} className={`pill ${era === e ? "active" : ""}`} onClick={() => setEra(prev => prev === e ? "" : e)}>{e}</div>
              ))}
            </div>
            {era && <div className="hint" style={{ marginTop: "6px" }}>✦ Lyrics will match the style, rhythm and vocabulary of the {era} era</div>}
          </div>

          {/* Genre */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <label className="fl" style={{ marginBottom: 0 }}>Genre <span style={{ color: "#222", textTransform: "none", letterSpacing: 0 }}>(max 3)</span></label>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ display: "flex", gap: "4px" }}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} style={{
                      width: "8px", height: "8px", borderRadius: "50%",
                      background: i < genres.length ? "#00e5a0" : "#1e1e1e",
                      transition: "all 0.3s"
                    }} />
                  ))}
                </div>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: genres.length === 3 ? "#00e5a0" : "#444" }}>
                  {genres.length} / 3
                </span>
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "#2a2a2a", fontFamily: "'DM Mono', monospace", marginBottom: "8px" }}>
              Not sure? Leave empty — AI picks automatically
            </div>
            {genres.length > 0 && <div className="sel-row">✦ {genres.join(" · ")}</div>}
            <div className="g4">
              {GENRES.map(g => {
                const isSelected = genres.includes(g);
                const isMaxed = genres.length >= 3 && !isSelected;
                const status = getGenreStatus(g, genres);
                let style = {};
                if (isMaxed) {
                  style = { opacity: 0.25, cursor: "not-allowed", borderColor: "#1a1a1a", color: "#444" };
                } else if (!isSelected) {
                  if (status === "good") style = { borderColor: "#00e5a040", color: "#00e5a0", background: "#001a0a" };
                  else if (status === "conflict") style = { borderColor: "#1a1a1a", color: "#333", background: "#0a0a0a", opacity: 0.6 };
                }
                return (
                  <div key={g}
                    className={`pill ${isSelected ? "active" : ""}`}
                    style={style}
                    onClick={() => !isMaxed && toggleGenre(g)}
                    title={isMaxed ? "Max 3 genres selected" : status === "conflict" ? "⚠ May conflict with selected genres" : ""}
                  >
                    {status === "conflict" && !isSelected && !isMaxed ? <span style={{ marginRight: "3px", fontSize: "10px" }}>⚠</span> : null}
                    {g}
                  </div>
                );
              })}
            </div>
            {genres.length > 0 && genres.length < 3 && (
              <div style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", marginTop: "8px", color: "#2a2a2a" }}>
                <span style={{ color: "#00e5a030", marginRight: "12px" }}>● good match</span>
                <span>⚠ may conflict</span>
              </div>
            )}
            {genres.length === 3 && (
              <div style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", marginTop: "8px", color: "#00e5a0" }}>
                ✦ Maximum 3 genres selected
              </div>
            )}
          </div>

          {/* Mood */}
          <div style={{ marginBottom: "16px" }}>
            <label className="fl">Mood <span style={{ color: "#222", textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
            <div style={{ fontSize: "11px", color: "#2a2a2a", fontFamily: "'DM Mono', monospace", marginBottom: "8px" }}>
              Not sure? Leave empty — AI picks automatically
            </div>
            <div className="g5">
              {MOODS.map(m => <div key={m} className={`pill ${mood === m ? "active" : ""}`} onClick={() => setMood(m)}>{m}</div>)}
            </div>
          </div>

          {/* Voice */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <label className="fl" style={{ marginBottom: 0 }}>Voice <span style={{ color: "#222", textTransform: "none", letterSpacing: 0 }}>(max 2, optional)</span></label>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ display: "flex", gap: "4px" }}>
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} style={{
                      width: "8px", height: "8px", borderRadius: "50%",
                      background: i < voices.length ? "#00e5a0" : "#1e1e1e",
                      transition: "all 0.3s"
                    }} />
                  ))}
                </div>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: voices.length === 2 ? "#00e5a0" : "#444" }}>
                  {voices.length} / 2
                </span>
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "#2a2a2a", fontFamily: "'DM Mono', monospace", marginBottom: "8px" }}>
              Not sure? Leave empty — AI picks automatically
            </div>
            {voices.length > 0 && <div className="sel-row">✦ {voices.join(" · ")}</div>}
            <div className="g3">
              {VOICES.map(v => {
                const isSelected = voices.includes(v);
                const isMaxed = voices.length >= 2 && !isSelected;
                return (
                  <div key={v}
                    className={`pill ${isSelected ? "active" : ""}`}
                    style={isMaxed ? { opacity: 0.25, cursor: "not-allowed", borderColor: "#1a1a1a", color: "#444" } : {}}
                    onClick={() => !isMaxed && toggleVoice(v)}
                  >
                    {v}
                  </div>
                );
              })}
            </div>
            {voices.length === 2 && (
              <div style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", marginTop: "8px", color: "#00e5a0" }}>
                ✦ Maximum 2 voices selected
              </div>
            )}

            {/* Voice range refinement */}
            {voices.length === 1 && VOICE_RANGES[voices[0]] && (
              <div style={{ marginTop: "12px" }}>
                <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: "#444", letterSpacing: "0.12em", marginBottom: "8px" }}>
                  VOICE RANGE <span style={{ color: "#222", letterSpacing: 0, textTransform: "none" }}>(optional)</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "7px" }}>
                  {VOICE_RANGES[voices[0]].map(({ label, range }) => (
                    <div key={label}
                      className={`pill ${voiceRange === range ? "active" : ""}`}
                      onClick={() => setVoiceRange(prev => prev === range ? "" : range)}
                      style={{ fontSize: "11px", padding: "8px 6px" }}
                    >
                      <div>{label}</div>
                      {range && <div style={{ fontSize: "9px", color: voiceRange === range ? "#00e5a0" : "#555", marginTop: "2px" }}>{range}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Instruments */}
          <div style={{ marginBottom: "18px" }}>
            <label className="fl">Instruments <span style={{ color: "#222", textTransform: "none", letterSpacing: 0 }}>(optional — shapes lyrics imagery)</span></label>
            <input className="ifield" type="text"
              placeholder="e.g. accordion, duduk, banjo, sitar, kora, balalaika..."
              value={instruments} onChange={e => setInstruments(e.target.value)}
              style={{ padding: "10px 14px", fontSize: "13px" }}
            />
            <div className="hint">1-2 instruments work best — mix from the same cultural family</div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid #1a1a1a", marginBottom: "18px" }} />

          {/* Lyrics area */}
          <div style={{ marginBottom: "12px" }}>
            <label className="fl">
              Lyrics {lyricsReady && <span style={{ color: "#00e5a0", textTransform: "none", letterSpacing: 0 }}>— edit directly or use Fix below</span>}
            </label>
            <textarea className="ifield"
              rows={lyricsReady ? 14 : 4}
              placeholder="Lyrics will appear here — or paste your own and go straight to Step 2"
              value={lyrics} onChange={e => { setLyrics(e.target.value); if (e.target.value.trim()) setLyricsReady(true); }}
              style={{ padding: "12px 14px", fontFamily: lyricsReady ? "'DM Mono', monospace" : "'DM Sans', sans-serif", fontSize: "13px", lineHeight: "1.8", resize: "vertical" }}
            />
          </div>

          {/* Fix row */}
          {(lyricsReady || lyrics.trim()) && (
            <div style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <textarea className="ifield" rows={2}
                  placeholder='Describe the fix: "shorten lines, more rhythmic" or "припев — рифма на -ая"'
                  value={fixRequest} onChange={e => setFixRequest(e.target.value)}
                  style={{ padding: "10px 12px", fontSize: "13px", resize: "none", lineHeight: "1.5", flex: 1 }}
                />
                <button className="btn-outline" onClick={fixLyrics} disabled={fixing || !fixRequest.trim()}>
                  {fixing ? <span className="pulse" /> : "FIX →"}
                </button>
              </div>
            </div>
          )}

          {error1 && <div style={{ color: "#ff6b6b", fontSize: "12px", fontFamily: "'DM Mono', monospace", marginBottom: "12px" }}>✕ {error1}</div>}

          <button className="btn-green" onClick={generateLyrics} disabled={generatingLyrics}>
            {generatingLyrics
              ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}><span className="pulse" /> GENERATING LYRICS...</span>
              : lyricsReady ? "REGENERATE LYRICS" : "GENERATE LYRICS →"}
          </button>
        </div>

        {/* ── STEP 2: STYLE STRING ── */}
        <div className="card" style={{ opacity: lyrics.trim() ? 1 : 0.35, transition: "opacity 0.3s" }}>
          <div className="step-row">
            <div className={`snum ${styleReady ? "done" : lyrics.trim() ? "" : "dim"}`}>{styleReady ? "✓" : "2"}</div>
            <div className="stitle">Generate Suno style string</div>
          </div>

          {/* Settings summary */}
          {settingsSummary && (
            <div style={{ fontSize: "11px", color: "#333", fontFamily: "'DM Mono', monospace", marginBottom: "14px", lineHeight: "1.6" }}>
              {settingsSummary}
            </div>
          )}

          {/* Counter */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#080808", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "12px 16px", marginBottom: "14px" }}>
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
                <span style={{ fontSize: "28px", fontWeight: "500", color: remaining > 1 ? "#e8e8e0" : remaining === 1 ? "#ffaa00" : "#ff6b6b" }}>{remaining}</span>
                <span style={{ fontSize: "14px", color: "#444" }}> / {DAILY_LIMIT}</span>
              </div>
              <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: "#444", marginTop: "3px", letterSpacing: "0.12em" }}>
                {remaining > 0 ? "GENERATIONS LEFT TODAY" : "RESETS TOMORROW"}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
              <div style={{ display: "flex", gap: "5px" }}>
                {Array.from({ length: DAILY_LIMIT }).map((_, i) => (
                  <div key={i} style={{ width: "9px", height: "9px", borderRadius: "50%", background: i < usageCount ? "#1e1e1e" : "#00e5a0", transition: "all 0.4s" }} />
                ))}
              </div>
              <button onClick={() => { localStorage.removeItem("suno_usage"); setUsageCount(0); }} style={{
                background: "transparent", border: "1px solid #2a2a2a", borderRadius: "6px",
                color: "#333", fontSize: "10px", fontFamily: "'DM Mono', monospace",
                padding: "3px 8px", cursor: "pointer", letterSpacing: "0.08em"
              }}>
                DEV RESET
              </button>
            </div>
          </div>

          {error2 && <div style={{ color: "#ff6b6b", fontSize: "12px", fontFamily: "'DM Mono', monospace", marginBottom: "12px" }}>✕ {error2}</div>}

          <button className="btn-green" onClick={generateStyle} disabled={generatingStyle || !lyrics.trim() || remaining <= 0}>
            {generatingStyle
              ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}><span className="pulse" /> GENERATING STYLE...</span>
              : "GENERATE STYLE STRING →"}
          </button>
        </div>

        {/* ── RESULT ── */}
        {styleReady && (
          <div style={{ marginTop: "20px", background: "#0c0c0c", border: "1px solid #00e5a0", borderRadius: "16px", padding: "24px" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.2em", color: "#00e5a0", marginBottom: "14px" }}>
              ✦ READY TO PASTE INTO SUNO
            </div>

            {title && (
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", fontStyle: "italic", color: "#f0f0e8", marginBottom: "20px" }}>
                {title}
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <label className="fl">Lyrics</label>
              <div style={{ background: "#080808", border: "1px solid #1e1e1e", borderRadius: "10px", padding: "16px", fontFamily: "'DM Mono', monospace", fontSize: "13px", lineHeight: "1.8", color: "#c8c8c0", whiteSpace: "pre-wrap" }}>
                {lyrics}
              </div>
              <div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end" }}>
                <CopyBtn text={lyrics} label="COPY LYRICS" id="lyr" />
              </div>
            </div>

            <div style={{ borderTop: "1px solid #1a1a1a", marginBottom: "16px" }} />

            <div style={{ marginBottom: "16px" }}>
              <label className="fl">Suno Style String</label>
              <div style={{ background: "#080808", border: "1px solid #1e1e1e", borderRadius: "10px", padding: "16px", fontFamily: "'DM Mono', monospace", fontSize: "13px", lineHeight: "1.6", color: "#c8c8c0" }}>
                {styleString}
              </div>
              <div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end" }}>
                <CopyBtn text={styleString} label="COPY STYLE" id="sty" />
              </div>
            </div>

            {/* Update buttons */}
            <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: "16px", marginBottom: "16px" }}>
              <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: "#444", letterSpacing: "0.12em", marginBottom: "10px" }}>
                CHANGED SOMETHING? UPDATE:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                <button onClick={updateVocal} disabled={updatingVocal || voices.length === 0} style={{
                  padding: "10px 8px", background: "transparent", border: "1px solid #1e1e1e",
                  borderRadius: "8px", color: "#666", fontSize: "11px",
                  fontFamily: "'DM Mono', monospace", cursor: "pointer", transition: "all 0.2s",
                  letterSpacing: "0.05em"
                }}
                  onMouseEnter={e => e.target.style.borderColor = "#00e5a0"}
                  onMouseLeave={e => e.target.style.borderColor = "#1e1e1e"}
                >
                  {updatingVocal ? <span className="pulse" /> : "UPDATE\nVOCAL"}
                </button>
                <button onClick={generateStyle} disabled={generatingStyle || !lyrics.trim() || remaining <= 0} style={{
                  padding: "10px 8px", background: "transparent", border: "1px solid #1e1e1e",
                  borderRadius: "8px", color: "#666", fontSize: "11px",
                  fontFamily: "'DM Mono', monospace", cursor: "pointer", transition: "all 0.2s",
                  letterSpacing: "0.05em"
                }}
                  onMouseEnter={e => e.target.style.borderColor = "#00e5a0"}
                  onMouseLeave={e => e.target.style.borderColor = "#1e1e1e"}
                >
                  {generatingStyle ? <span className="pulse" /> : "UPDATE\nSTYLE"}
                </button>
                <button onClick={updateBoth} disabled={updatingBoth || voices.length === 0 || remaining <= 0} style={{
                  padding: "10px 8px", background: "#001a12", border: "1px solid #00e5a0",
                  borderRadius: "8px", color: "#00e5a0", fontSize: "11px",
                  fontFamily: "'DM Mono', monospace", cursor: "pointer", transition: "all 0.2s",
                  letterSpacing: "0.05em"
                }}>
                  {updatingBoth ? <span className="pulse" /> : "UPDATE\nBOTH"}
                </button>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: "16px", display: "flex", justifyContent: "center" }}>
              <CopyBtn
                text={`${title}\n\n--- LYRICS ---\n${lyrics}\n\n--- SUNO STYLE ---\n${styleString}`}
                label="COPY FULL PACKAGE"
                id="all"
              />
            </div>
          </div>
        )}

        <div style={{ marginTop: "48px", textAlign: "center", fontSize: "10px", fontFamily: "'DM Mono', monospace", color: "#1e1e1e", letterSpacing: "0.1em" }}>
          AI MUSIC LAB ✦ SUNO ASSISTANT ✦ V0.5
        </div>
      </div>
    </div>
  );
}
