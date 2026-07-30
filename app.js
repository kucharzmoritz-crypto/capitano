(() => {
  "use strict";

  const cfg = window.WAHL_CONFIG;
  const KEY_TOKEN = "wahl.voterToken";
  const KEY_VOTED = "wahl.hasVoted";
  const KEY_LOCAL_VOTES = "wahl.localVotes";
  const KEY_GATE = "wahl.gatePassed";

  const el = {
    title: document.getElementById("title"),
    subtitle: document.getElementById("subtitle"),
    gate: document.getElementById("gate"),
    gateForm: document.getElementById("gate-form"),
    gateInput: document.getElementById("gate-input"),
    gateError: document.getElementById("gate-error"),
    vote: document.getElementById("vote"),
    voteHint: document.getElementById("vote-hint"),
    candidates: document.getElementById("candidates"),
    submit: document.getElementById("submit"),
    voteError: document.getElementById("vote-error"),
    results: document.getElementById("results"),
    bars: document.getElementById("bars"),
    total: document.getElementById("total"),
    done: document.getElementById("done"),
    refresh: document.getElementById("refresh"),
    modeBadge: document.getElementById("mode-badge"),
  };

  const selected = new Set();
  let refreshTimer = null;

  const maxVotes = Math.max(1, cfg.VOTES_PER_PERSON || 1);

  /* ------------------------------------------------------------------ *
   * Hilfsfunktionen
   * ------------------------------------------------------------------ */

  function voterToken() {
    let token = localStorage.getItem(KEY_TOKEN);
    if (!token) {
      token = crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()) + Math.random().toString(36).slice(2);
      localStorage.setItem(KEY_TOKEN, token);
    }
    return token;
  }

  function hasVoted() {
    return localStorage.getItem(KEY_VOTED) === "1";
  }

  function markVoted() {
    localStorage.setItem(KEY_VOTED, "1");
  }

  function initials(name) {
    return name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  /* ------------------------------------------------------------------ *
   * Speicher: lokal (nur zum Testen)
   * ------------------------------------------------------------------ */

  const localStore = {
    async submit(candidates) {
      const votes = JSON.parse(localStorage.getItem(KEY_LOCAL_VOTES) || "{}");
      for (const candidate of candidates) {
        votes[candidate] = (votes[candidate] || 0) + 1;
      }
      localStorage.setItem(KEY_LOCAL_VOTES, JSON.stringify(votes));
    },
    async results() {
      return JSON.parse(localStorage.getItem(KEY_LOCAL_VOTES) || "{}");
    },
  };

  /* ------------------------------------------------------------------ *
   * Speicher: Supabase / PostgreSQL
   * ------------------------------------------------------------------ */

  const supabaseStore = {
    headers() {
      return {
        "Content-Type": "application/json",
        apikey: cfg.SUPABASE_ANON_KEY,
        Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY,
      };
    },

    async submit(candidates) {
      const token = voterToken();
      const rows = candidates.map((candidate) => ({
        candidate: candidate,
        voter_token: token,
      }));

      // Alle Stimmen in einem Aufruf: entweder alle oder keine.
      const res = await fetch(cfg.SUPABASE_URL + "/rest/v1/votes", {
        method: "POST",
        headers: { ...this.headers(), Prefer: "return=minimal" },
        body: JSON.stringify(rows),
      });

      if (res.ok) return;

      const text = await res.text();
      if (res.status === 409 || /Stimmen pro Person/.test(text)) {
        const err = new Error("Von diesem Gerät wurde bereits abgestimmt.");
        err.alreadyVoted = true;
        throw err;
      }
      throw new Error(
        "Die Stimmen konnten nicht gespeichert werden (" + res.status + ")."
      );
    },

    async results() {
      const res = await fetch(
        cfg.SUPABASE_URL + "/rest/v1/results?select=candidate,stimmen",
        { headers: this.headers() }
      );
      if (!res.ok) {
        throw new Error(
          "Ergebnisse konnten nicht geladen werden (" + res.status + ")."
        );
      }
      const rows = await res.json();
      const counts = {};
      for (const row of rows) {
        counts[row.candidate] = Number(row.stimmen) || 0;
      }
      return counts;
    },
  };

  const store = cfg.MODE === "supabase" ? supabaseStore : localStore;

  /* ------------------------------------------------------------------ *
   * Darstellung
   * ------------------------------------------------------------------ */

  function renderCandidates() {
    el.candidates.innerHTML = "";
    for (const name of cfg.CANDIDATES) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "candidate";
      btn.setAttribute("aria-pressed", "false");
      btn.innerHTML =
        '<span class="avatar"></span>' +
        '<span class="candidate-name"></span>' +
        '<span class="check">✓</span>';
      btn.querySelector(".avatar").textContent = initials(name);
      btn.querySelector(".candidate-name").textContent = name;
      btn.addEventListener("click", () => select(name));
      li.appendChild(btn);
      el.candidates.appendChild(li);
    }
  }

  function select(name) {
    if (selected.has(name)) {
      selected.delete(name);
    } else if (selected.size < maxVotes) {
      selected.add(name);
    } else {
      flashLimitHint();
      return;
    }

    for (const btn of el.candidates.querySelectorAll(".candidate")) {
      const btnName = btn.querySelector(".candidate-name").textContent;
      btn.setAttribute("aria-pressed", String(selected.has(btnName)));
      btn.classList.toggle(
        "blocked",
        selected.size >= maxVotes && !selected.has(btnName)
      );
    }

    updateSubmitButton();
  }

  function updateSubmitButton() {
    el.submit.disabled = selected.size === 0;
    el.submit.textContent =
      selected.size === 0
        ? "Stimmen abgeben"
        : "Stimmen abgeben (" + selected.size + " von " + maxVotes + ")";
  }

  function flashLimitHint() {
    el.voteError.textContent =
      "Du hast bereits " + maxVotes +
      " Namen gewählt. Klicke einen davon erneut an, um ihn zu tauschen.";
    el.voteError.hidden = false;
    clearTimeout(flashLimitHint.timer);
    flashLimitHint.timer = setTimeout(() => {
      el.voteError.hidden = true;
    }, 3500);
  }

  function renderResults(counts) {
    const rows = cfg.CANDIDATES.map((name) => ({
      name: name,
      count: counts[name] || 0,
    }));
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    const max = Math.max(1, ...rows.map((row) => row.count));

    rows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    el.bars.innerHTML = "";
    for (const row of rows) {
      const share = total ? Math.round((row.count / total) * 100) : 0;
      const li = document.createElement("li");
      li.className = "bar-row" + (row.count === max && total ? " leader" : "");
      li.innerHTML =
        '<div class="bar-label"><strong></strong><span class="count"></span></div>' +
        '<div class="bar-track"><div class="bar-fill"></div></div>';
      li.querySelector("strong").textContent = row.name;
      li.querySelector(".count").textContent =
        row.count + (row.count === 1 ? " Stimme" : " Stimmen") +
        (total ? " · " + share + "%" : "");
      li.querySelector(".bar-fill").style.width =
        (total ? (row.count / max) * 100 : 0) + "%";
      el.bars.appendChild(li);
    }

    el.total.textContent =
      total === 1 ? "1 abgegebene Stimme" : total + " abgegebene Stimmen";
  }

  async function loadResults() {
    try {
      renderResults(await store.results());
    } catch (error) {
      el.total.textContent = error.message;
    }
  }

  function showResults() {
    el.vote.hidden = true;
    el.results.hidden = false;
    el.done.hidden = !hasVoted();
    loadResults();

    if (cfg.REFRESH_SECONDS > 0 && !refreshTimer) {
      refreshTimer = setInterval(loadResults, cfg.REFRESH_SECONDS * 1000);
    }
  }

  /* ------------------------------------------------------------------ *
   * Ablauf
   * ------------------------------------------------------------------ */

  async function onSubmit() {
    if (selected.size === 0) return;
    el.submit.disabled = true;
    el.submit.textContent = "Wird gespeichert …";
    el.voteError.hidden = true;

    try {
      await store.submit(Array.from(selected));
      markVoted();
      showResults();
    } catch (error) {
      if (error.alreadyVoted) {
        markVoted();
        showResults();
        return;
      }
      el.voteError.textContent = error.message;
      el.voteError.hidden = false;
      updateSubmitButton();
    }
  }

  function startVoting() {
    el.gate.hidden = true;

    if (hasVoted()) {
      showResults();
      return;
    }

    el.vote.hidden = false;
    if (cfg.SHOW_RESULTS_BEFORE_VOTE) {
      el.results.hidden = false;
      loadResults();
    }
  }

  function init() {
    el.title.textContent = cfg.TITLE;
    el.subtitle.textContent = cfg.SUBTITLE;
    document.title = cfg.TITLE;
    el.modeBadge.textContent =
      cfg.MODE === "supabase"
        ? "Verbunden mit PostgreSQL"
        : "Testmodus – Stimmen bleiben nur in diesem Browser";

    renderCandidates();
    el.voteHint.textContent =
      "Wähle bis zu " + maxVotes +
      " Namen aus. Gespeichert wird erst, wenn du auf den Button klickst.";
    updateSubmitButton();
    el.submit.addEventListener("click", onSubmit);
    el.refresh.addEventListener("click", loadResults);

    const needsCode =
      cfg.ACCESS_CODE && localStorage.getItem(KEY_GATE) !== "1";

    if (needsCode) {
      el.gate.hidden = false;
      el.gateForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (el.gateInput.value.trim() === cfg.ACCESS_CODE) {
          localStorage.setItem(KEY_GATE, "1");
          startVoting();
        } else {
          el.gateError.hidden = false;
          el.gateInput.value = "";
        }
      });
    } else {
      startVoting();
    }
  }

  init();
})();
