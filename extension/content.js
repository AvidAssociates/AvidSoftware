(function () {
  const STAGES = [
    { key: "presented", label: "Presented" },
    { key: "interview", label: "Interview" },
    { key: "offer", label: "Offer" },
    { key: "placed", label: "Placed" },
  ];

  let panelRoot = null;
  let profileCache = null;

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function scrapeProfile() {
    const linkedinUrl = window.location.href.split("?")[0];

    const nameSelectors = [
      "h1.text-heading-xlarge",
      "h1.inline.t-24",
      "main h1",
      ".pv-text-details__left-panel h1",
    ];
    let name = "";
    for (const sel of nameSelectors) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) {
        name = el.textContent.trim().replace(/\s+/g, " ");
        break;
      }
    }

    const imgSelectors = [
      "img.pv-top-card-profile-picture__image--show",
      "img.pv-top-card-profile-picture__image",
      "button.pv-top-card-profile-picture img",
      "img.profile-photo-edit__preview",
      "main img[src*='profile-displayphoto']",
    ];
    let profileImageUrl = "";
    for (const sel of imgSelectors) {
      const img = document.querySelector(sel);
      const src = img?.src || img?.getAttribute("data-delayed-url") || img?.getAttribute("data-src");
      if (src && !src.includes("ghost")) {
        profileImageUrl = src;
        break;
      }
    }

    return { name, profileImageUrl, linkedinUrl };
  }

  function ensureButton() {
    if (document.getElementById("avid-li-add-btn")) return;

    const btn = document.createElement("button");
    btn.id = "avid-li-add-btn";
    btn.type = "button";
    btn.textContent = "Add to Search";
    btn.title = "Add this LinkedIn profile to an Avid retained search";
    btn.addEventListener("click", openPanel);
    document.body.appendChild(btn);
  }

  function closePanel() {
    if (panelRoot) {
      panelRoot.remove();
      panelRoot = null;
    }
  }

  function openPanel() {
    profileCache = scrapeProfile();
    if (!profileCache.name) {
      alert("Could not read this profile's name. Try refreshing the page.");
      return;
    }

    closePanel();

    const host = document.createElement("div");
    host.id = "avid-li-panel-host";
    document.body.appendChild(host);
    panelRoot = host.attachShadow({ mode: "open" });

    panelRoot.innerHTML = `
      <style>
        * { box-sizing: border-box; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 2147483646;
        }
        .panel {
          position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: min(420px, calc(100vw - 32px)); background: #212120; color: #eceae5;
          border: 1px solid #34332f; border-radius: 14px; padding: 20px; z-index: 2147483647;
          box-shadow: 0 24px 80px rgba(0,0,0,0.45);
        }
        .head { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
        .avatar { width: 52px; height: 52px; border-radius: 50%; object-fit: cover; background: #34332f; flex-shrink: 0; }
        .avatar-fallback {
          width: 52px; height: 52px; border-radius: 50%; background: rgba(140,146,240,0.2);
          color: #afb3f5; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 20px;
        }
        h2 { margin: 0; font-size: 17px; font-weight: 800; letter-spacing: -0.3px; }
        .sub { margin: 4px 0 0; font-size: 12px; color: #9c978d; }
        label { display: block; font-size: 11px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; color: #9c978d; margin: 14px 0 6px; }
        input, select {
          width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #34332f;
          background: #000; color: #eceae5; font-size: 14px;
        }
        input:focus, select:focus { outline: 2px solid #8c92f0; outline-offset: 0; }
        .results {
          max-height: 180px; overflow-y: auto; border: 1px solid #34332f; border-radius: 8px; margin-top: 6px;
        }
        .result {
          padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #34332f; font-size: 13px;
        }
        .result:last-child { border-bottom: none; }
        .result:hover, .result.selected { background: rgba(140,146,240,0.12); }
        .result small { display: block; color: #9c978d; margin-top: 2px; font-size: 11px; }
        .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 18px; }
        button {
          border: none; border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 600; cursor: pointer;
        }
        .ghost { background: transparent; color: #9c978d; border: 1px solid #34332f; }
        .primary { background: #ed1d24; color: #fff; }
        .primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .status { font-size: 12px; margin-top: 10px; min-height: 16px; }
        .status.error { color: #e8765f; }
        .status.ok { color: #4fbf82; }
      </style>
      <div class="backdrop" data-close></div>
      <div class="panel" role="dialog" aria-label="Add to Avid Search">
        <div class="head">
          <div id="avid-avatar"></div>
          <div>
            <h2 id="avid-name"></h2>
            <p class="sub">LinkedIn profile captured</p>
          </div>
        </div>
        <label for="avid-search-q">Search name</label>
        <input id="avid-search-q" type="text" placeholder="Type client or role…" autocomplete="off" />
        <div class="results" id="avid-results" hidden></div>
        <label for="avid-stage">Stage</label>
        <select id="avid-stage">
          ${STAGES.map((s) => `<option value="${s.key}">${s.label}</option>`).join("")}
        </select>
        <div class="status" id="avid-status"></div>
        <div class="actions">
          <button type="button" class="ghost" data-close>Cancel</button>
          <button type="button" class="primary" id="avid-submit" disabled>Add to Search</button>
        </div>
      </div>
    `;

    const avatarWrap = panelRoot.getElementById("avid-avatar");
    if (profileCache.profileImageUrl) {
      const img = document.createElement("img");
      img.className = "avatar";
      img.src = profileCache.profileImageUrl;
      img.alt = "";
      avatarWrap.appendChild(img);
    } else {
      const fallback = document.createElement("div");
      fallback.className = "avatar-fallback";
      fallback.textContent = profileCache.name.charAt(0).toUpperCase();
      avatarWrap.appendChild(fallback);
    }

    panelRoot.getElementById("avid-name").textContent = profileCache.name;

    let selectedSearch = null;
    let searchTimer = null;

    const qInput = panelRoot.getElementById("avid-search-q");
    const resultsEl = panelRoot.getElementById("avid-results");
    const statusEl = panelRoot.getElementById("avid-status");
    const submitBtn = panelRoot.getElementById("avid-submit");

    function setStatus(text, kind) {
      statusEl.textContent = text;
      statusEl.className = `status${kind ? ` ${kind}` : ""}`;
    }

    function renderResults(searches) {
      if (!searches.length) {
        resultsEl.hidden = true;
        resultsEl.innerHTML = "";
        return;
      }
      resultsEl.hidden = false;
      resultsEl.innerHTML = searches
        .map(
          (s) => `
        <div class="result${selectedSearch?.id === s.id ? " selected" : ""}" data-id="${s.id}">
          <strong>${escapeHtml(s.client)}</strong>
          <small>${escapeHtml(s.role || "Role TBD")} · ${s.candidateCount} candidates</small>
        </div>`
        )
        .join("");

      resultsEl.querySelectorAll(".result").forEach((el) => {
        el.addEventListener("click", () => {
          const id = el.getAttribute("data-id");
          selectedSearch = searches.find((s) => s.id === id) || null;
          submitBtn.disabled = !selectedSearch;
          renderResults(searches);
          if (selectedSearch) {
            qInput.value = `${selectedSearch.client}${selectedSearch.role ? ` — ${selectedSearch.role}` : ""}`;
            setStatus(`Selected: ${selectedSearch.client}`, "ok");
          }
        });
      });
    }

    function loadSearches(query) {
      chrome.runtime.sendMessage({ type: "GET_SEARCHES", q: query }, (res) => {
        if (chrome.runtime.lastError) {
          setStatus(chrome.runtime.lastError.message, "error");
          return;
        }
        if (!res?.ok) {
          setStatus(res?.error || "Failed to load searches", "error");
          return;
        }
        renderResults(res.searches || []);
      });
    }

    qInput.addEventListener("input", () => {
      selectedSearch = null;
      submitBtn.disabled = true;
      clearTimeout(searchTimer);
      const q = qInput.value.trim();
      searchTimer = setTimeout(() => loadSearches(q), 200);
    });

    submitBtn.addEventListener("click", () => {
      if (!selectedSearch || !profileCache) return;
      submitBtn.disabled = true;
      setStatus("Adding…", "");

      chrome.runtime.sendMessage(
        {
          type: "ADD_CANDIDATE",
          payload: {
            id: uid(),
            searchId: selectedSearch.id,
            name: profileCache.name,
            stage: panelRoot.getElementById("avid-stage").value,
            profileImageUrl: profileCache.profileImageUrl || null,
            linkedinUrl: profileCache.linkedinUrl,
          },
        },
        (res) => {
          if (!res?.ok) {
            setStatus(res?.error || "Failed to add candidate", "error");
            submitBtn.disabled = false;
            return;
          }
          const search = res.result?.search;
          setStatus(
            `Added to ${search?.client || "search"} (${panelRoot.getElementById("avid-stage").selectedOptions[0].textContent})`,
            "ok"
          );
          setTimeout(closePanel, 1400);
        }
      );
    });

    panelRoot.querySelectorAll("[data-close]").forEach((el) => {
      el.addEventListener("click", closePanel);
    });

    loadSearches("");
    qInput.focus();
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function boot() {
    if (!window.location.pathname.startsWith("/in/")) return;
    ensureButton();

    const observer = new MutationObserver(() => ensureButton());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
