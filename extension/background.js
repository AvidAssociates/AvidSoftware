const DEFAULT_API_URL = "http://localhost:3000";

async function getConfig() {
  const data = await chrome.storage.local.get(["apiUrl", "token"]);
  return {
    apiUrl: (data.apiUrl || DEFAULT_API_URL).replace(/\/$/, ""),
    token: data.token || null,
  };
}

async function apiFetch(path, options = {}) {
  const { apiUrl, token } = await getConfig();
  if (!token) throw new Error("Not signed in — open the extension popup to connect.");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };

  const res = await fetch(`${apiUrl}${path}`, { ...options, headers });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || res.statusText };
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === "GET_SEARCHES") {
        const q = message.q ? `?q=${encodeURIComponent(message.q)}` : "";
        const searches = await apiFetch(`/api/extension/searches${q}`);
        sendResponse({ ok: true, searches });
        return;
      }

      if (message.type === "ADD_CANDIDATE") {
        const result = await apiFetch("/api/extension/candidates", {
          method: "POST",
          body: JSON.stringify(message.payload),
        });
        sendResponse({ ok: true, result });
        return;
      }

      if (message.type === "CHECK_AUTH") {
        const { token, apiUrl } = await getConfig();
        if (!token) {
          sendResponse({ ok: false, error: "Not signed in" });
          return;
        }
        const me = await apiFetch("/api/extension/me");
        sendResponse({ ok: true, user: me.user, apiUrl });
        return;
      }

      sendResponse({ ok: false, error: "Unknown message" });
    } catch (err) {
      sendResponse({ ok: false, error: err.message || String(err) });
    }
  })();
  return true;
});
