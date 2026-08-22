(() => {
  const $ = (id) => document.getElementById(id);

  const companyNameEl = $("companyName");
  const fullNameEl = $("fullName");
  const emailEl = $("email");
  const phoneEl = $("phone");
  const passwordEl = $("password");
  const confirmEl = $("confirmPassword");
  const logoInput = $("logoInput");
  const logoPreview = $("logoPreview");
  const logoGlyph = $("logoGlyph");
  const form = $("signupForm");
  const banner = $("formBanner");
  const submitBtn = $("submitBtn");

  const badgeName = $("badgeName");
  const badgeCompany = $("badgeCompany");
  const badgeCode = $("badgeCode");
  const idPreviewValue = $("idPreviewValue");
  const copyIdBtn = $("copyIdBtn");

  const YEAR = new Date().getFullYear();

  function currentPreview() {
    const companyName = companyNameEl.value.trim();
    const fullName = fullNameEl.value.trim();

    badgeName.textContent = fullName || "Your Name";
    badgeCompany.textContent = companyName || "Your Company";

    if (!companyName || !fullName) {
      badgeCode.innerHTML =
        '<span class="seg company">XX</span><span class="seg initials">XXXX</span><span class="seg year">----</span><span class="seg serial">----</span>';
      idPreviewValue.textContent = "— fill the fields above —";
      return null;
    }

    const ci = AD.companyInitials(companyName);
    const ni = AD.nameInitials(fullName);
    const serial = AD.previewSerial(ci, YEAR);
    const loginId = `${ci}${ni}${YEAR}${serial}`;

    badgeCode.innerHTML =
      `<span class="seg company">${ci}</span><span class="seg initials">${ni}</span><span class="seg year">${YEAR}</span><span class="seg serial">${serial}</span>`;
    idPreviewValue.textContent = loginId;

    return { ci, ni, serial, loginId };
  }

  [companyNameEl, fullNameEl].forEach((el) => el.addEventListener("input", currentPreview));
  currentPreview();

  copyIdBtn.addEventListener("click", async () => {
    const val = idPreviewValue.textContent;
    if (!val || val.startsWith("—")) return;
    try {
      await navigator.clipboard.writeText(val);
      const old = copyIdBtn.textContent;
      copyIdBtn.textContent = "Copied";
      setTimeout(() => (copyIdBtn.textContent = old), 1200);
    } catch { /* clipboard unavailable — silently ignore */ }
  });

  // logo upload preview
  $("logoDrop").addEventListener("click", () => logoInput.click());
  logoInput.addEventListener("change", () => {
    const file = logoInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      logoPreview.src = e.target.result;
      logoPreview.style.display = "block";
      logoGlyph.style.display = "none";
    };
    reader.readAsDataURL(file);
  });

  // show/hide password
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

  function validate() {
    let ok = true;

    if (!companyNameEl.value.trim()) { setError("companyName", "Company name is required."); ok = false; }
    else setError("companyName", "");

    if (!fullNameEl.value.trim() || fullNameEl.value.trim().split(/\s+/).length < 1) {
      setError("fullName", "Enter your full name."); ok = false;
    } else setError("fullName", "");

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim());
    if (!emailOk) { setError("email", "Enter a valid email address."); ok = false; }
    else setError("email", "");

    const phoneOk = /^\d{7,15}$/.test(phoneEl.value.trim());
    if (!phoneOk) { setError("phone", "Enter a valid phone number."); ok = false; }
    else setError("phone", "");

    if (passwordEl.value.length < 8) { setError("password", "Use at least 8 characters."); ok = false; }
    else setError("password", "");

    if (confirmEl.value !== passwordEl.value || !confirmEl.value) {
      setError("confirmPassword", "Passwords don't match."); ok = false;
    } else setError("confirmPassword", "");

    return ok;
  }

  function showBanner(kind, msg) {
    banner.className = `banner show ${kind}`;
    banner.textContent = msg;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    banner.className = "banner";

    if (!validate()) {
      showBanner("err", "Please fix the highlighted fields.");
      return;
    }

    const companyName = companyNameEl.value.trim();
    const fullName = fullNameEl.value.trim();
    const ci = AD.companyInitials(companyName);
    const serial = AD.nextSerial(ci, YEAR); // consume the serial now
    const { loginId } = AD.buildLoginId({ companyName, fullName, year: YEAR, serial });

    const existing = AD.getUsers().find((u) => u.email.toLowerCase() === emailEl.value.trim().toLowerCase());
    if (existing) {
      showBanner("err", "An account with this email already exists.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account…";

    AD.registerUser({
      loginId,
      companyName,
      fullName,
      email: emailEl.value.trim(),
      phone: phoneEl.value.trim(),
      password: passwordEl.value,
      role: "admin",
      logo: logoPreview.src || null,
      createdAt: new Date().toISOString(),
    });

    setTimeout(() => {
      showBanner("ok", `Account created. Your Login ID is ${loginId} — redirecting to sign in…`);
      submitBtn.textContent = "Create account";
      submitBtn.disabled = false;
      setTimeout(() => {
        window.location.href = `login.html?loginId=${encodeURIComponent(loginId)}`;
      }, 1400);
    }, 500);
  });
})();
