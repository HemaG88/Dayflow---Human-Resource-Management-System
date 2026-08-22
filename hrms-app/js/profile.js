(() => {
  const user = Shell.mount();
  if (!user) return;

  const $ = (id) => document.getElementById(id);
  const isAdmin = user.role_type === "admin";


  /* ---------- header fields ---------- */
  $("avatarInitials").textContent = Shell.initials(user.fullName);
  if (user.avatar) {
    $("avatarImg").src = user.avatar;
    $("avatarImg").style.display = "block";
    $("avatarInitials").style.display = "none";
  }
  $("fldFullName").value = user.fullName || "";
  $("companyLabel").textContent = user.companyName || "";
  $("fldJobPosition").value = user.jobPosition || "";
  $("fldDepartment").value = user.department || "";
  $("fldEmail").value = user.email || "";
  $("fldManager").value = user.manager || "";
  $("fldPhone").value = user.phone || "";
  $("fldLocation").value = user.location || "";
  $("fldLoginId").value = user.loginId || "";
  $("fldEmpCode").value = user.empCode || "";

  // avatar upload
  $("avatarUpload").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      $("avatarImg").src = ev.target.result;
      $("avatarImg").style.display = "block";
      $("avatarInitials").style.display = "none";
      $("avatarImg").dataset.pending = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  /* ---------- tabs ---------- */
  const tabbar = $("tabbar");
  tabbar.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    if (btn.dataset.tab === "salary" && !isAdmin) return; // gated, see below
    tabbar.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".tabpanel").forEach((p) => p.classList.toggle("active", p.dataset.panel === btn.dataset.tab));
  });

  if (!isAdmin) {
    $("salaryContent").style.display = "none";
    $("salaryLocked").style.display = "block";
    $("salaryTabBtn").style.opacity = ".45";
    $("salaryTabBtn").style.cursor = "not-allowed";
    $("salaryTabBtn").title = "Admins only";
  }

  /* ---------- resume tab ---------- */
  $("fldAbout").value = user.about || "";
  $("fldLoveAboutJob").value = user.loveAboutJob || "";
  $("fldHobbies").value = user.hobbies || "";

  let skills = Array.isArray(user.skills) ? [...user.skills] : [];
  let certifications = Array.isArray(user.certifications) ? [...user.certifications] : [];

  function renderChips(listEl, items, onRemove) {
    listEl.innerHTML = items
      .map(
        (item, i) =>
          `<span class="chip">${escapeHtml(item)}<button type="button" data-i="${i}" aria-label="Remove">✕</button></span>`
      )
      .join("");
    listEl.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => onRemove(Number(btn.dataset.i)));
    });
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function refreshSkills() { renderChips($("skillsList"), skills, (i) => { skills.splice(i, 1); refreshSkills(); }); }
  function refreshCerts() { renderChips($("certList"), certifications, (i) => { certifications.splice(i, 1); refreshCerts(); }); }
  refreshSkills();
  refreshCerts();

  function addFrom(inputEl, arr, refresh) {
    const v = inputEl.value.trim();
    if (!v) return;
    arr.push(v);
    inputEl.value = "";
    refresh();
  }
  $("skillAddBtn").addEventListener("click", () => addFrom($("skillInput"), skills, refreshSkills));
  $("certAddBtn").addEventListener("click", () => addFrom($("certInput"), certifications, refreshCerts));
  $("skillInput").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addFrom($("skillInput"), skills, refreshSkills); } });
  $("certInput").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addFrom($("certInput"), certifications, refreshCerts); } });

  /* ---------- private info tab ---------- */
  $("fldDob").value = user.dob || "";
  $("fldAddress").value = user.residingAddress || "";
  $("fldNationality").value = user.nationality || "";
  $("fldPersonalEmail").value = user.personalEmail || "";
  $("fldGender").value = user.gender || "";
  $("fldMaritalStatus").value = user.maritalStatus || "";
  $("fldDateOfJoining").value = user.dateOfJoining || "";
  $("fldBankAccount").value = user.bankAccount || "";
  $("fldBankName").value = user.bankName || "";
  $("fldIfsc").value = user.ifsc || "";
  $("fldPan").value = user.pan || "";
  $("fldUan").value = user.uan || "";

  /* ---------- salary tab (admin only — values are only populated into the
     DOM when the viewer is an admin, so there's nothing to leak via
     dev tools for a non-admin viewer) ---------- */
  const pct = { ...user.salaryPct };
  const money = (n) => "₹" + Math.round(n || 0).toLocaleString("en-IN");

  function recalcSalary() {
    const wage = Number($("fldWage").value) || 0;
    pct.basic = Number($("pctBasic").value) || 0;
    pct.hra = Number($("pctHra").value) || 0;
    pct.standard = Number($("pctStandard").value) || 0;
    pct.bonus = Number($("pctBonus").value) || 0;
    pct.lta = Number($("pctLta").value) || 0;

    const basic = wage * (pct.basic / 100);
    const hra = basic * (pct.hra / 100);
    const standard = basic * (pct.standard / 100);
    const bonus = basic * (pct.bonus / 100);
    const lta = basic * (pct.lta / 100);
    const usedSoFar = basic + hra + standard + bonus + lta;
    const fixed = wage - usedSoFar;

    $("fldYearlyWage").value = wage ? (wage * 12).toLocaleString("en-IN") : "";
    $("amtBasic").textContent = money(basic);
    $("amtHra").textContent = money(hra);
    $("amtStandard").textContent = money(standard);
    $("amtBonus").textContent = money(bonus);
    $("amtLta").textContent = money(lta);
    $("amtFixed").textContent = money(fixed);

    const pfEmployeePct = Number($("pctPfEmployee").value) || 0;
    const pfEmployerPct = Number($("pctPfEmployer").value) || 0;
    $("amtPfEmployee").textContent = money(basic * (pfEmployeePct / 100));
    $("amtPfEmployer").textContent = money(basic * (pfEmployerPct / 100));

    const flag = $("salaryFlag");
    if (fixed < 0) {
      flag.className = "salary-flag show err";
      flag.textContent = `Components add up to ${money(usedSoFar)}, which is more than the ${money(wage)} wage. Lower a percentage.`;
      return false;
    }
    flag.className = "salary-flag show ok";
    flag.textContent = `Fixed allowance auto-fills the remainder: ${money(fixed)} / month.`;
    return true;
  }

  if (isAdmin) {
    $("fldWage").value = user.wage || 0;
    $("fldWorkingDays").value = user.workingDaysPerWeek || 5;
    $("fldBreakHours").value = user.breakHours || 1;
    $("pctBasic").value = pct.basic;
    $("pctHra").value = pct.hra;
    $("pctStandard").value = pct.standard;
    $("pctBonus").value = pct.bonus;
    $("pctLta").value = pct.lta;
    $("pctPfEmployee").value = user.pfEmployeePct;
    $("pctPfEmployer").value = user.pfEmployerPct;
    $("fldProfessionalTax").value = user.professionalTax;

    ["fldWage", "pctBasic", "pctHra", "pctStandard", "pctBonus", "pctLta", "pctPfEmployee", "pctPfEmployer"]
      .forEach((id) => $(id).addEventListener("input", recalcSalary));
    recalcSalary();
  }

  /* ---------- security tab ---------- */
  $("secLoginId").value = user.loginId;
  $("changePasswordBtn").addEventListener("click", () => {
    const cur = $("secCurrentPassword").value;
    const next = $("secNewPassword").value;
    const confirm = $("secConfirmPassword").value;
    const err = $("secError");

    if (cur !== user.password) { err.textContent = "Current password is incorrect."; return; }
    if (next.length < 8) { err.textContent = "New password must be at least 8 characters."; return; }
    if (next !== confirm) { err.textContent = "New passwords don't match."; return; }

    AD.updateUser(user.loginId, { password: next });
    err.textContent = "";
    $("secCurrentPassword").value = "";
    $("secNewPassword").value = "";
    $("secConfirmPassword").value = "";
    toast("Password updated.");
  });

  /* ---------- save ---------- */
  function toast(msg) {
    const t = $("saveToast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 1800);
  }

  $("saveBtn").addEventListener("click", () => {
    if (isAdmin && !recalcSalary()) {
      // switch to salary tab so the person sees the error
      tabbar.querySelector('[data-tab="salary"]').click();
      return;
    }

    const patch = {
      fullName: $("fldFullName").value.trim() || user.fullName,
      jobPosition: $("fldJobPosition").value.trim(),
      department: $("fldDepartment").value.trim(),
      email: $("fldEmail").value.trim() || user.email,
      manager: $("fldManager").value.trim(),
      phone: $("fldPhone").value.trim(),
      location: $("fldLocation").value.trim(),

      about: $("fldAbout").value.trim(),
      loveAboutJob: $("fldLoveAboutJob").value.trim(),
      hobbies: $("fldHobbies").value.trim(),
      skills,
      certifications,

      dob: $("fldDob").value,
      residingAddress: $("fldAddress").value.trim(),
      nationality: $("fldNationality").value.trim(),
      personalEmail: $("fldPersonalEmail").value.trim(),
      gender: $("fldGender").value,
      maritalStatus: $("fldMaritalStatus").value,
      dateOfJoining: $("fldDateOfJoining").value,
      bankAccount: $("fldBankAccount").value.trim(),
      bankName: $("fldBankName").value.trim(),
      ifsc: $("fldIfsc").value.trim(),
      pan: $("fldPan").value.trim(),
      uan: $("fldUan").value.trim(),
    };

    if ($("avatarImg").dataset.pending) patch.avatar = $("avatarImg").dataset.pending;

    if (isAdmin) {
      patch.wage = Number($("fldWage").value) || 0;
      patch.workingDaysPerWeek = Number($("fldWorkingDays").value) || 5;
      patch.breakHours = Number($("fldBreakHours").value) || 0;
      patch.salaryPct = { ...pct };
      patch.pfEmployeePct = Number($("pctPfEmployee").value) || 0;
      patch.pfEmployerPct = Number($("pctPfEmployer").value) || 0;
      patch.professionalTax = Number($("fldProfessionalTax").value) || 0;
    }

    AD.updateUser(user.loginId, patch);
    toast("Changes saved.");
  });
})();
