/* =====================================================
   Altruistic Deer HRMS — app shell behaviour
   Include on every page inside the logged-in area.
   Requires auth-core.js to be loaded first, and expects
   the standard nav markup (see employees.html) to be present.
===================================================== */
const Shell = (() => {
  function initials(fullName) {
    const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function statusLabel(status) {
    return { present: "In office", absent: "Absent", leave: "On leave" }[status] || "Absent";
  }

  function mount() {
    const user = AD.getSession();
    if (!user) {
      window.location.href = "login.html";
      return null;
    }

    // active nav tab
    const page = document.body.dataset.page;
    document.querySelectorAll(".topnav nav a").forEach((a) => {
      a.classList.toggle("active", a.dataset.tab === page);
    });

    // avatar
    const avatarBtn = document.getElementById("avatarBtn");
    const avatarMenu = document.getElementById("avatarMenu");
    const avatarDot = document.getElementById("avatarDot");
    const menuName = document.getElementById("menuName");
    const menuRole = document.getElementById("menuRole");

    if (avatarBtn) avatarBtn.textContent = initials(user.fullName);
    if (avatarDot) avatarDot.className = "status-dot " + user.status;
    if (menuName) menuName.textContent = user.fullName;
    if (menuRole) menuRole.textContent = user.role || (user.role_type === "admin" ? "Admin" : "Employee");

    if (avatarBtn && avatarMenu) {
      avatarBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        avatarMenu.classList.toggle("open");
      });
      document.addEventListener("click", (e) => {
        if (!avatarMenu.contains(e.target)) avatarMenu.classList.remove("open");
      });
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        AD.clearSession();
        window.location.href = "login.html";
      });
    }

    // systray check in/out
    const systrayBtn = document.getElementById("systrayBtn");
    const systraySince = document.getElementById("systraySince");
    function renderSystray(u) {
      if (!systrayBtn) return;
      const checkedIn = u.status === "present";
      systrayBtn.className = checkedIn ? "checked-in" : "checked-out";
      systrayBtn.innerHTML = `<span class="pulse"></span>${checkedIn ? "Check Out" : "Check In"}`;
      if (systraySince) systraySince.textContent = checkedIn && u.checkedInSince ? `Since ${u.checkedInSince}` : "";
    }
    renderSystray(user);

    if (systrayBtn) {
      systrayBtn.addEventListener("click", () => {
        const current = AD.getSession();
        const updated = current.status === "present" ? AD.checkOut(current.loginId) : AD.checkIn(current.loginId);
        if (avatarDot) avatarDot.className = "status-dot " + updated.status;
        renderSystray(updated);
        document.dispatchEvent(new CustomEvent("ad:attendance-changed", { detail: updated }));
      });
    }

    return user;
  }

  return { mount, initials, statusLabel };
})();
