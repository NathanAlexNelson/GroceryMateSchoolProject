// --- State ---
let viewDate = new Date(); // which month we're viewing
// schedule: { "YYYY-MM-DD": [ {id, title, time} ] }
let schedule = loadSchedule();

// --- Elements ---
const gridEl = document.getElementById("grid");
const monthLabelEl = document.getElementById("monthLabel");

document.getElementById("prevMonth").addEventListener("click", () => shiftMonth(-1));
document.getElementById("nextMonth").addEventListener("click", () => shiftMonth(1));
document.getElementById("todayBtn").addEventListener("click", () => {
  viewDate = new Date();
  render();
});
document.getElementById("clearMonthBtn").addEventListener("click", clearMonth);

// Set up drag start on recipe cards
document.querySelectorAll(".recipe-card").forEach(card => {
  card.addEventListener("dragstart", (e) => {
    const payload = {
      recipeId: card.dataset.recipeId,
      title: card.dataset.title,
      time: card.dataset.time
    };
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "copy";
  });
});

// --- Calendar rendering ---
render();

function render() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  monthLabelEl.textContent = viewDate.toLocaleString(undefined, {
    month: "long",
    year: "numeric"
  });

  gridEl.innerHTML = "";

  // Build a 6-week grid starting Sunday
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0=Sun..6=Sat
  const gridStart = new Date(year, month, 1 - startOffset);

  const todayKey = toKey(new Date());

  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);

    const key = toKey(date);
    const isOutside = date.getMonth() !== month;
    const isToday = key === todayKey;

    const cell = document.createElement("div");
    cell.className = "day" + (isOutside ? " outside" : "") + (isToday ? " today" : "");
    cell.dataset.date = key;
    cell.setAttribute("role", "gridcell");

    const header = document.createElement("div");
    header.className = "date";

    const dayNum = document.createElement("span");
    dayNum.textContent = String(date.getDate());

    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = key; // show key for clarity (you can remove this)

    header.appendChild(dayNum);
    header.appendChild(pill);

    const eventsWrap = document.createElement("div");
    eventsWrap.className = "events";

    // Render scheduled items
    const items = schedule[key] ?? [];
    for (const item of items) {
      const ev = document.createElement("div");
      ev.className = "event";
      ev.title = "Click to remove";
      ev.dataset.eventId = item.id;

      const title = document.createElement("div");
      title.className = "title";
      title.textContent = item.title;

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = item.time ?? "";

      ev.appendChild(title);
      ev.appendChild(meta);

      // Remove on click
      ev.addEventListener("click", () => {
        removeEvent(key, item.id);
      });

      eventsWrap.appendChild(ev);
    }

    // Drag & Drop handlers for calendar cells
    cell.addEventListener("dragenter", () => cell.classList.add("drop-ok"));
    cell.addEventListener("dragleave", () => cell.classList.remove("drop-ok"));
    cell.addEventListener("dragover", (e) => {
      // Required to allow drop
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    });

    cell.addEventListener("drop", (e) => {
      e.preventDefault();
      cell.classList.remove("drop-ok");
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;

      try {
        const data = JSON.parse(raw);
        addEvent(key, data);
      } catch {
        // ignore invalid payload
      }
    });

    cell.appendChild(header);
    cell.appendChild(eventsWrap);
    gridEl.appendChild(cell);
  }
}

// --- Actions ---
function addEvent(dateKey, recipe) {
  const item = {
    id: crypto.randomUUID(),
    recipeId: recipe.recipeId,
    title: recipe.title,
    time: recipe.time
  };

  if (!schedule[dateKey]) schedule[dateKey] = [];
  schedule[dateKey].push(item);
  persistSchedule();
  render();
}

function removeEvent(dateKey, eventId) {
  const items = schedule[dateKey] ?? [];
  schedule[dateKey] = items.filter(x => x.id !== eventId);
  if (schedule[dateKey].length === 0) delete schedule[dateKey];
  persistSchedule();
  render();
}

function shiftMonth(delta) {
  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  viewDate = new Date(y, m + delta, 1);
  render();
}

function clearMonth() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Remove all keys whose date is in the currently viewed month
  for (const key of Object.keys(schedule)) {
    const d = new Date(key + "T00:00:00");
    if (d.getFullYear() === year && d.getMonth() === month) {
      delete schedule[key];
    }
  }

  persistSchedule();
  render();
}

// --- Helpers ---
function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function loadSchedule() {
  try {
    const raw = localStorage.getItem("recipe_schedule_v1");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistSchedule() {
  localStorage.setItem("recipe_schedule_v1", JSON.stringify(schedule));
}