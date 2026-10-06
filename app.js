const TEXTS = [
  "Ce matin, le facteur a livré trois lettres, un colis mystérieux et une plante qui semblait déjà fanée. Personne n’a osé ouvrir le colis avant le déjeuner.",
  "Dans le village, la boulangère affirme que son pain chante légèrement quand il refroidit. Les habitants font la queue dès six heures pour vérifier la rumeur.",
  "Le guide du musée a chuchoté que la salle 12 change de température selon les visiteurs. Les thermomètres, eux, restent obstinément normaux.",
  "Après la pluie, les pavés de la rue basse reflétaient des couleurs que personne ne savait nommer. Un enfant a dit « caramel électrique » et tout le monde a acquiescé.",
  "Le train de 18h42 est arrivé avec neuf minutes d’avance, ce qui a créé une petite panique polie sur le quai. Les annonces ont nié l’événement pendant vingt minutes.",
  "Au marché, une vendeuse proposait des pommes « qui aident à se souvenir des rêves ». Elle refusait de préciser si c’était une blague ou une garantie.",
  "La bibliothèque municipale a installé un fauteuil réservé aux conversations silencieuses. Deux inconnus s’y croisent chaque mardi sans jamais échanger un mot.",
  "Sur la colline, le phare clignote en rythme impair depuis jeudi. Les pêcheurs disent que c’est un signal pour les goélands, pas pour les bateaux.",
  "Le professeur a demandé de décrire une émotion sans utiliser le mot émotion. La moitié de la classe a parlé de chaussettes mouillées et de portes qui grincent.",
  "Dans l’immeuble, l’ascenseur s’arrête parfois entre deux étages pour « réfléchir ». Le syndic nie, mais les habitants chronomètrent les pauses.",
  "La recette indiquait d’ajouter une pincée de patience et deux cuillères de doute. Le gâteau était correct, mais un peu trop pensif.",
  "Au zoo, un panneau explique que les loutres jugent les visiteurs selon la qualité de leurs chaussures. Personne ne sait qui a écrit le panneau.",
  "Le journal local a publié une météo poétique : ciel en velours, vent de souvenirs, averses possibles d’idées fixes. Les agriculteurs ont demandé une version chiffrée.",
  "Une clé oubliée sur le banc du parc a disparu puis réapparu avec une étiquette : « Merci pour la confiance ». Le propriétaire n’a jamais trouvé à qui dire merci.",
  "Pendant la réunion, quelqu’un a proposé de remplacer les mots « urgent » par « vibrant ». L’ambiance est devenue étrangement motivée.",
  "Le chat du voisin traverse toujours le jardin en diagonale exacte. Les géomètres amateurs y voient un message, les autres y voient un chat.",
  "À la piscine, le maître-nageur compte les longueurs à voix haute en inventant des nombres. Les nageurs avancent quand même, par principe.",
  "La carte du restaurant proposait un dessert nommé « presque rien ». Il était excellent, et exactement comme annoncé.",
];

const state = {
  players: [],
  scores: {},
  totalRounds: 6,
  round: 0,
  readerIndex: 0,
  mission: null, // 'fidele' | 'impro'
  text: "",
  votes: {},
  timerId: null,
  secondsLeft: 45,
};

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

function renderPlayers() {
  const list = $("#player-list");
  list.innerHTML = state.players
    .map(
      (name, i) =>
        `<li>${escapeHtml(name)} <button type="button" aria-label="Retirer" data-remove="${i}">×</button></li>`
    )
    .join("");
  $("#start-game").disabled = state.players.length < 3;
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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

function startGame() {
  state.totalRounds = Number($("#round-count").value);
  state.round = 0;
  state.readerIndex = Math.floor(Math.random() * state.players.length);
  state.scores = Object.fromEntries(state.players.map((p) => [p, 0]));
  state._texts = shuffle(TEXTS);
  nextRound();
}

function nextRound() {
  clearInterval(state.timerId);
  state.round += 1;
  if (state.round > state.totalRounds) {
    endGame();
    return;
  }

  state.readerIndex = (state.readerIndex + 1) % state.players.length;
  state.mission = Math.random() < 0.5 ? "fidele" : "impro";
  state.text = state._texts[(state.round - 1) % state._texts.length];
  state.votes = {};

  const reader = state.players[state.readerIndex];
  $("#pass-round").textContent = `Manche ${state.round} / ${state.totalRounds}`;
  $("#pass-title").textContent = "Passez l’écran à";
  $("#pass-name").textContent = reader;
  show("pass");
}

function revealMission() {
  const badge = $("#mission-badge");
  const help = $("#mission-help");
  badge.className = "mission-badge " + state.mission;

  if (state.mission === "fidele") {
    badge.textContent = "Lecture fidèle";
    help.textContent =
      "Lis exactement ce qui est écrit. Pas un mot de plus, pas un mot de moins. Reste naturel.";
  } else {
    badge.textContent = "Impro — invente";
    help.textContent =
      "Fais semblant de lire… mais rajoute des mots, des détails, des inventions. Dissimule bien : tu dois paraître crédible.";
  }
  show("mission");
}

function showText() {
  const reader = state.players[state.readerIndex];
  $("#read-reader").textContent = `Lecteur : ${reader}`;
  $("#script-text").textContent = state.text;
  $("#read-whisper").textContent =
    state.mission === "fidele"
      ? "Rappel secret : reste fidèle au texte."
      : "Rappel secret : invente sans te faire griller.";

  state.secondsLeft = 45;
  updateTimer();
  clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    state.secondsLeft -= 1;
    updateTimer();
    if (state.secondsLeft <= 0) {
      clearInterval(state.timerId);
      startVote();
    }
  }, 1000);

  show("read");
}

