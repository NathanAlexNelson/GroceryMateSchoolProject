// ============================================================
//  API CONFIGURATION
// ============================================================
const APP_ID   = '328481a6';
const APP_KEY  = 'ad04286762a9099eca68fc0f86ebd9bc';
const API_BASE = 'https://api.edamam.com/api/recipes/v2';

// In-memory cache – avoids calling the API twice for the same search term
const recipeCache = new Map();


// ============================================================
//  CALENDAR STATE
// ============================================================
let viewDate = new Date();

// schedule shape: { "YYYY-MM-DD": [ { id, recipeId, title, time } ] }
let schedule = loadSchedule();


// ============================================================
//  ELEMENT REFERENCES
// ============================================================
const gridEl       = document.getElementById('grid');
const monthLabelEl = document.getElementById('monthLabel');
const recipeListEl = document.getElementById('recipeList');
const searchInput  = document.getElementById('recipeSearch');
const searchBtn    = document.getElementById('searchBtn');


// ============================================================
//  EVENT LISTENERS
// ============================================================
document.getElementById('prevMonth').addEventListener('click', () => shiftMonth(-1));
document.getElementById('nextMonth').addEventListener('click', () => shiftMonth(1));
document.getElementById('todayBtn').addEventListener('click', () => {
  viewDate = new Date();
  render();
});
document.getElementById('clearMonthBtn').addEventListener('click', clearMonth);

searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSearch();
});


// ============================================================
//  API  –  RECIPE SEARCH
// ============================================================

/**
 * Calls the Edamam API and returns an array of recipe hit objects.
 * Each hit looks like: { recipe: { label, image, totalTime, source, dietLabels, ... } }
 * Results are cached by search term so we don't repeat identical calls.
 */
async function searchRecipes(query) {
  const cacheKey = query.trim().toLowerCase();

  if (recipeCache.has(cacheKey)) {
    return recipeCache.get(cacheKey);
  }

  const url = new URL(API_BASE);
  url.searchParams.set('type',    'public');
  url.searchParams.set('q',       query);
  url.searchParams.set('app_id',  APP_ID);
  url.searchParams.set('app_key', APP_KEY);

  const response = await fetch(url.toString(), {
    headers: { 'Edamam-Account-User': 'grocery-mate-user' }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const hits = data.hits ?? [];

  recipeCache.set(cacheKey, hits);
  return hits;
}

/**
 * Extracts a clean ingredient list from a recipe object.
 * Kept here for future use (e.g. a shopping-list feature).
 */
function getRecipeIngredients(recipe) {
  return (recipe.ingredients ?? []).map(ing => ({
    name:   ing.food,
    amount: ing.quantity,
    unit:   ing.measure,
  }));
}


// ============================================================
//  SIDEBAR  –  SEARCH HANDLER
// ============================================================

async function handleSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  showSkeletons();

  try {
    const hits = await searchRecipes(query);
    renderRecipeCards(hits);
  } catch (err) {
    showError(err.message);
  }
}


// ============================================================
//  SIDEBAR  –  RENDERING HELPERS
// ============================================================

/** Shows animated placeholder cards while the API call is in-flight */
function showSkeletons(count = 4) {
  recipeListEl.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const sk = document.createElement('div');
    sk.className = 'skeleton';
    recipeListEl.appendChild(sk);
  }
}

/** Shows a red error message in the sidebar */
function showError(msg) {
  recipeListEl.innerHTML = `<div class="status-msg error">⚠ ${escHtml(msg)}</div>`;
}

/** Renders up to 20 recipe cards from an array of API hit objects */
function renderRecipeCards(hits) {
  recipeListEl.innerHTML = '';

  if (!hits.length) {
    recipeListEl.innerHTML =
      '<div class="status-msg">No recipes found. Try a different search.</div>';
    return;
  }

  hits.slice(0, 20).forEach((hit, idx) => {
    const card = buildRecipeCard(hit.recipe, idx);
    recipeListEl.appendChild(card);
  });
}


// ============================================================
//  RECIPE CARD  –  BUILD DOM ELEMENT
// ============================================================

/**
 * Creates a draggable <article> card for one recipe.
 *
 * Card structure:
 *   <article class="recipe-card" draggable …>
 *     <img class="card-image" …>          ← recipe photo from API
 *     <div class="card-body">
 *       <h3>Recipe name</h3>
 *       <p class="card-meta">30 min • 4 servings</p>
 *       <p class="card-source">Source name</p>
 *       <div class="tags"> … </div>
 *     </div>
 *   </article>
 */
