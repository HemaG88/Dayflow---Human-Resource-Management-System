(() => {
  const $ = (id) => document.getElementById(id);

  // Already signed in? Skip straight to the app.
  if (AD.getSession()) {
    window.location.href = "employees.html";
    return;
  }

  const loginIdEl = $("loginId");
  const passwordEl = $("password");
  const form = $("loginForm");
  const banner = $("formBanner");
  const submitBtn = $("submitBtn");

  // Prefill Login ID if arriving fresh from signup
  const params = new URLSearchParams(window.location.search);
  const incomingId = params.get("loginId");
  if (incomingId) {
    loginIdEl.value = incomingId;
    banner.className = "banner ok show";
    banner.textContent = `Account ready. Sign in with Login ID ${incomingId}.`;
  }

  document.querySelectorAll(".toggle-visibility").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = $(btn.dataset.target);
      const showing = target.type === "text";
      target.type = showing ? "password" : "text";
      btn.textContent = showing ? "👁" : "🙈";
    });
  });

  function setError(id, msg) {
    $("err-" + id).textContent = msg || "";
    $(id).classList.toggle("invalid", !!msg);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    let ok = true;
    if (!loginIdEl.value.trim()) { setError("loginId", "Enter your Login ID or email."); ok = false; }
    else setError("loginId", "");

    if (!passwordEl.value) { setError("password", "Enter your password."); ok = false; }
    else setError("password", "");

    if (!ok) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in…";

    setTimeout(() => {
      const user = AD.findUser({ loginId: loginIdEl.value.trim(), password: passwordEl.value });
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign in";

      if (!user) {
        banner.className = "banner err show";
        banner.textContent = "That Login ID/email and password don't match any account.";
        return;
      }

      AD.setSession(user.loginId);
      banner.className = "banner ok show";
      banner.textContent = `Welcome, ${user.fullName}. Redirecting…`;
      setTimeout(() => {
        window.location.href = "employees.html";
      }, 600);
    }, 500);
  });
})();