function updateTimer() {
  const m = Math.floor(state.secondsLeft / 60);
  const s = String(state.secondsLeft % 60).padStart(2, "0");
  const el = $("#timer");
  el.textContent = `${m}:${s}`;
  el.classList.toggle("urgent", state.secondsLeft <= 10);
}

function startVote() {
  clearInterval(state.timerId);
  const reader = state.players[state.readerIndex];
  $("#vote-round").textContent = `Manche ${state.round} / ${state.totalRounds}`;
  $("#vote-reader-name").textContent = reader;

  const voters = state.players.filter((p) => p !== reader);
  const grid = $("#vote-grid");
  grid.innerHTML = voters
    .map(
      (name, i) => `
      <div class="vote-card" data-voter-index="${i}">
        <strong>${escapeHtml(name)}</strong>
        <div class="vote-choices">
          <label><input type="radio" name="vote-${i}" value="fidele" /> Lit vraiment</label>
          <label><input type="radio" name="vote-${i}" value="impro" /> Invente</label>
        </div>
      </div>`
    )
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

function submitVotes() {
  const reader = state.players[state.readerIndex];
  const voters = state.players.filter((p) => p !== reader);
  const deltas = [];

  let fooled = 0;
  voters.forEach((name, i) => {
    const choice = document.querySelector(
      `input[name="vote-${i}"]:checked`
    ).value;
    state.votes[name] = choice;
    const correct = choice === state.mission;
    if (correct) {
      state.scores[name] += 2;
      deltas.push({ name, text: "+2 (bon flair)", plus: true });
    } else {
      deltas.push({ name, text: "0 (raté)", plus: false });
      fooled += 1;
    }
  });

  if (state.mission === "impro") {
    const bonus = fooled * 2;
    if (bonus > 0) {
      state.scores[reader] += bonus;
      deltas.push({
        name: reader,
        text: `+${bonus} (bluff réussi)`,
        plus: true,
      });
    } else {
      deltas.push({
        name: reader,
        text: "0 (tout le monde a vu l’impro)",
        plus: false,
      });
    }
  } else {
    const bonus = fooled;
    if (bonus > 0) {
      state.scores[reader] += bonus;
      deltas.push({
        name: reader,
        text: `+${bonus} (crédibilité naturelle)`,
        plus: true,
      });
    } else {
      deltas.push({
        name: reader,
        text: "0 (lecture trop « évidente » ?)",
        plus: false,
      });
    }
  }

  const title =
    state.mission === "fidele"
      ? `${reader} lisait vraiment`
      : `${reader} inventait des mots`;

  $("#reveal-title").textContent = title;
  $("#reveal-detail").textContent =
    state.mission === "fidele"
      ? "Mission : lecture fidèle. Le texte à l’écran devait être suivi à la lettre."
      : "Mission : impro & dissimulation. Des mots ont été inventés ou rajoutés.";

  $("#score-delta").innerHTML = deltas
    .map(
      (d) =>
        `<li><span>${escapeHtml(d.name)}</span><span class="${d.plus ? "plus" : ""}">${escapeHtml(d.text)}</span></li>`
    )
    .join("");

  $("#scoreboard-mini").innerHTML = state.players
    .map((p) => `<span class="chip">${escapeHtml(p)} · ${state.scores[p]}</span>`)
    .join("");

  const nextBtn = $("#next-round");
  nextBtn.textContent =
    state.round >= state.totalRounds ? "Voir le classement" : "Manche suivante";

  show("reveal");
}

function endGame() {
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
  $("#finish-reading").addEventListener("click", startVote);
  $("#vote-grid").addEventListener("change", checkVotesReady);
  $("#submit-votes").addEventListener("click", submitVotes);
  $("#next-round").addEventListener("click", nextRound);
  $("#replay").addEventListener("click", () => {
    show("setup");
  });
}

wireNav();
renderPlayers();