function buildRecipeCard(recipe, idx) {
  // Create a short stable ID from the recipe URL
  const recipeId = recipe.url
    ? btoa(recipe.url).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)
    : `r_${idx}`;

  const totalMin  = recipe.totalTime && recipe.totalTime > 0 ? recipe.totalTime : null;
  const timeLabel = totalMin ? `${totalMin} min` : 'Time N/A';

  // Collect up to 3 descriptive tags from the API data
  const tags = [];
  if (recipe.dietLabels?.length)  tags.push(recipe.dietLabels[0]);
  if (recipe.cuisineType?.length) tags.push(capitalise(recipe.cuisineType[0]));
  if (recipe.mealType?.length)    tags.push(capitalise(recipe.mealType[0]));

  // ── Build the card element ──────────────────────────────
  const card = document.createElement('article');
  card.className  = 'recipe-card';
  card.draggable  = true;

  // Data attributes carry the payload that the calendar drop handler reads
  card.dataset.recipeId = recipeId;
  card.dataset.title    = recipe.label;
  card.dataset.time     = timeLabel;

  // ── Image section ───────────────────────────────────────
  // recipe.image is a URL returned directly by the Edamam API (e.g. https://edamam-product-images.s3.amazonaws.com/…)
  if (recipe.image) {
    const img = document.createElement('img');
    img.className = 'card-image';
    img.src       = recipe.image;
    img.alt       = recipe.label;
    img.loading   = 'lazy'; // only load when scrolled into view

    // If the image URL fails for any reason, swap in the placeholder text
    img.onerror = () => {
      img.replaceWith(makePlaceholder());
    };

    card.appendChild(img);
  } else {
    // No image returned by API – show a plain placeholder block
    card.appendChild(makePlaceholder());
  }

  // ── Text body ───────────────────────────────────────────
  const body = document.createElement('div');
  body.className = 'card-body';
  body.innerHTML = `
    <h3>${escHtml(recipe.label)}</h3>
    <p class="card-meta">
      ${escHtml(timeLabel)}${recipe.yield ? ` &bull; ${recipe.yield} servings` : ''}
    </p>
    ${recipe.source
      ? `<p class="card-source">${escHtml(recipe.source)}</p>`
      : ''}
    <div class="tags">
      ${tags.map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}
    </div>
  `;

  card.appendChild(body);

  // ── Drag behaviour ──────────────────────────────────────
  card.addEventListener('dragstart', (e) => {
    const payload = {
      recipeId: card.dataset.recipeId,
      title:    card.dataset.title,
      time:     card.dataset.time,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
  });

  return card;
}

/** Creates the grey "No image" placeholder block */
function makePlaceholder() {
  const el = document.createElement('div');
  el.className   = 'card-image-placeholder';
  el.textContent = 'No image';
  return el;
}


// ============================================================
//  CALENDAR  –  RENDER
// ============================================================

function render() {
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  monthLabelEl.textContent = viewDate.toLocaleString(undefined, {
    month: 'long',
    year:  'numeric',
  });

  gridEl.innerHTML = '';

  const firstOfMonth = new Date(year, month, 1);
  const startOffset  = firstOfMonth.getDay(); // 0 = Sun … 6 = Sat
  const gridStart    = new Date(year, month, 1 - startOffset);
  const todayKey     = toKey(new Date());

  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);

    const key       = toKey(date);
    const isOutside = date.getMonth() !== month;
    const isToday   = key === todayKey;

    const cell = document.createElement('div');
    cell.className    = 'day'
      + (isOutside ? ' outside' : '')
      + (isToday   ? ' today'   : '');
    cell.dataset.date = key;
    cell.setAttribute('role', 'gridcell');

    // Date number
    const dateEl = document.createElement('div');
    dateEl.className   = 'date';
    dateEl.textContent = String(date.getDate());

    // Events list
    const eventsWrap = document.createElement('div');
    eventsWrap.className = 'events';

    (schedule[key] ?? []).forEach(item => {
      const ev = document.createElement('div');
      ev.className       = 'event';
      ev.title           = 'Click to remove';
      ev.dataset.eventId = item.id;

      const titleEl = document.createElement('div');
      titleEl.className   = 'title';
      titleEl.textContent = item.title;

      const metaEl = document.createElement('div');
      metaEl.className   = 'meta';
      metaEl.textContent = item.time ?? '';

      ev.appendChild(titleEl);
      ev.appendChild(metaEl);
      ev.addEventListener('click', () => removeEvent(key, item.id));
      eventsWrap.appendChild(ev);
    });

    // Drag-and-drop handlers on each calendar cell
    cell.addEventListener('dragenter', () => cell.classList.add('drop-ok'));
    cell.addEventListener('dragleave', () => cell.classList.remove('drop-ok'));
    cell.addEventListener('dragover',  (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    cell.addEventListener('drop', (e) => {
      e.preventDefault();
      cell.classList.remove('drop-ok');
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      try { addEvent(key, JSON.parse(raw)); } catch { /* ignore bad payload */ }
    });

    cell.appendChild(dateEl);
    cell.appendChild(eventsWrap);
    gridEl.appendChild(cell);
  }
}


// ============================================================
//  CALENDAR  –  ACTIONS
// ============================================================

function addEvent(dateKey, recipe) {
  const item = {
    id:       crypto.randomUUID(),
    recipeId: recipe.recipeId,
    title:    recipe.title,
    time:     recipe.time,
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
  viewDate = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth() + delta,
    1
  );
  render();
}

function clearMonth() {
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  for (const key of Object.keys(schedule)) {
    const d = new Date(key + 'T00:00:00');
    if (d.getFullYear() === year && d.getMonth() === month) {
      delete schedule[key];
    }
  }
  persistSchedule();
  render();
}


// ============================================================
//  HELPERS
// ============================================================

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function loadSchedule() {
  try {
    const raw = localStorage.getItem('recipe_schedule_v1');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistSchedule() {
  localStorage.setItem('recipe_schedule_v1', JSON.stringify(schedule));
}

/** Escapes special HTML characters to prevent XSS from API data */
function escHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

function capitalise(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}


// ============================================================
//  INIT  –  run on page load
// ============================================================
render();

// Auto-search "chicken" so the sidebar has content immediately
(async () => {
  showSkeletons();
  try {
    const hits = await searchRecipes('chicken');
    renderRecipeCards(hits);
  } catch (err) {
    showError('Could not load recipes. Use the search bar above.');
  }
})();
