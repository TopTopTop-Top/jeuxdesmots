const THEMES = [
  { id: "animal", label: "un animal", hint: "ex. loutre, dragon…" },
  { id: "metier", label: "un métier", hint: "ex. plombier, astronaute…" },
  { id: "outil", label: "un outil / objet technique", hint: "ex. clé à molette, thermostat…" },
  { id: "sentiment", label: "un sentiment précis", hint: "ex. nostalgie, agacement…" },
];

const LETTERS = "ABCDEFGHILMNOPRSTV".split("");

/**
 * Citations réelles (domaine public : auteurs morts depuis 70 ans+).
 * L’auteur est toujours affiché. Les inventions viennent des défis, pas du catalogue.
 */
const QUOTES = [
  { author: "René Descartes", text: "Je pense, donc je suis." },
  {
    author: "Jean-Jacques Rousseau",
    text: "L’homme est né libre, et partout il est dans les fers.",
  },
  {
    author: "François Rabelais",
    text: "Science sans conscience n’est que ruine de l’âme.",
  },
  { author: "Voltaire", text: "Il faut cultiver notre jardin." },
  {
    author: "Voltaire",
    text: "Le bonheur est souvent la seule chose qu’on puisse donner sans l’avoir.",
  },
  {
    author: "Victor Hugo",
    text: "On résiste à l’invasion des armées ; on ne résiste pas à l’invasion des idées.",
  },
  {
    author: "Victor Hugo",
    text: "La liberté commence où l’ignorance finit.",
  },
  {
    author: "Montesquieu",
    text: "Une injustice faite à un seul est une menace faite à tous.",
  },
  {
    author: "Blaise Pascal",
    text: "Le cœur a ses raisons que la raison ne connaît point.",
  },
  {
    author: "La Rochefoucauld",
    text: "L’hypocrisie est un hommage que le vice rend à la vertu.",
  },
  {
    author: "La Fontaine",
    text: "Rien ne sert de courir ; il faut partir à point.",
  },
  { author: "La Fontaine", text: "Aide-toi, le ciel t’aidera." },
  {
    author: "Molière",
    text: "On ne meurt qu’une fois, et c’est pour si longtemps.",
  },
  { author: "Honoré de Balzac", text: "L’espoir est un prêt fait au bonheur." },
  {
    author: "Gustave Flaubert",
    text: "Soyez réglé dans votre vie et ordinaire comme un bourgeois, afin d’être violent et original dans vos œuvres.",
  },
  {
    author: "Charles Baudelaire",
    text: "Il faut être toujours ivre. Tout est là : c’est l’unique question.",
  },
  { author: "Arthur Rimbaud", text: "Il faut être absolument moderne." },
  {
    author: "Émile Zola",
    text: "La vérité est en marche et rien ne l’arrêtera.",
  },
  {
    author: "Alexis de Tocqueville",
    text: "On oublie facilement le mal qu’on a fait, mais non celui qu’on a reçu.",
  },
  {
    author: "Brillat-Savarin",
    text: "Dis-moi ce que tu manges, je te dirai ce que tu es.",
  },
  {
    author: "Napoléon Bonaparte",
    text: "Du sublime au ridicule il n’y a qu’un pas.",
  },
  {
    author: "Denis Diderot",
    text: "Il n’y a qu’un devoir, c’est d’être heureux.",
  },
  {
    author: "Chamfort",
    text: "La plus perdue de toutes les journées est celle où l’on n’a pas ri.",
  },
  {
    author: "Beaumarchais",
    text: "Boire sans soif et faire l’amour en tout temps, madame, il n’y a que ça qui nous distingue des autres bêtes.",
  },
];

const state = {
  players: [],
  scores: {},
  voiceMode: "human", // 'human' | 'assist'
  textSource: "wikipedia", // 'wikipedia' | 'actu' | 'mix' | 'citations'
  textPool: [],
  textMeta: [], // { source, title }
  totalRounds: 6,
  round: 0,
  readerIndex: 0,
  mission: null, // 'fidele' | 'impro'
  challenge: null,
  missionDeck: [],
  text: "",
  textLabel: "",
  textTitle: "",
  quoteAuthor: "",
  quoteOfficial: "", // citation réelle complète (même si invent = cachée à l’écran)
  declaredSpoken: "",
  votes: {},
  guesses: {},
  committed: "",
  transcript: "",
  interim: "",
  audioUrl: null,
  mediaRecorder: null,
  mediaStream: null,
  recognition: null,
  chunks: [],
  recording: false,
  wantRecognition: false,
  stopping: false,
  timerId: null,
  secondsLeft: 45,
  sttSuggestions: [],
  validatedAdditions: [],
  recMime: "audio/webm",
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function textWords(text) {
  return String(text).split(/\s+/).filter(Boolean);
}

function bareWord(w) {
  return String(w)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}'’-]/gu, "");
}

