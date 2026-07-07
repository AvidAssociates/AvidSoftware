const DEFAULT_API_URL = "http://localhost:3000";

const apiUrlEl = document.getElementById("apiUrl");
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const statusEl = document.getElementById("status");
const signInBtn = document.getElementById("signIn");
const signOutBtn = document.getElementById("signOut");

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = `status${kind ? ` ${kind}` : ""}`;
}

async function loadState() {
  const data = await chrome.storage.local.get(["apiUrl", "token", "userEmail", "userName"]);
  apiUrlEl.value = data.apiUrl || DEFAULT_API_URL;
  if (data.userEmail) emailEl.value = data.userEmail;

  if (data.token) {
    setStatus(data.userName ? `Signed in as ${data.userName}` : "Signed in", "ok");
    signInBtn.hidden = true;
    signOutBtn.hidden = false;
    passwordEl.value = "";
  } else {
    setStatus("");
    signInBtn.hidden = false;
    signOutBtn.hidden = true;
  }
}

signInBtn.addEventListener("click", async () => {
  const apiUrl = apiUrlEl.value.trim().replace(/\/$/, "");
  const email = emailEl.value.trim();
  const password = passwordEl.value;
  if (!apiUrl || !email || !password) {
    setStatus("API URL, email, and password are required.", "error");
    return;
  }

  signInBtn.disabled = true;
  setStatus("Signing in…", "");

  try {
    const res = await fetch(`${apiUrl}/api/extension/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Sign in failed");

    await chrome.storage.local.set({
      apiUrl,
      token: data.token,
      userEmail: email,
      userName: data.user?.displayName || email,
    });

    setStatus(`Signed in as ${data.user?.displayName || email}`, "ok");
    signInBtn.hidden = true;
    signOutBtn.hidden = false;
    passwordEl.value = "";
  } catch (err) {
    setStatus(err.message || "Sign in failed", "error");
  } finally {
    signInBtn.disabled = false;
  }
});

signOutBtn.addEventListener("click", async () => {
  await chrome.storage.local.remove(["token", "userName"]);
  setStatus("Signed out", "");
  signInBtn.hidden = false;
  signOutBtn.hidden = true;
});

loadState();
