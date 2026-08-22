/* =====================================================
   Altruistic Deer HRMS — core auth logic
   Mirrors the spec:
   Login ID = [Company Initials][First2 of first name + First2 of last name][Year][Serial 4-digit]
   Example: OI + JODO + 2022 + 0001 -> OIJODO20220001
   Password is system-generated on first creation.
   All data is persisted to localStorage as a stand-in for a backend.
===================================================== */

const AD = (() => {
  const USERS_KEY = "ad_hrms_users";
  const SERIAL_KEY = "ad_hrms_serials"; // per "COMPANYINITIALS-YEAR" -> count
  const SESSION_KEY = "ad_hrms_session"; // holds the logged-in user's loginId

  const SEED_TEAM = [
    { fullName: "Priya Shankar", role: "Product Designer", department: "Design", status: "present", wage: 72000, gender: "Female", nationality: "Indian" },
    { fullName: "Marcus Webb", role: "Backend Engineer", department: "Engineering", status: "present", wage: 88000, gender: "Male", nationality: "British" },
    { fullName: "Aiko Tanaka", role: "People Partner", department: "HR", status: "leave", wage: 65000, gender: "Female", nationality: "Japanese" },
    { fullName: "Devon Cole", role: "Sales Executive", department: "Sales", status: "absent", wage: 54000, gender: "Male", nationality: "American" },
    { fullName: "Leah Fontaine", role: "QA Engineer", department: "Engineering", status: "present", wage: 61000, gender: "Female", nationality: "Canadian" },
    { fullName: "Ravi Patel", role: "Finance Analyst", department: "Finance", status: "leave", wage: 58000, gender: "Male", nationality: "Indian" },
    { fullName: "Sam O'Neill", role: "Support Lead", department: "Customer Success", status: "present", wage: 60000, gender: "Non-binary", nationality: "Irish" },
    { fullName: "Noor Haddad", role: "Marketing Manager", department: "Marketing", status: "absent", wage: 75000, gender: "Female", nationality: "Jordanian" },
  ];

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
    catch { return []; }
  }
  function saveUsers(list) {
    localStorage.setItem(USERS_KEY, JSON.stringify(list));
  }
  function getSerials() {
    try { return JSON.parse(localStorage.getItem(SERIAL_KEY)) || {}; }
    catch { return {}; }
  }
  function saveSerials(obj) {
    localStorage.setItem(SERIAL_KEY, JSON.stringify(obj));
  }

  // First letter of each significant word in the company name, max 2 letters.
  // "Odoo India" -> "OI". "Acme" -> "AC".
  function companyInitials(companyName) {
    const words = (companyName || "").trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "XX";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase().padEnd(2, "X");
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  // First two letters of first name + first two letters of last name.
  // "John Doe" -> "JODO". Single name "John" -> "JOJO" fallback (first 2 twice)
  function nameInitials(fullName) {
    const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
    const pad = (s) => (s || "").slice(0, 2).toUpperCase().padEnd(2, "X");
    if (parts.length === 0) return "XXXX";
    if (parts.length === 1) return pad(parts[0]) + pad(parts[0]);
    return pad(parts[0]) + pad(parts[parts.length - 1]);
  }

  function nextSerial(companyInit, year) {
    const serials = getSerials();
    const key = `${companyInit}-${year}`;
    const next = (serials[key] || 0) + 1;
    serials[key] = next;
    saveSerials(serials);
    return String(next).padStart(4, "0");
  }

  // Non-committing preview (does not consume a serial number)
  function previewSerial(companyInit, year) {
    const serials = getSerials();
    const key = `${companyInit}-${year}`;
    const next = (serials[key] || 0) + 1;
    return String(next).padStart(4, "0");
  }

  function buildLoginId({ companyName, fullName, year, serial }) {
    const ci = companyInitials(companyName);
    const ni = nameInitials(fullName);
    return { loginId: `${ci}${ni}${year}${serial}`, ci, ni };
  }

  function generatePassword(len = 10) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let out = "";
    const arr = new Uint32Array(len);
    (window.crypto || window.msCrypto).getRandomValues(arr);
    for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
    return out;
  }

  // Default "blank" profile shape every user gets, so the Profile page
  // always has every field to render/edit, even before the person fills it in.
  function profileDefaults() {
    return {
      jobPosition: "",
      department: "",
      manager: "",
      location: "",
      dob: "",
      residingAddress: "",
      nationality: "",
      personalEmail: "",
      gender: "",
      maritalStatus: "",
      dateOfJoining: "",
      bankAccount: "",
      bankName: "",
      ifsc: "",
      pan: "",
      uan: "",
      empCode: "",
      about: "",
      loveAboutJob: "",
      hobbies: "",
      skills: [],
      certifications: [],
      avatar: null,
      wage: 0,
      workingDaysPerWeek: 5,
      breakHours: 1,
      salaryPct: { basic: 50, hra: 50, standard: 16.67, bonus: 8.33, lta: 8.33 },
      pfEmployeePct: 12,
      pfEmployerPct: 12,
      professionalTax: 200,
    };
  }

  function registerUser(user) {
    const users = getUsers();
    users.push({
      status: "absent",
      checkedInSince: null,
      role_type: "admin",
      ...profileDefaults(),
      jobPosition: "Administrator",
      department: "Management",
      manager: "—",
      location: "—",
      dateOfJoining: new Date().toISOString().slice(0, 10),
      empCode: "EMP-0001",
      wage: 0,
      ...user,
    });
    saveUsers(users);
    seedTeamFor(user.companyName);
  }

  // Populate a handful of demo coworkers the first time a company registers,
  // so the Employees grid has more than just the admin who signed up.
  function seedTeamFor(companyName) {
    const users = getUsers();
    const alreadySeeded = users.some((u) => u.companyName === companyName && u.seeded);
    if (alreadySeeded) return;

    const ci = companyInitials(companyName);
    const year = new Date().getFullYear();

    const seeded = SEED_TEAM.map((member, i) => {
      const serial = nextSerial(ci, year);
      const { loginId } = buildLoginId({ companyName, fullName: member.fullName, year, serial });
      return {
        ...profileDefaults(),
        loginId,
        companyName,
        fullName: member.fullName,
        role: member.role,
        jobPosition: member.role,
        department: member.department,
        manager: "Jordan Doyle",
        location: "Remote",
        gender: member.gender,
        nationality: member.nationality,
        wage: member.wage,
        empCode: `EMP-${String(1002 + i).padStart(4, "0")}`,
        dateOfJoining: new Date().toISOString().slice(0, 10),
        email: member.fullName.toLowerCase().replace(/[^a-z]+/g, ".") + "@" + companyName.toLowerCase().replace(/\s+/g, "") + ".com",
        phone: "",
        password: generatePassword(),
        role_type: "employee",
        status: member.status,
        checkedInSince: member.status === "present" ? "09:52 AM" : null,
        seeded: true,
        createdAt: new Date().toISOString(),
      };
    });

    saveUsers([...getUsers(), ...seeded]);
  }

  function findUser({ loginId, email, password }) {
    const users = getUsers();
    return users.find(
      (u) =>
        (u.loginId === loginId || u.email.toLowerCase() === String(loginId || email).toLowerCase()) &&
        u.password === password
    );
  }

  function updateUser(loginId, patch) {
    const users = getUsers();
    const idx = users.findIndex((u) => u.loginId === loginId);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...patch };
    saveUsers(users);
    return users[idx];
  }

  function getTeam(companyName) {
    return getUsers().filter((u) => u.companyName === companyName);
  }

  // ---- session ----
  function setSession(loginId) {
    localStorage.setItem(SESSION_KEY, loginId);
  }
  function getSession() {
    const loginId = localStorage.getItem(SESSION_KEY);
    if (!loginId) return null;
    return getUsers().find((u) => u.loginId === loginId) || null;
  }
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  // ---- attendance ----
  function checkIn(loginId) {
    const now = new Date();
    const since = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return updateUser(loginId, { status: "present", checkedInSince: since });
  }
  function checkOut(loginId) {
    return updateUser(loginId, { status: "absent", checkedInSince: null });
  }

  // ---- time off ----
  const TIMEOFF_KEY = "ad_hrms_timeoff";
  const TIMEOFF_BALANCE_DEFAULTS = { "Paid Time Off": 24, "Sick Leave": 7 };

  function getTimeOffRequests() {
    try { return JSON.parse(localStorage.getItem(TIMEOFF_KEY)) || []; }
    catch { return []; }
  }
  function saveTimeOffRequests(list) {
    localStorage.setItem(TIMEOFF_KEY, JSON.stringify(list));
  }

  // inclusive day count between two YYYY-MM-DD strings
  function daySpan(start, end) {
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    const diff = Math.round((e - s) / 86400000) + 1;
    return diff > 0 ? diff : 1;
  }

  function submitTimeOffRequest({ loginId, companyName, type, start, end, attachmentName }) {
    const list = getTimeOffRequests();
    const req = {
      id: `TO-${Date.now()}`,
      loginId,
      companyName,
      type,
      start,
      end,
      days: daySpan(start, end),
      status: "Pending",
      attachmentName: attachmentName || null,
      createdAt: new Date().toISOString(),
    };
    list.push(req);
    saveTimeOffRequests(list);
    return req;
  }

  function setTimeOffStatus(id, status) {
    const list = getTimeOffRequests();
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    list[idx].status = status;
    saveTimeOffRequests(list);
    return list[idx];
  }

  function getTimeOffBalance(loginId, companyName) {
    const list = getTimeOffRequests().filter(
      (r) => r.loginId === loginId && r.companyName === companyName && r.status === "Approved"
    );
    const used = { "Paid Time Off": 0, "Sick Leave": 0 };
    list.forEach((r) => {
      if (used[r.type] !== undefined) used[r.type] += r.days;
    });
    return {
      "Paid Time Off": Math.max(0, TIMEOFF_BALANCE_DEFAULTS["Paid Time Off"] - used["Paid Time Off"]),
      "Sick Leave": Math.max(0, TIMEOFF_BALANCE_DEFAULTS["Sick Leave"] - used["Sick Leave"]),
    };
  }

  return {
    companyInitials,
    nameInitials,
    nextSerial,
    previewSerial,
    buildLoginId,
    generatePassword,
    profileDefaults,
    registerUser,
    findUser,
    updateUser,
    getUsers,
    getTeam,
    setSession,
    getSession,
    clearSession,
    checkIn,
    checkOut,
    getTimeOffRequests,
    submitTimeOffRequest,
    setTimeOffStatus,
    getTimeOffBalance,
    daySpan,
    TIMEOFF_BALANCE_DEFAULTS,
  };
})();