/** Années / chiffres / mois = trop facile à « truquer » (±1 an, etc.). */
function isCheapReplaceTarget(bare) {
  if (!bare) return true;
  if (/^\d+$/.test(bare)) return true;
  if (/^\d{3,4}$/.test(bare)) return true;
  if (
    /^(xixe|xxe|xxie|xviie|xviiie|xve|xvie|siecle|siècle)$/i.test(bare)
  ) {
    return true;
  }
  if (
    /^(janvier|fevrier|février|mars|avril|mai|juin|juillet|aout|août|septembre|octobre|novembre|decembre|décembre)$/i.test(
      bare
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Mot assez « remarquable » pour un remplacement :
 * pas un petit mot, pas une date/année (biais trop fort).
 */
function pickReplaceableIndex(words) {
  const stop = new Set([
    "le", "la", "les", "un", "une", "des", "de", "du", "au", "aux",
    "et", "ou", "a", "à", "en", "y", "ce", "se", "ne", "pas", "qui",
    "que", "dans", "sur", "par", "pour", "avec", "est", "sont", "il",
    "elle", "ils", "elles", "on", "nous", "vous", "son", "sa", "ses",
    "cette", "cet", "ces", "aux", "dont", "mais", "donc", "car",
  ]);
  const candidates = [];
  words.forEach((w, i) => {
    const bare = bareWord(w);
    if (bare.length < 5) return;
    if (stop.has(bare)) return;
    if (isCheapReplaceTarget(bare)) return;
    if (/\d/.test(bare)) return;
    candidates.push(i);
  });
  if (candidates.length) return pick(candidates);
  // fallback : plus long mot non-chiffre
  let best = -1;
  let bestLen = 0;
  words.forEach((w, i) => {
    const bare = bareWord(w);
    if (isCheapReplaceTarget(bare) || /\d/.test(bare)) return;
    if (bare.length > bestLen) {
      bestLen = bare.length;
      best = i;
    }
  });
  if (best >= 0) return best;
  return Math.max(0, Math.floor(words.length / 2));
}

function makeReplaceChallenge(words) {
  const idx = pickReplaceableIndex(words);
  const original = words[idx].replace(/[^\p{L}\p{N}'’-]/gu, "");
  const kind = Math.random();
  // Règle anti-biais (racine / année) — une seule phrase de consigne
  const anti =
    "une autre famille (pas la même racine, pas un cousin proche)";

  // 1 mot OU locution de 2–3 mots (plus de marge si un seul nom commun est dur)
  const slot = "un mot, ou une locution de 2 à 3 mots";

  if (kind < 0.4) {
    return {
      type: "replace",
      title: `Remplace « ${original} »`,
      detail: `Remplace uniquement « ${original} » par ${slot} d’${anti}. Pas de prénom / nom propre. Le reste du texte : à l’identique.`,
      target: {
        original: original.toLowerCase(),
        letter: null,
        letterPos: null,
        noSameStem: true,
        noProperName: true,
        allowPhrase: true,
      },
      bonusOk: 3,
      bonusStealth: 4,
    };
  }

  if (kind < 0.7) {
    const letter = pick(LETTERS);
    return {
      type: "replace",
      title: `Remplace « ${original} » → ${letter}…`,
      detail: `Remplace uniquement « ${original} » par ${slot} qui commence par « ${letter} », d’${anti}, sans prénom / nom propre.`,
      target: {
        original: original.toLowerCase(),
        letter: letter.toLowerCase(),
        letterPos: "start",
        noSameStem: true,
        noProperName: true,
        allowPhrase: true,
      },
      bonusOk: 4,
      bonusStealth: 5,
    };
  }

  const letter = pick(LETTERS);
  return {
    type: "replace",
    title: `Remplace « ${original} » → …${letter.toLowerCase()}`,
    detail: `Remplace uniquement « ${original} » par ${slot} qui se termine par « ${letter.toLowerCase()} », d’${anti}, sans prénom / nom propre.`,
    target: {
      original: original.toLowerCase(),
      letter: letter.toLowerCase(),
      letterPos: "end",
      noSameStem: true,
      noProperName: true,
      allowPhrase: true,
    },
    bonusOk: 4,
    bonusStealth: 5,
  };
}

/** Citation officielle écrite : toujours entre guillemets français. */
function withGuillemets(text) {
  const s = String(text || "").trim();
  if (!s) return "";
  if (/^[«"]/.test(s)) return s.replace(/^["“]/, "« ").replace(/["”]$/, " »");
  return `« ${s} »`;
}

function stripGuillemets(text) {
  return String(text || "")
    .replace(/^[«»"“”]+/, "")
    .replace(/[«»"“”]+$/g, "")
    .replace(/[«»]/g, "")
    .trim();
}

/**
 * Impro citations :
 * - modifier un peu / beaucoup (citation réelle affichée)
 * - inventer (aucune citation affichée)
 * Exacte = mission fidèle (citation entière obligatoire).
 */
function makeQuoteChallenge(text) {
  const words = textWords(stripGuillemets(text));
  const roll = Math.random();
  const idx = words.length ? pickReplaceableIndex(words) : 0;
  const word = (words[idx] || "mot").replace(/[^\p{L}\p{N}'’-]/gu, "");

  if (roll < 0.34) {
    return {
      type: "quote-tweak",
      title: "Modifier un peu",
      detail: `La citation réelle est affichée en entier. Change seulement 1 à 3 mots (ex. autour de « ${word} »). À l’écrit, garde des guillemets.`,
      target: {
        change: "tweak",
        original: word.toLowerCase(),
        allowPhrase: true,
      },
      bonusOk: 4,
      bonusStealth: 5,
    };
  }

  if (roll < 0.67) {
    return {
      type: "quote-rewrite",
      title: "Modifier beaucoup",
      detail:
        "La citation réelle est affichée. Réécris-en presque tout (idée vague OK) pour que ça sonne encore comme une citation entre guillemets.",
      target: { change: "rewrite", allowPhrase: true },
      bonusOk: 4,
      bonusStealth: 5,
    };
  }

  return {
    type: "quote-invent",
    title: "Inventer une citation",
    detail:
      "Aucune citation fournie. Invente une maxime complète entre « », puis un auteur fictif en prénom + nom (ex. « Claire Montauban »). Jamais une personne réelle / vivante.",
    target: { change: "invent", allowPhrase: true, inventAuthor: true },
    bonusOk: 5,
    bonusStealth: 5,
  };
}

/**
 * Défis d’impro : on privilégie le remplacement improvisé
 * (jamais « dis exactement ananas » — trop scripté / trop facile à cramer).
 */
function makeChallenge(text) {
  if (isCitationsMode()) {
    return makeQuoteChallenge(text);
  }

  const words = textWords(text);
  const roll = Math.random();

  // ~30% remplacement improvisé
  if (roll < 0.3 && words.length >= 4) {
    return makeReplaceChallenge(words);
  }

  // Négation : dire le contraire d’un fait du texte
  if (roll < 0.48 && words.length >= 6) {
    const idx = pickReplaceableIndex(words);
    const anchor = words[idx].replace(/[^\p{L}\p{N}'’-]/gu, "");
    return {
      type: "negate",
      title: "Négation / contraire",
      detail: `À un moment, dis le contraire d’une info du texte (autour de « ${anchor} » ou ailleurs) : inverse un fait, une qualité, une présence/absence — sans annoncer que tu nies.`,
      target: { anchor: anchor.toLowerCase(), allowPhrase: true },
      bonusOk: 4,
      bonusStealth: 5,
    };
  }

  // Volume : plus tu ajoutes sans te faire cramer, plus tu gagnes
  if (roll < 0.5) {
    return {
      type: "volume",
      title: "Charge de mots",
      detail:
        "Glisse le plus de mots inventés possible sans te faire cramer. Chaque mot non trouvé rapporte gros.",
      target: "volume",
      bonusOk: 2,
      bonusStealth: 3,
    };
  }

  if (roll < 0.65) {
    const letter = pick(LETTERS);
    return {
      type: "letter",
      title: `Ajoute du « ${letter}… »`,
      detail: `Glisse un nom commun ou une locution de 2–3 mots qui commence par « ${letter} » (ex. « grande surprise ») — pas de prénom / nom propre. Tu peux en ajouter d’autres autour.`,
      target: {
        letter: letter.toLowerCase(),
        noProperName: true,
        allowPhrase: true,
      },
      bonusOk: 3,
      bonusStealth: 4,
    };
  }

  if (roll < 0.8) {
    const theme = pick(THEMES);
    return {
      type: "theme",
      title: `Thème : ${theme.label}`,
      detail: `Ajoute ${theme.label} (1 mot ou locution de 2–3 mots) qui n’est pas dans le texte. ${theme.hint}`,
      target: { theme: theme.id, allowPhrase: true },
      bonusOk: 3,
      bonusStealth: 4,
    };
  }

  return {
    type: "number",
    title: "Une quantité inventée",
    detail:
      "Ajoute une quantité inventée avec unité (ex. « 12 kilomètres », « trois valises ») — pas juste une année ±1.",
    target: "number",
    bonusOk: 3,
    bonusStealth: 3,
  };
}

/**
 * Mélange équilibré : ~1/3 fidèle, ~2/3 impro+défi.
 * Les défis « replace » sont tirés au moment de la manche (besoin du texte).
 */
function buildMissionDeck(n) {
  const fideleCount = Math.max(1, Math.round(n / 3));
  const improCount = n - fideleCount;
  const deck = [];
  for (let i = 0; i < fideleCount; i++) {
    deck.push({ mission: "fidele", challenge: null });
  }
  for (let i = 0; i < improCount; i++) {
    deck.push({ mission: "impro", challenge: "pending" });
  }
  return shuffle(deck);
}

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function show(screen) {
  $$(".screen").forEach((el) => el.classList.remove("active"));
  const target = $(`[data-screen="${screen}"]`);
  if (target) {
    target.classList.remove("active");
    void target.offsetWidth;
    target.classList.add("active");
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeTokens(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function collapseRepeatedWords(text) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const out = [];
  for (const w of words) {
    if (out.length && out[out.length - 1].toLowerCase() === w.toLowerCase()) continue;
    out.push(w);
  }
  return out.join(" ");
}

function dedupeTranscript(text) {
  let s = collapseRepeatedWords(String(text).replace(/\s+/g, " ").trim());
  if (!s) return "";

  const words = s.split(" ");
  if (words.length >= 8) {
    const mid = Math.floor(words.length / 2);
    const a = words.slice(0, mid).join(" ").toLowerCase();
    const b = words.slice(mid).join(" ").toLowerCase();
    if (a === b) s = words.slice(0, mid).join(" ");
  }

  const lower = s.toLowerCase();
  for (let len = Math.floor(lower.length / 2); len >= 24; len--) {
    if (lower.slice(0, len).trim() === lower.slice(len, len * 2).trim()) {
      s = s.slice(0, len).trim();
      break;
    }
  }
  return collapseRepeatedWords(s);
}

function fullTranscript() {
  return dedupeTranscript(
    [state.committed, state.transcript, state.interim].filter(Boolean).join(" ")
  );
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[b.length];
}

function fuzzyEq(a, b) {
  if (a === b) return true;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen <= 2) return a === b;
  const dist = levenshtein(a, b);
  if (maxLen <= 5) return dist <= 1;
  return dist / maxLen <= 0.25;
}

/** Suggestions STT seulement — jamais utilisées seules pour scorer. */
function suggestSttAdditions(original, spoken) {
  const counts = {};
  for (const w of normalizeTokens(original)) {
    counts[w] = (counts[w] || 0) + 1;
  }
  const added = [];
  for (const w of normalizeTokens(spoken)) {
    let matched = false;
    for (const key of Object.keys(counts)) {
      if (counts[key] > 0 && fuzzyEq(w, key)) {
        counts[key] -= 1;
        matched = true;
        break;
      }
    }
    if (!matched) added.push(w);
  }
  // unique preserve order
  const seen = new Set();
  return added.filter((w) => {
    if (seen.has(w)) return false;
    seen.add(w);
    return true;
  });
}

function parseList(text) {
  return String(text)
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function listToNormalizedPhrases(list) {
  return list.map((p) => normalizeTokens(p).join(" ")).filter(Boolean);
}

function guessHitsAgainstValidated(guessText, validatedList) {
  const parts = parseList(guessText);
  const pool = listToNormalizedPhrases(validatedList);
  const hits = [];
  const caught = new Set();

  for (const part of parts) {
    const joined = normalizeTokens(part).join(" ");
    if (!joined) continue;

    const exactIdx = pool.findIndex((p) => p === joined || p.includes(joined) || joined.includes(p));
    if (exactIdx >= 0) {
      hits.push(part);
      caught.add(pool[exactIdx]);
      pool.splice(exactIdx, 1);
      continue;
    }

    // fuzzy phrase / word
    let found = -1;
    for (let i = 0; i < pool.length; i++) {
      const pt = pool[i].split(" ");
      const gt = joined.split(" ");
      if (gt.length === 1 && pt.length === 1 && fuzzyEq(gt[0], pt[0])) {
        found = i;
        break;
      }
      if (gt.every((g) => pt.some((p) => fuzzyEq(g, p)))) {
        found = i;
        break;
      }
    }
    if (found >= 0) {
      hits.push(part);
      caught.add(pool[found]);
      pool.splice(found, 1);
    }
  }

  return { hits, caughtNormalized: [...caught] };
}

function renderPlayers() {
  $("#player-list").innerHTML = state.players
    .map(
      (name, i) =>
        `<li>${escapeHtml(name)} <button type="button" aria-label="Retirer" data-remove="${i}">×</button></li>`
    )
    .join("");
  $("#start-game").disabled = state.players.length < 3;
}

function addPlayer() {
  const input = $("#player-input");
  const name = input.value.trim();
  if (!name) return;
  if (state.players.some((p) => p.toLowerCase() === name.toLowerCase())) {
    input.value = "";
    return;
  }
  state.players.push(name);
  input.value = "";
  renderPlayers();
  input.focus();
}

function getVoiceMode() {
  return document.querySelector('input[name="voice-mode"]:checked')?.value || "human";
}

function getTextSource() {
  return document.querySelector('input[name="text-source"]:checked')?.value || "wikipedia";
}

/** Coupe à la fin d’une vraie phrase — jamais de « … » au milieu. */
function clipText(raw, max = 340) {
  let t = String(raw)
    .replace(/\s+/g, " ")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/…+/g, ".")
    .replace(/\.{2,}/g, ".")
    .trim();
  if (!t) return "";

  const chunks = t.match(/[^.!?]+[.!?]+(?:\s+|$)/g) || [];
  const sentences = chunks.map((s) => s.trim()).filter((s) => s.length > 15);
  if (!sentences.length) return "";

  let out = sentences[0];
  if (out.length > max) return ""; // phrase trop longue / bancale → on skip
  if (
    sentences[1] &&
    `${out} ${sentences[1]}`.length <= max
  ) {
    out = `${out} ${sentences[1]}`;
  }
  // Garantir une fin de phrase propre
  out = out.replace(/\s*[.…]+$/u, (m) => (m.includes("!") || m.includes("?") ? m.trim() : "."));
  if (!/[.!?]$/.test(out)) out += ".";
  return out.trim();
}

function isUsableExtract(title, extract) {
  if (!extract || extract.length < 50) return false;
  if (/…|\.\.\./.test(extract)) return false;
  if (!/[.!?]$/.test(extract.trim())) return false;
  if (/peut désigner|homonymie|page d'aide|wikimédia/i.test(extract)) return false;
  if (/^Liste des /i.test(title || "")) return false;
  return true;
}

/**
 * Tire plein de textes d’un coup via l’API MediaWiki (CORS OK, pas de proxy).
 * base: wikipedia ou wikinews.
 */
async function fetchMediaWikiBatch(baseHost, sourceTag, limit = 10) {
  const url =
    `https://${baseHost}/w/api.php?action=query&format=json&origin=*` +
    `&generator=random&grnnamespace=0&prop=extracts&exintro=1&explaintext=1` +
    `&exchars=500&grnlimit=${Math.min(limit, 12)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("mediawiki");
  const data = await res.json();
  const pages = Object.values(data.query?.pages || {});
  return pages
    .map((p) => {
      const title = p.title || sourceTag;
      const text = clipText(p.extract || "");
      return isUsableExtract(title, text)
        ? { text, title, source: sourceTag }
        : null;
    })
    .filter(Boolean);
}

async function fetchInfinitePool(sourceTag, need) {
  const host =
    sourceTag === "actu" ? "fr.wikinews.org" : "fr.wikipedia.org";
  // Wikinews a moins de pages → on complète avec Wikipédia étiqueté actu si besoin
  const collected = [];
  let rounds = 0;
  while (collected.length < need && rounds < 6) {
    rounds += 1;
    try {
      const batch = await fetchMediaWikiBatch(
        host,
        sourceTag,
        Math.max(6, need - collected.length + 2)
      );
      for (const e of batch) {
        if (!collected.some((c) => c.text === e.text)) collected.push(e);
      }
    } catch (_) {
      break;
    }
  }

  // Secours actu : Wikipédia (mêmes APIs fiables) si Wikinews trop pauvre
  if (sourceTag === "actu" && collected.length < need) {
    try {
      const extra = await fetchMediaWikiBatch(
        "fr.wikipedia.org",
        "actu",
        need - collected.length + 4
      );
      for (const e of extra) {
        if (!collected.some((c) => c.text === e.text)) {
          collected.push({
            ...e,
            title: e.title,
            source: "actu",
          });
        }
      }
    } catch (_) {
      /* ignore */
    }
  }

  return collected.slice(0, need);
}

async function buildTextPool(source, n) {
  if (source === "citations") {
    const pool = shuffle(QUOTES).map((q) => ({
      text: q.text,
      title: q.author,
      author: q.author,
      source: "citations",
    }));
    while (pool.length < n) {
      const q = pick(QUOTES);
      pool.push({
        text: q.text,
        title: q.author,
        author: q.author,
        source: "citations",
      });
    }
    return pool.slice(0, n);
  }

  const pool = [];

  if (source === "actu") {
    pool.push(...(await fetchInfinitePool("actu", n + 2)));
  } else if (source === "mix") {
    const nWiki = Math.ceil(n * 0.55);
    const nActu = n - nWiki + 2;
    const [wiki, actu] = await Promise.all([
      fetchInfinitePool("wikipedia", nWiki + 2),
      fetchInfinitePool("actu", nActu),
    ]);
    pool.push(...wiki.slice(0, nWiki), ...actu.slice(0, n - nWiki));
  } else {
    pool.push(...(await fetchInfinitePool("wikipedia", n + 2)));
  }

  // Si pas assez : encore du Wikipédia
  if (pool.length < n) {
    const extra = await fetchInfinitePool("wikipedia", n - pool.length + 3);
    for (const e of extra) {
      if (!pool.some((p) => p.text === e.text)) pool.push(e);
      if (pool.length >= n) break;
    }
  }

  if (!pool.length) {
    throw new Error("Aucun texte chargé — vérifie la connexion.");
  }

  return shuffle(pool).slice(0, n);
}

function sourceLabel(src) {
  if (src === "wikipedia") return "Wikipédia";
  if (src === "actu") return "Actu";
  if (src === "mix") return "Mix";
  if (src === "citations") return "Citation";
  return src;
}

function isCitationsMode() {
  return state.textSource === "citations";
}

/** Vérité pour le vote en mode citations. */
function citationTruth() {
  if (state.mission === "fidele") return "fidele";
  if (state.challenge?.type === "quote-invent") return "invent";
  return "modify"; // tweak ou rewrite
}

function isInventingQuote() {
  return isCitationsMode() && state.challenge?.type === "quote-invent";
}

async function startGame() {
  cleanupMedia();
  const btn = $("#start-game");
  const status = $("#load-status");
  state.voiceMode = getVoiceMode();
  state.textSource = getTextSource();
  state.totalRounds = Number($("#round-count").value);
  state.round = 0;
  state.readerIndex = Math.floor(Math.random() * state.players.length);
  state.scores = Object.fromEntries(state.players.map((p) => [p, 0]));
  state.missionDeck = buildMissionDeck(state.totalRounds);

  btn.disabled = true;
  status.hidden = false;
  status.textContent = isCitationsMode()
    ? "Tirage des citations…"
    : "Tirage de textes (Wikipédia / Wikinews)…";

  try {
    state.textPool = await buildTextPool(state.textSource, state.totalRounds);
  } catch (err) {
    status.textContent =
      "Impossible de charger les textes. Vérifie ta connexion, puis réessaie.";
    btn.disabled = state.players.length < 3;
    return;
  }

  status.hidden = true;
  btn.disabled = state.players.length < 3;
  nextRound();
}

function nextRound() {
  clearInterval(state.timerId);
  cleanupMedia();
  state.round += 1;
  if (state.round > state.totalRounds) {
    endGame();
    return;
  }

  state.readerIndex = (state.readerIndex + 1) % state.players.length;
  const slot = state.missionDeck[state.round - 1] || {
    mission: "impro",
    challenge: "pending",
  };
  state.mission = slot.mission;
  const entry = state.textPool[(state.round - 1) % state.textPool.length];
  if (!entry) {
    endGame();
    return;
  }
  state.textTitle = entry.title || "";
  state.textLabel = sourceLabel(entry.source);
  state.declaredSpoken = "";
  state.quoteOfficial = "";
  state.quoteAuthor = "";

  if (isCitationsMode()) {
    // Citation réelle officielle = texte ENTIER + guillemets
    state.quoteOfficial = withGuillemets(entry.text);
    state.quoteAuthor = entry.author || entry.title || "";
    state.text = state.quoteOfficial;
    state.textTitle = entry.author || entry.title || "";
  } else {
    state.text = entry.text;
  }

  state.challenge =
    slot.mission === "impro"
      ? slot.challenge && slot.challenge !== "pending"
        ? slot.challenge
        : makeChallenge(state.text)
      : null;

  // Inventer = pas de citation à l’écran (mais on garde l’officielle de côté)
  if (
    isCitationsMode() &&
    state.mission === "impro" &&
    state.challenge?.type === "quote-invent"
  ) {
    state.text = "";
    state.quoteAuthor = "";
    state.textTitle = "";
  }

  state.votes = {};
  state.guesses = {};
  state.committed = "";
  state.transcript = "";
  state.interim = "";
  state.sttSuggestions = [];
  state.validatedAdditions = [];
  state.chunks = [];
  state.stopping = false;
  state.wantRecognition = false;

  $("#pass-round").textContent = `Manche ${state.round} / ${state.totalRounds}`;
  $("#pass-name").textContent = state.players[state.readerIndex];
  show("pass");
}

function revealMission() {
  const badge = $("#mission-badge");
  const help = $("#mission-help");
  const card = $("#challenge-card");
  badge.className = "mission-badge " + state.mission;
  const micNote =
    state.voiceMode === "assist"
      ? " Micro = aide à la réécoute seulement."
      : " Mode sans micro.";

  if (state.mission === "fidele") {
    badge.textContent = isCitationsMode()
      ? "Citation exacte (entière)"
      : "Lecture fidèle";
    help.textContent = isCitationsMode()
      ? "Tu as une vraie citation officielle : dis-la EN ENTIER, sans rien changer. À l’écrit elle est entre guillemets « »." +
        micNote
      : "Lis exactement ce qui est écrit. Pas un mot de plus." + micNote;
    card.hidden = true;
  } else {
    const ch = state.challenge;
    if (isCitationsMode()) {
      badge.textContent =
        ch?.type === "quote-invent"
          ? "Inventer une citation"
          : "Modifier la citation";
    } else {
      badge.textContent = "Impro";
    }
    if (ch) {
      card.hidden = false;
      $("#challenge-title").textContent = ch.title;
      $("#challenge-detail").textContent = ch.detail;
      help.textContent = isCitationsMode()
        ? "Les autres votent exacte / modifiée / inventée. Plus tu bluffes, plus tu marques — s’ils te démasquent, eux marquent." +
          micNote
        : "Plus tu ajoutes de mots nouveaux sans qu’on les trouve, plus tu gagnes. Chaque mot cramé = 0 pour toi." +
          micNote;
    } else {
      card.hidden = true;
      help.textContent = isCitationsMode()
        ? "Modifie ou invente sans te faire cramer." + micNote
        : "Ajoute des mots : plus ils passent inaperçus, plus tu marques." + micNote;
    }
  }
  $("#show-text").textContent = isCitationsMode()
    ? state.voiceMode === "assist"
      ? "Afficher la citation & micro"
      : "Afficher la citation"
    : state.voiceMode === "assist"
      ? "Afficher le texte & micro"
      : "Afficher le texte";
  show("mission");
}

function updateLiveTranscript() {
  const el = $("#live-transcript");
  if (!el) return;
  const full = fullTranscript();
  el.textContent =
    full ||
    (state.recording ? "En écoute…" : "Appuie sur « Démarrer » puis parle…");
}

function setRecStatus(text, recording = false) {
  $("#rec-status").textContent = text;
  $("#rec-bar").classList.toggle("recording", recording);
}

function stopTracks() {
  if (state.mediaStream) {
    state.mediaStream.getTracks().forEach((t) => t.stop());
    state.mediaStream = null;
  }
}

function cleanupMedia({ keepAudio = false } = {}) {
  clearInterval(state.timerId);
  state.wantRecognition = false;
  state.recording = false;
  state.stopping = false;

  if (state.recognition) {
    try {
      state.recognition.onresult = null;
      state.recognition.onerror = null;
      state.recognition.onend = null;
      if (typeof state.recognition.abort === "function") state.recognition.abort();
      else state.recognition.stop();
    } catch (_) {}
    state.recognition = null;
  }
  if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
    try {
      state.mediaRecorder.onstop = null;
      state.mediaRecorder.stop();
    } catch (_) {}
  }
  state.mediaRecorder = null;
  stopTracks();

  if (!keepAudio && state.audioUrl) {
    URL.revokeObjectURL(state.audioUrl);
    state.audioUrl = null;
  }
}

function createRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = "fr-FR";
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  rec.onresult = (event) => {
    let finals = "";
    let interim = "";
    for (let i = 0; i < event.results.length; i++) {
      const r = event.results[i];
      const t = r[0]?.transcript || "";
      if (r.isFinal) finals += t + " ";
      else interim += t;
    }
    state.transcript = finals.trim();
    state.interim = interim.trim();
    updateLiveTranscript();
  };

  rec.onerror = (e) => {
    if (["no-speech", "aborted", "audio-capture"].includes(e.error)) return;
    if (e.error === "not-allowed") {
      setRecStatus("Micro bloqué — continue sans STT", false);
      return;
    }
    setRecStatus("STT bancale — brouillon seulement", state.recording);
  };

  rec.onend = () => {
    if (!state.wantRecognition || state.stopping) return;
    const piece = dedupeTranscript(
      [state.transcript, state.interim].filter(Boolean).join(" ")
    );
    if (piece) {
      state.committed = dedupeTranscript(
        [state.committed, piece].filter(Boolean).join(" ")
      );
    }
    state.transcript = "";
    state.interim = "";
    updateLiveTranscript();
    window.setTimeout(() => {
      if (!state.wantRecognition || state.stopping || !state.recognition) return;
      try {
        state.recognition.start();
      } catch (_) {}
    }, 120);
  };

  return rec;
}

async function startRecording() {
  if (state.recording || state.stopping) return;
  const btn = $("#start-recording");
  if (btn) btn.disabled = true;

  state.committed = "";
  state.transcript = "";
  state.interim = "";
  state.chunks = [];
  updateLiveTranscript();

  try {
    state.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
    });
  } catch (_) {
    setRecStatus("Micro refusé — tu pourras arbitrer à l’oreille");
    $("#finish-reading").disabled = false;
    if (btn) btn.disabled = false;
    return;
  }

  state.recMime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "audio/mp4";

  try {
    state.mediaRecorder = new MediaRecorder(state.mediaStream, {
      mimeType: state.recMime,
    });
  } catch (_) {
    state.mediaRecorder = new MediaRecorder(state.mediaStream);
    state.recMime = state.mediaRecorder.mimeType || "audio/webm";
  }

  state.mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) state.chunks.push(e.data);
  };
  state.mediaRecorder.start(400);

  state.wantRecognition = true;
  state.recognition = createRecognition();
  if (state.recognition) {
    try {
      state.recognition.start();
      setRecStatus("REC (aide)…", true);
    } catch (_) {
      setRecStatus("REC sans STT", true);
    }
  } else {
    setRecStatus("REC sans STT (Chrome conseillé)", true);
  }

  state.recording = true;
  $("#finish-reading").disabled = false;
}

function renderReadActions() {
  const box = $("#read-actions");
  const live = $("#live-box");
  if (state.voiceMode === "assist") {
    live.style.display = "";
    box.innerHTML = `
      <button class="btn btn-secondary" id="start-recording">Démarrer l’enregistrement</button>
      <button class="btn btn-primary" id="finish-reading" disabled>J’ai fini</button>
    `;
    $("#start-recording").addEventListener("click", startRecording);
    $("#finish-reading").addEventListener("click", stopReading);
    setRecStatus("Micro prêt (aide seulement)", false);
  } else {
    live.style.display = "none";
    box.innerHTML = `
      <button class="btn btn-primary" id="finish-reading">J’ai fini de lire</button>
    `;
    $("#finish-reading").addEventListener("click", stopReading);
    setRecStatus("Mode sans micro", false);
  }
}

function showText() {
  cleanupMedia({ keepAudio: false });
  const reader = state.players[state.readerIndex];
  $("#read-reader").textContent = `Lecteur : ${reader}`;
  const pill = $("#text-source-pill");
  if (pill) pill.textContent = state.textLabel || "";

  fillTextTitle($("#song-title"));
  fillQuoteAuthor($("#quote-author"));

  const script = $("#script-text");
  const inventing =
    isCitationsMode() && state.challenge?.type === "quote-invent";
  if (inventing) {
    script.textContent =
      "Aucune citation — invente une maxime complète entre « », puis un auteur fictif (prénom + nom).";
    script.classList.add("quote", "quote-placeholder");
  } else {
    script.textContent = state.text;
    script.classList.toggle("quote", isCitationsMode());
    script.classList.remove("quote-placeholder");
  }
  $("#read-whisper").textContent =
    state.mission === "fidele"
      ? isCitationsMode()
        ? "Rappel secret : citation officielle EN ENTIER, rien changer."
        : "Rappel secret : reste fidèle au texte."
      : isCitationsMode()
        ? inventing
          ? "Rappel secret : invente tout. Ensuite tu écriras ta version entre guillemets."
          : "Rappel secret : modifie selon le défi. Ensuite tu écriras ta version entre guillemets."
        : "Rappel secret : invente sans te faire griller. Ensuite tu écriras ta version.";

  const inline = $("#challenge-inline");
  if (state.mission === "impro" && state.challenge) {
    inline.hidden = false;
    inline.textContent = `Défi : ${state.challenge.title} — ${state.challenge.detail}`;
  } else {
    inline.hidden = true;
    inline.textContent = "";
  }

  renderReadActions();
  clearInterval(state.timerId);
  show("read");
}

/** Affiche le titre d’article (hors citations : l’auteur est sous la citation). */
function fillTextTitle(titleEl) {
  if (!titleEl) return;
  if (isCitationsMode()) {
    titleEl.hidden = true;
    titleEl.textContent = "";
    return;
  }
  if (state.textTitle) {
    titleEl.hidden = false;
    titleEl.textContent = state.textTitle;
  } else {
    titleEl.hidden = true;
    titleEl.textContent = "";
  }
}

/** Affiche l’auteur sous la citation (vraies citations uniquement). */
function fillQuoteAuthor(el) {
  if (!el) return;
  if (isCitationsMode() && state.quoteAuthor) {
    el.hidden = false;
    el.textContent = `— ${state.quoteAuthor}`;
  } else {
    el.hidden = true;
    el.textContent = "";
  }
}

/** Diff simple pour suggestions d’arbitrage (origine ↔ version déclarée). */
function suggestChangesFromDeclared(original, spoken) {
  const o = normalizeTokens(
    isCitationsMode() ? stripGuillemets(original) : original
  );
  const s = normalizeTokens(
    isCitationsMode() ? stripGuillemets(spoken) : spoken
  );
  const suggestions = [];

  const oCount = {};
  o.forEach((w) => {
    oCount[w] = (oCount[w] || 0) + 1;
  });
  const sCount = {};
  s.forEach((w) => {
    sCount[w] = (sCount[w] || 0) + 1;
  });

  for (const w of Object.keys(sCount)) {
    const extra = sCount[w] - (oCount[w] || 0);
    if (extra > 0) suggestions.push(`+${w}`);
  }
  for (const w of Object.keys(oCount)) {
    const missing = oCount[w] - (sCount[w] || 0);
    if (missing > 0) suggestions.push(`-${w}`);
  }

  // unique
  return [...new Set(suggestions)].slice(0, 24);
}

function goToDeclareScreen() {
  // Brouillon micro éventuel
  state.committed = fullTranscript();
  state.transcript = "";
  state.interim = "";
  const sttDraft = dedupeTranscript(state.committed);

  fillTextTitle($("#declare-song-title"));
  fillQuoteAuthor($("#declare-quote-author"));

  if (isInventingQuote()) {
    $("#orig-preview").textContent =
      "(Aucune citation — invente maxime « … » + auteur fictif prénom + nom)";
    $("#transcript-edit").value =
      state.declaredSpoken || "«  »\n— Prénom Nom";
  } else {
    $("#orig-preview").textContent = state.text;
    // Fidèle ou modif : préremplir la citation OFFICIELLE ENTIÈRE (guillemets)
    $("#transcript-edit").value = state.declaredSpoken || state.text;
  }

  if (isCitationsMode() && state.mission === "fidele") {
    const hint = $("#screen-transcript .warn-hint");
    if (hint) {
      hint.textContent =
        "Citation officielle : elle doit rester ENTIÈRE entre guillemets « ». Ne change rien.";
    }
  }

  const sttBtn = $("#use-stt-draft");
  if (sttDraft && sttDraft.length > 10) {
    sttBtn.hidden = false;
    sttBtn.onclick = () => {
      $("#transcript-edit").value = sttDraft;
    };
  } else {
    sttBtn.hidden = true;
  }

  const audio = $("#playback");
  if (state.audioUrl) {
    audio.src = state.audioUrl;
    audio.classList.remove("hidden");
  } else {
    audio.removeAttribute("src");
    audio.classList.add("hidden");
  }
  show("transcript");
}

function afterReadingDone() {
  goToDeclareScreen();
}

function stopReading() {
  if (state.stopping) return;
  clearInterval(state.timerId);

  if (state.voiceMode === "human") {
    state.stopping = false;
    afterReadingDone();
    return;
  }

  state.stopping = true;
  state.wantRecognition = false;
  state.recording = false;
  const finishBtn = $("#finish-reading");
  if (finishBtn) finishBtn.disabled = true;

  state.committed = fullTranscript();
  state.transcript = "";
  state.interim = "";

  if (state.recognition) {
    try {
      state.recognition.onend = null;
      state.recognition.onresult = null;
      state.recognition.stop();
    } catch (_) {}
    state.recognition = null;
  }

  let done = false;
  const finalize = () => {
    if (done) return;
    done = true;
    if (state.chunks.length) {
      const blob = new Blob(state.chunks, { type: state.recMime });
      if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
      state.audioUrl = URL.createObjectURL(blob);
    }
    stopTracks();
    state.mediaRecorder = null;
    state.stopping = false;
    afterReadingDone();
  };

  if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
    state.mediaRecorder.onstop = finalize;
    try {
      if (typeof state.mediaRecorder.requestData === "function") {
        state.mediaRecorder.requestData();
      }
      state.mediaRecorder.stop();
    } catch (_) {
      finalize();
    }
    window.setTimeout(finalize, 1200);
  } else {
    finalize();
  }
}

function startVote() {
  state.declaredSpoken = ($("#transcript-edit").value || "").trim();
  state.transcript = dedupeTranscript(state.declaredSpoken);
  if (!state.declaredSpoken) {
    alert("Écris d’abord ce que tu as vraiment dit.");
    return;
  }

  const reader = state.players[state.readerIndex];
  $("#vote-round").textContent = `Manche ${state.round} / ${state.totalRounds}`;
  $("#vote-reader-name").textContent = reader;
  $("#vote-hint").innerHTML = isCitationsMode()
    ? `<span id="vote-reader-name">${escapeHtml(reader)}</span> : citation exacte, modifiée, ou inventée ?`
    : `<span id="vote-reader-name">${escapeHtml(reader)}</span> a-t-il·elle lu le texte… ou inventé des mots ?`;

  const voters = state.players.filter((p) => p !== reader);
  $("#vote-grid").innerHTML = voters
    .map((name, i) => {
      if (isCitationsMode()) {
        return `
      <div class="vote-card">
        <strong>${escapeHtml(name)}</strong>
        <div class="vote-choices">
          <label><input type="radio" name="vote-${i}" value="fidele" /> Exacte (entière)</label>
          <label><input type="radio" name="vote-${i}" value="modify" /> Modifiée</label>
          <label><input type="radio" name="vote-${i}" value="invent" /> Inventée</label>
        </div>
      </div>`;
      }
      return `
      <div class="vote-card">
        <strong>${escapeHtml(name)}</strong>
        <div class="vote-choices">
          <label><input type="radio" name="vote-${i}" value="fidele" /> Lit vraiment</label>
          <label><input type="radio" name="vote-${i}" value="impro" /> Invente</label>
        </div>
      </div>`;
    })
    .join("");

  $("#submit-votes").disabled = true;
  show("vote");
}

function checkVotesReady() {
  const reader = state.players[state.readerIndex];
  const voters = state.players.filter((p) => p !== reader);
  const ready = voters.every((_, i) =>
    document.querySelector(`input[name="vote-${i}"]:checked`)
  );
  $("#submit-votes").disabled = !ready;
}

function startHunt() {
  const reader = state.players[state.readerIndex];
  const voters = state.players.filter((p) => p !== reader);

  voters.forEach((name, i) => {
    state.votes[name] = document.querySelector(
      `input[name="vote-${i}"]:checked`
    ).value;
  });

  if (isCitationsMode()) {
    $("#hunt-title").textContent = "Qu’est-ce qui a changé / été inventé ?";
    $("#hunt-hint").textContent =
      "Notez les écarts avec la citation officielle, ou la fausse maxime entendue (virgules).";
  } else {
    $("#hunt-title").textContent = "Quels mots ont été rajoutés ?";
    $("#hunt-hint").textContent =
      "Notez les mots, locutions (2–3 mots) ou le contraire entendu (négation), séparés par des virgules.";
  }

  const voteLabel = (v) => {
    if (!isCitationsMode()) {
      return v === "impro" ? "invente" : "lit vraiment";
    }
    if (v === "fidele") return "exacte";
    if (v === "modify") return "modifiée";
    if (v === "invent") return "inventée";
    return v;
  };

  $("#hunt-grid").innerHTML = voters
    .map(
      (name, i) => `
      <div class="hunt-card">
        <strong>${escapeHtml(name)}</strong>
        <p class="hunt-vote">Vote : ${voteLabel(state.votes[name])}</p>
        <label class="field">
          <span>${
            isCitationsMode()
              ? "Écarts / invention (virgules)"
              : "Mots / phrases ajoutés (virgules)"
          }</span>
          <input type="text" id="hunt-${i}" placeholder="${
            isCitationsMode()
              ? "ex. libre→esclave, fausse maxime…"
              : "ex. dragon rose, clairement"
          }" autocomplete="off" />
        </label>
      </div>`
    )
    .join("");

  show("hunt");
}

function getValidatedFromTextarea() {
  return parseList($("#validated-additions").value);
}

function syncValidatedField(list) {
  $("#validated-additions").value = list.join(", ");
}

function toggleSuggestion(word) {
  const list = getValidatedFromTextarea();
  const key = word.trim().toLowerCase();
  const idx = list.findIndex((p) => p.trim().toLowerCase() === key);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(word);
  syncValidatedField(list);
  renderSuggestionChips();
}

function renderSuggestionChips() {
  const wrap = $("#stt-suggestions");
  const spoken = state.declaredSpoken || state.transcript || "";
  const diffs = suggestChangesFromDeclared(state.text, spoken);

  if (!diffs.length) {
    wrap.innerHTML = `<p class="hint">Aucun écart auto détecté entre origine et version déclarée — ajoutez à la main si besoin (oreille + réécoute).</p>`;
    return;
  }

  const current = new Set(
    getValidatedFromTextarea().map((p) => p.trim().toLowerCase())
  );

  wrap.innerHTML = `
    <p class="live-label">Écarts auto (origine ↔ version déclarée) — cliquer pour valider / retirer</p>
    <div class="chip-row">
      ${diffs
        .map((w) => {
          const on = current.has(w.toLowerCase());
          return `<button type="button" class="suggest-chip ${on ? "on" : ""}" data-word="${escapeHtml(w)}">${escapeHtml(w)}</button>`;
        })
        .join("")}
    </div>
  `;
}

function startValidate() {
  const reader = state.players[state.readerIndex];
  const voters = state.players.filter((p) => p !== reader);
  voters.forEach((name, i) => {
    state.guesses[name] = $(`#hunt-${i}`)?.value || "";
  });

  fillTextTitle($("#validate-song-title"));
  fillQuoteAuthor($("#validate-quote-author"));

  $("#val-original").textContent = state.text;
  const spokenWrap = $("#val-spoken-wrap");
  const spoken = state.declaredSpoken || state.transcript || "";
  spokenWrap.style.display = "";
  $("#val-spoken").textContent = spoken || "(vide)";

  // Suggestions = diff origine ↔ version déclarée + pistes des détectives
  const fromDiff = suggestChangesFromDeclared(state.text, spoken);
  state.sttSuggestions = fromDiff.map((s) => s.replace(/^[+\-~]/, ""));

  const audio = $("#playback-validate");
  if (state.audioUrl) {
    audio.src = state.audioUrl;
    audio.classList.remove("hidden");
  } else {
    audio.removeAttribute("src");
    audio.classList.add("hidden");
  }

  const seed = [];
  const seen = new Set();
  fromDiff.forEach((p) => {
    if (!seen.has(p)) {
      seen.add(p);
      seed.push(p);
    }
  });
  Object.values(state.guesses).forEach((g) => {
    parseList(g).forEach((p) => {
      if (!seen.has(p)) {
        seen.add(p);
        seed.push(p);
      }
    });
  });
  syncValidatedField(seed);

  if (isCitationsMode()) {
    const truth = citationTruth();
    $("#validate-mission-hint").textContent =
      truth === "fidele"
        ? "Mission : CITATION EXACTE ENTIÈRE (guillemets). Liste normalement vide."
        : truth === "invent"
          ? "Mission : CITATION INVENTÉE. Listez la fausse maxime / les éléments inventés."
          : "Mission : CITATION MODIFIÉE. Listez les écarts avec l’officielle entière.";
    $("#validated-additions").placeholder =
      "ex. libre→esclave, « fausse maxime complète »";
  } else {
    $("#validate-mission-hint").textContent =
      state.mission === "impro"
        ? "Mission : IMPRO. Dans la liste, mettez surtout le(s) mot(s) inventé(s) / de remplacement."
        : "Mission : FIDÈLE. Liste normalement vide.";
    $("#validated-additions").placeholder =
      "ex. violet, dragon rose, soudainement";
  }

  const arb = $("#challenge-arbiter");
  const ch = state.challenge;
  if (state.mission === "impro" && ch) {
    arb.hidden = false;
    $("#challenge-arbiter-text").textContent = `${ch.title} — ${ch.detail}`;
    $("#challenge-ok").checked = false;
    if (ch.type === "replace") {
      const letterBit = ch.target?.letter
        ? ch.target.letterPos === "end"
          ? `, finissant par « ${ch.target.letter} »`
          : `, commençant par « ${ch.target.letter} »`
        : "";
      const orig = ch.target?.original || "?";
      $("#challenge-ok-label").textContent =
        `Défi OK : « ${orig} » modifié → 1 mot ou locution 2–3 mots, autre famille${letterBit}, sans prénom`;
    } else if (ch.type === "negate") {
      $("#challenge-ok-label").textContent =
        "Défi OK : une info du texte a bien été inversée / niée (le contraire a été dit)";
    } else if (ch.type === "quote-tweak") {
      $("#challenge-ok-label").textContent =
        "Défi OK : quelques mots ont bien été modifiés (citation encore reconnaissable)";
      $("#challenge-ok").checked = seed.length > 0;
    } else if (ch.type === "quote-rewrite") {
      $("#challenge-ok-label").textContent =
        "Défi OK : citation largement modifiée (presque tout changé)";
      $("#challenge-ok").checked = seed.length > 0;
    } else if (ch.type === "quote-invent") {
      $("#challenge-ok-label").textContent =
        "Défi OK : maxime inventée entre « » + auteur fictif (prénom + nom), pas une vraie personne";
      $("#challenge-ok").checked = seed.length > 0;
    } else if (ch.type === "letter") {
      const L = ch.target?.letter || ch.target;
      $("#challenge-ok-label").textContent =
        `Défi OK : 1 mot ou locution 2–3 mots en « ${L}… » (prénom = invalide)`;
    } else if (ch.type === "volume" || ch.type === "free") {
      $("#challenge-ok-label").textContent =
        "Défi OK : il a bien ajouté des mots inventés (plus il y en a dans la liste, mieux c’est pour lui s’ils ne sont pas trouvés)";
      $("#challenge-ok").checked = seed.length > 0;
    } else {
      $("#challenge-ok-label").textContent =
        "Défi OK : la contrainte a été respectée";
    }
  } else {
    arb.hidden = true;
  }

  renderSuggestionChips();
  show("validate");
}

/**
 * Score clair :
 * - Détectives : vote + inventions trouvées
 * - Inventeur : inventions non cramées + défi réussi + furtivité
 */
function confirmValidateAndScore() {
  const reader = state.players[state.readerIndex];
  const voters = state.players.filter((p) => p !== reader);
  const validated = getValidatedFromTextarea();
  state.validatedAdditions = validated;

  const deltas = [];
  let fooled = 0;
  const caughtNorm = new Set();
  const finderCount = {}; // normalized phrase -> how many detectives found it

  const truth = isCitationsMode() ? citationTruth() : state.mission;

  // Pass 1 : votes + hits détectives
  const voterResults = voters.map((name) => {
    const voteOk = state.votes[name] === truth;
    let pts = 0;
    const bits = [];

    if (voteOk) {
      pts += 2;
      bits.push("+2 vote juste");
    } else {
      fooled += 1;
      bits.push("vote faux");
    }

    let hits = [];
    if (state.mission === "impro" && validated.length) {
      const res = guessHitsAgainstValidated(
        state.guesses[name],
        validated
      );
      hits = res.hits;
      res.caughtNormalized.forEach((c) => {
        caughtNorm.add(c);
        finderCount[c] = (finderCount[c] || 0) + 1;
      });
      if (hits.length) {
        const bonus = hits.length * 3;
        pts += bonus;
        bits.push(`+${bonus} invention(s) trouvée(s)`);
      } else if (state.guesses[name].trim()) {
        bits.push("piste ratée");
      }
    }

    return { name, pts, bits, hits };
  });

  voterResults.forEach((r) => {
    state.scores[r.name] += r.pts;
    deltas.push({
      name: r.name,
      text: r.pts ? `+${r.pts} — ${r.bits.join(" · ")}` : r.bits.join(" · "),
      plus: r.pts > 0,
    });
  });

  if (state.mission === "impro") {
    const validatedNorm = listToNormalizedPhrases(validated);
    const hidden = validatedNorm.filter((v) => !caughtNorm.has(v));
    const caught = validatedNorm.filter((v) => caughtNorm.has(v));
    const challengeOk = Boolean($("#challenge-ok")?.checked);
    const ch = state.challenge;
    const majorityFooled = fooled > voters.length / 2;

    let rPts = 0;
    const parts = [];

    // Cœur du jeu : +4 par mot nouveau NON trouvé (volume × furtivité)
    if (hidden.length) {
      const hidePts = hidden.length * 4;
      rPts += hidePts;
      parts.push(`+${hidePts} (${hidden.length} mot(s) non cramé(s) ×4)`);
    }

    // Palier volume furtif
    if (hidden.length >= 5) {
      rPts += 6;
      parts.push("+6 palier 5+ mots invisibles");
    } else if (hidden.length >= 3) {
      rPts += 3;
      parts.push("+3 palier 3+ mots invisibles");
    }

    // Mots cramés : 0 pour l’inventeur (les détectives ont déjà marqué)
    if (caught.length) {
      parts.push(`${caught.length} cramé(s) → 0`);
    }

    if (ch && challengeOk) {
      const defiPts = ch.type === "volume" ? 2 : 4;
      rPts += defiPts;
      parts.push(`+${defiPts} défi réussi`);
      if (majorityFooled) {
        rPts += 4;
        parts.push("+4 majorité trompée");
      }
    } else if (ch && !challengeOk) {
      parts.push("défi raté");
    }

    if (!validated.length && !challengeOk) {
      deltas.push({
        name: reader,
        text: "0 — rien validé / défi non réussi",
        plus: false,
      });
    } else {
      state.scores[reader] += rPts;
      deltas.push({
        name: reader,
        text: `+${rPts} — ${parts.join(" · ") || "base"}`,
        plus: rPts > 0,
      });
    }
  } else {
    const bonus = fooled * 2;
    if (bonus > 0) {
      state.scores[reader] += bonus;
      deltas.push({
        name: reader,
        text: `+${bonus} — lecture crédible (${fooled} ont cru à une impro)`,
        plus: true,
      });
    } else {
      deltas.push({
        name: reader,
        text: "0 — tout le monde a vu que c’était fidèle",
        plus: false,
      });
    }
  }

  $("#reveal-title").textContent = (() => {
    if (!isCitationsMode()) {
      return state.mission === "fidele"
        ? `${reader} lisait vraiment`
        : `${reader} inventait des mots`;
    }
    const t = citationTruth();
    if (t === "fidele") return `${reader} : citation exacte (entière)`;
    if (t === "invent") return `${reader} : citation inventée`;
    return `${reader} : citation modifiée`;
  })();

  const chLine =
    state.mission === "impro" && state.challenge
      ? ` Défi : ${state.challenge.title}${
          $("#challenge-ok")?.checked ? " ✓" : " ✗"
        }.`
      : "";
  $("#reveal-detail").textContent =
    "Score basé sur l’arbitrage humain (liste + défi), pas sur la STT." + chLine;

  const audio = $("#playback-reveal");
  if (state.audioUrl) {
    audio.src = state.audioUrl;
    audio.classList.remove("hidden");
  } else {
    audio.removeAttribute("src");
    audio.classList.add("hidden");
  }

  $("#added-line").innerHTML = validated.length
    ? `<strong>Ajouts validés par le groupe (${validated.length}) :</strong> ${escapeHtml(validated.join(", "))}`
    : "<strong>Aucun ajout validé</strong> par le groupe.";

  $("#score-delta").innerHTML = deltas
    .map(
      (d) =>
        `<li><span>${escapeHtml(d.name)}</span><span class="${d.plus ? "plus" : ""}">${escapeHtml(d.text)}</span></li>`
    )
    .join("");

  $("#scoreboard-mini").innerHTML = state.players
    .map((p) => `<span class="chip">${escapeHtml(p)} · ${state.scores[p]}</span>`)
    .join("");

  $("#next-round").textContent =
    state.round >= state.totalRounds ? "Voir le classement" : "Manche suivante";

  show("reveal");
}

function endGame() {
  cleanupMedia();
  const ranked = [...state.players].sort(
    (a, b) => state.scores[b] - state.scores[a]
  );
  $("#final-scores").innerHTML = ranked
    .map(
      (p, i) =>
        `<li><span>${i + 1}. ${escapeHtml(p)}</span><span class="pts">${state.scores[p]} pts</span></li>`
    )
    .join("");
  show("end");
}

function wireNav() {
  $$("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => show(btn.dataset.go));
  });

  $("#add-player").addEventListener("click", addPlayer);
  $("#player-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addPlayer();
    }
  });

  $("#player-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove]");
    if (!btn) return;
    state.players.splice(Number(btn.dataset.remove), 1);
    renderPlayers();
  });

  $("#start-game").addEventListener("click", startGame);
  $("#reveal-mission").addEventListener("click", revealMission);
  $("#show-text").addEventListener("click", showText);
  $("#to-vote").addEventListener("click", startVote);
  $("#vote-grid").addEventListener("change", checkVotesReady);
  $("#submit-votes").addEventListener("click", startHunt);
  $("#submit-hunt").addEventListener("click", startValidate);
  $("#stt-suggestions").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-word]");
    if (!chip) return;
    toggleSuggestion(chip.dataset.word);
  });
  $("#validated-additions").addEventListener("input", renderSuggestionChips);
  $("#confirm-validate").addEventListener("click", confirmValidateAndScore);
  $("#next-round").addEventListener("click", nextRound);
  $("#replay").addEventListener("click", () => show("setup"));
}

wireNav();
renderPlayers();
