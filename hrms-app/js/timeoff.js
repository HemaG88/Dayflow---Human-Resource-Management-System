(() => {
  const user = Shell.mount();
  if (!user) return;

  const $ = (id) => document.getElementById(id);
  // Admins manage time off for everyone; so do people whose role reads as
  // an HR function (this is a demo heuristic — a real system would have a
  // dedicated "HR Officer" role flag rather than sniffing the job title).
  const isManager = user.role_type === "admin" || /hr/i.test(user.jobPosition || user.role || "");

  const grid = $("calGrid");
  const monthLabel = $("calMonthLabel");
  let calDate = new Date();
  calDate.setDate(1);

  const backdrop = $("toModalBackdrop");
  const startEl = $("toStart");
  const endEl = $("toEnd");
  const allocEl = $("toAllocation");
  const typeEl = $("toType");
  const errEl = $("toError");
  const attachEl = $("toAttachment");

  $("toEmployee").value = user.fullName;

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function openModal(dateStr) {
    const d = dateStr || todayStr();
    startEl.value = d;
    endEl.value = d;
    typeEl.value = "Paid Time Off";
    attachEl.value = "";
    errEl.textContent = "";
    updateAllocation();
    backdrop.classList.add("open");
  }
  function closeModal() {
    backdrop.classList.remove("open");
  }
  function updateAllocation() {
    if (!startEl.value || !endEl.value) { allocEl.value = ""; return; }
    allocEl.value = `${AD.daySpan(startEl.value, endEl.value)} day(s)`;
  }
  startEl.addEventListener("change", updateAllocation);
  endEl.addEventListener("change", updateAllocation);

  $("newBtn").addEventListener("click", () => openModal());
  $("toModalClose").addEventListener("click", closeModal);
  $("toDiscard").addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  $("toSubmit").addEventListener("click", () => {
    if (!startEl.value || !endEl.value) { errEl.textContent = "Pick a start and end date."; return; }
    if (endEl.value < startEl.value) { errEl.textContent = "End date can't be before the start date."; return; }

    AD.submitTimeOffRequest({
      loginId: user.loginId,
      companyName: user.companyName,
      type: typeEl.value,
      start: startEl.value,
      end: endEl.value,
      attachmentName: attachEl.files[0] ? attachEl.files[0].name : null,
    });

    closeModal();
    renderAll();
  });

  /* ---------- balances ---------- */
  function renderBalances() {
    const bal = AD.getTimeOffBalance(user.loginId, user.companyName);
    $("balPaid").innerHTML = `${bal["Paid Time Off"]}<span> / ${AD.TIMEOFF_BALANCE_DEFAULTS["Paid Time Off"]} days available</span>`;
    $("balSick").innerHTML = `${bal["Sick Leave"]}<span> / ${AD.TIMEOFF_BALANCE_DEFAULTS["Sick Leave"]} days available</span>`;
  }

  /* ---------- calendar ---------- */
  function renderCalendar() {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    monthLabel.textContent = calDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

    const requests = AD.getTimeOffRequests().filter(
      (r) => r.companyName === user.companyName && (isManager || r.loginId === user.loginId) && r.status !== "Rejected"
    );

    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = todayStr();

    let html = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<div class="dow">${d}</div>`).join("");
    for (let i = 0; i < startOffset; i++) html += `<div class="cell empty"></div>`;

    for (let day = 1; day <= daysInMonth; day++) {
      const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dow = new Date(year, month, day).getDay();
      const isWeekend = dow === 0 || dow === 6;
      const match = requests.find((r) => ds >= r.start && ds <= r.end);

      let cls = "cell";
      if (isWeekend) cls += " weekend";
      if (ds === today) cls += " today";
      if (match) cls += match.status === "Approved" ? " approved" : " pending";

      html += `<div class="${cls}" data-date="${ds}" title="${match ? match.type + " · " + match.status : "Request time off"}">${day}</div>`;
    }

    grid.innerHTML = html;
    grid.querySelectorAll(".cell:not(.empty)").forEach((cell) => {
      cell.addEventListener("click", () => openModal(cell.dataset.date));
    });
  }

  $("calPrev").addEventListener("click", () => { calDate.setMonth(calDate.getMonth() - 1); renderCalendar(); });
  $("calNext").addEventListener("click", () => { calDate.setMonth(calDate.getMonth() + 1); renderCalendar(); });

  /* ---------- list ---------- */
  function renderList() {
    const usersById = Object.fromEntries(AD.getUsers().map((u) => [u.loginId, u]));
    const all = AD.getTimeOffRequests()
      .filter((r) => r.companyName === user.companyName)
      .filter((r) => isManager || r.loginId === user.loginId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    $("colAction").style.display = isManager ? "" : "none";

    if (all.length === 0) {
      $("toBody").innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:30px;">No time off requests yet.</td></tr>`;
      return;
    }

    $("toBody").innerHTML = all
      .map((r) => {
        const person = usersById[r.loginId];
        const name = person ? person.fullName : r.loginId;
        const actions =
          isManager && r.status === "Pending"
            ? `<div class="row-actions">
                 <button class="reject" data-id="${r.id}" data-action="Rejected">Reject</button>
                 <button class="approve" data-id="${r.id}" data-action="Approved">Approve</button>
               </div>`
            : "";
        return `<tr>
          <td>${escapeHtml(name)}${r.loginId === user.loginId ? " (You)" : ""}</td>
          <td>${r.start}</td>
          <td>${r.end}</td>
          <td>${r.days}</td>
          <td>${escapeHtml(r.type)}</td>
          <td><span class="status-badge ${r.status}">${r.status}</span></td>
          <td>${actions}</td>
        </tr>`;
      })
      .join("");

    $("toBody").querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        AD.setTimeOffStatus(btn.dataset.id, btn.dataset.action);
        renderAll();
      });
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function renderAll() {
    renderBalances();
    renderCalendar();
    renderList();
  }

  renderAll();
})();
