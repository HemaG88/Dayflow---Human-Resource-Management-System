(() => {
  const user = Shell.mount();
  if (!user) return; // Shell already redirected to login

  const grid = document.getElementById("empGrid");
  const searchInput = document.getElementById("searchInput");
  const newBtn = document.getElementById("newBtn");

  const backdrop = document.getElementById("empModalBackdrop");
  const modalClose = document.getElementById("empModalClose");
  const modalPhoto = document.getElementById("modalPhoto");
  const modalName = document.getElementById("modalName");
  const modalRole = document.getElementById("modalRole");
  const modalDept = document.getElementById("modalDept");
  const modalEmail = document.getElementById("modalEmail");
  const modalLoginId = document.getElementById("modalLoginId");
  const modalStatusTag = document.getElementById("modalStatusTag");

  function statusIndicator(status) {
    if (status === "leave") return `<div class="indicator leave" title="On leave">✈️</div>`;
    return `<div class="indicator ${status}" title="${Shell.statusLabel(status)}"></div>`;
  }

  function render(filterText = "") {
    const team = AD.getTeam(user.companyName).sort((a, b) => a.fullName.localeCompare(b.fullName));
    const q = filterText.trim().toLowerCase();
    const filtered = q
      ? team.filter(
          (e) =>
            e.fullName.toLowerCase().includes(q) ||
            (e.role || "").toLowerCase().includes(q) ||
            (e.department || "").toLowerCase().includes(q)
        )
      : team;

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="empty-state">No employees match “${escapeHtml(filterText)}”.</div>`;
      return;
    }

    grid.innerHTML = filtered
      .map(
        (e) => `
      <button class="emp-card" data-login-id="${e.loginId}">
        ${statusIndicator(e.status)}
        <div class="photo">${Shell.initials(e.fullName)}</div>
        <div class="meta">
          <div class="name">${escapeHtml(e.fullName)}${e.loginId === user.loginId ? " (You)" : ""}</div>
          <div class="role">${escapeHtml(e.role || "Employee")}</div>
        </div>
      </button>`
      )
      .join("");

    grid.querySelectorAll(".emp-card").forEach((card) => {
      card.addEventListener("click", () => openModal(card.dataset.loginId));
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function openModal(loginId) {
    const emp = AD.getUsers().find((u) => u.loginId === loginId);
    if (!emp) return;

    modalPhoto.textContent = Shell.initials(emp.fullName);
    modalName.textContent = emp.fullName;
    modalRole.textContent = emp.role || (emp.role_type === "admin" ? "Admin" : "Employee");
    modalDept.textContent = emp.department || "—";
    modalEmail.textContent = emp.email || "—";
    modalLoginId.textContent = emp.loginId;

    const dotColor = { present: "var(--ok)", absent: "#D8B54A", leave: "var(--brass)" }[emp.status] || "#D8B54A";
    modalStatusTag.querySelector("i").style.background = dotColor;
    modalStatusTag.querySelector("span").textContent = Shell.statusLabel(emp.status);

    backdrop.classList.add("open");
  }

  function closeModal() {
    backdrop.classList.remove("open");
  }

  modalClose.addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  searchInput.addEventListener("input", () => render(searchInput.value));

  newBtn.addEventListener("click", () => {
    alert("Adding employees is done by an Admin or HR Officer from here — that flow is next on the build list.");
  });

  // Keep the grid in sync when the current user checks in/out via the systray
  document.addEventListener("ad:attendance-changed", () => render(searchInput.value));

  render();
})();
