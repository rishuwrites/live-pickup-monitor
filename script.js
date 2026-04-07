/**
 * Lenskart Live Pickup Monitor — script.js
 *
 * Loads pickup schedule from data/pickups.json,
 * then updates the dashboard every second.
 *
 * Key functions:
 *   toMin(timeStr)         — converts "hh:mm AM/PM" → minutes since midnight
 *   normalizeFuture(s,now) — shifts a past start-time forward by 1440 min
 *                            so upcoming sorting wraps correctly past midnight
 *   buildSlotMap(arr)      — groups pickups that share the same window
 *   update()               — main render loop, called every 1 s
 */

// ─── State ───────────────────────────────────────────────────────────────────
let pickupData = [];   // filled after JSON fetch
let lastRunKey = "";   // detects changes in active pickups (for flash/shake)

// ─── Time helpers ─────────────────────────────────────────────────────────────

/**
 * Convert a 12-hour time string ("02:30 AM" / "12:00 AM") to minutes since
 * midnight.  12:xx AM → 0..59,  12:xx PM → 720..779.
 */
function toMin(t) {
  const [tm, ap] = t.split(" ");
  let [h, m]     = tm.split(":").map(Number);
  if (h === 12) h = 0;
  if (ap === "PM") h += 12;
  return h * 60 + m;
}

/**
 * If a slot's start has already passed today, wrap it to "tomorrow" by adding
 * 1440 minutes.  This keeps the upcoming list sorted correctly when current
 * time is near midnight.
 */
function normalizeFuture(startMin, nowMin) {
  return startMin <= nowMin ? startMin + 1440 : startMin;
}

// ─── Slot grouping ────────────────────────────────────────────────────────────

/**
 * Given an array of pickup objects that are NOT currently running,
 * groups them by their "start|end" key and returns a sorted array of slots.
 * Each slot: { start, end, names: [...], sortStart }
 */
function buildSlotMap(futureArr) {
  const map = {};
  futureArr.forEach(p => {
    const key = `${p.start}|${p.end}`;
    if (!map[key]) {
      map[key] = { start: p.start, end: p.end, names: [], sortStart: p.sortStart };
    }
    map[key].names.push(p.name);
  });
  return Object.values(map).sort((a, b) => a.sortStart - b.sortStart);
}

// ─── DOM helpers ──────────────────────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

function flashShake(el) {
  el.classList.add("flash", "shake");
  setTimeout(() => el.classList.remove("flash", "shake"), 600);
}

// ─── Main update loop ─────────────────────────────────────────────────────────

function update() {
  const now    = new Date();
  const curMin = now.getHours() * 60 + now.getMinutes();
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  // ── Clock ────────────────────────────────────────────────────────────────
  $("clock").innerText = now.toLocaleString("en-IN", {
    weekday: "long",
    day:     "numeric",
    month:   "numeric",
    year:    "numeric",
    hour:    "numeric",
    minute:  "2-digit",
    second:  "2-digit",
    hour12:  true,
  });

  // ── Classify pickups ──────────────────────────────────────────────────────
  const running = [];
  const future  = [];

  pickupData.forEach(p => {
    let s = toMin(p.start);
    let e = toMin(p.end);

    // Handle windows that cross midnight (e.g. 11:30 PM → 12:00 AM)
    if (e <= s) e += 1440;

    // Also handle the case where current time is in the "next day" portion
    // of a midnight-crossing window (curMin < s but window wraps).
    const inWindow =
      (curMin >= s && curMin < e) ||
      (e > 1440 && curMin < e - 1440); // early-morning side of a midnight wrap

    if (inWindow) {
      running.push({ ...p, startMin: s, endMin: e });
    } else {
      future.push({ ...p, sortStart: normalizeFuture(s, curMin) });
    }
  });

  // ── Running section ───────────────────────────────────────────────────────
  const runRow   = $("runningRow");
  const thirdRow = $("thirdRow");

  if (running.length) {
    thirdRow.style.display = "none";

    const first  = running[0];
    const remain = Math.max(0, first.endMin * 60 - nowSec);
    const total  = (first.endMin - first.startMin) * 60;
    const pct    = Math.min(100, Math.max(0, ((total - remain) / total) * 100));

    const names = running.map(x => x.name).join(", ");
    if (names !== lastRunKey) {
      flashShake(runRow);
      lastRunKey = names;
    }

    $("current").innerHTML = `
      <div class="time-row">
        <span class="alert-emoji">🚨</span>
        <span class="time-badge">${first.start} – ${first.end}</span>
        <span class="countdown-badge">⏱ ${Math.floor(remain / 60)}m ${remain % 60}s left</span>
      </div>
      ${names}
      <div class="progress"><div class="bar" style="width:${pct.toFixed(1)}%"></div></div>
    `;
  } else {
    thirdRow.style.display = "grid";
    $("current").innerText = "☕ No Active Pickups";
  }

  // ── Upcoming slots ────────────────────────────────────────────────────────
  const slots = buildSlotMap(future).slice(0, 3);

  ["next1", "next2", "next3"].forEach((id, i) => {
    const slot = slots[i];
    $(id).innerHTML = slot
      ? `⏳ <span class="time-badge">${slot.start} – ${slot.end}</span><br>${slot.names.join(", ")}`
      : "—";
  });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

/**
 * Fetch pickup data from JSON, then start the 1-second update loop.
 * Falls back gracefully if the fetch fails (e.g. running from file://).
 */
async function init() {
  try {
    const res  = await fetch("data/pickups.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    pickupData = await res.json();
  } catch (err) {
    console.warn("Could not load data/pickups.json — using empty schedule.", err);
    pickupData = [];
  }

  update();
  setInterval(update, 1000);
}

document.addEventListener("DOMContentLoaded", init);
