# Changelog

All notable changes to the Lenskart Live Pickup Monitor are documented here.

---

## [1.1.0] — 2026-04-07

### Added
- GitHub Actions workflow for automatic deployment to GitHub Pages
- Responsive CSS media queries for mobile devices
- `aria-live` regions for screen-reader accessibility
- Logo fallback: loads from `assets/` first, falls back to CDN URL

### Fixed
- **Midnight-crossing bug**: Slots like `11:30 PM – 12:00 AM` now correctly
  identified as "running" from both sides of midnight (e.g. at 11:45 PM and
  at 12:05 AM the next calendar day)
- **Upcoming sort**: `normalizeFuture()` wrapping now handles early-morning
  times correctly when the current time is past midnight
- **Inefficient DOM lookup**: Replaced repeated `pickupData.find()` calls
  inside the render loop with a pre-built slot map (`buildSlotMap`)
- Third-row hide/show now uses CSS `display` transition instead of abrupt jump

### Changed
- Split monolithic `index.html` into `index.html` + `style.css` + `script.js`
- Pickup schedule extracted to `data/pickups.json` — edit schedules without
  touching application logic
- Clock font size reduced slightly on desktop to fit one line
- Comments added to all key functions in `script.js`

---

## [1.0.0] — Initial release

- Live clock with IST locale
- Running pickup row with countdown timer and progress bar
- Three upcoming pickup slots
- Flash + shake animation on pickup change
- Animated runner emoji in footer
