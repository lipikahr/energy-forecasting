# Frontend — GridSense India Dashboard

The web-based user interface for electricity demand forecasting.

## Overview

A modern, responsive web application built with **HTML5**, **CSS3**, and **vanilla JavaScript** (no framework). 

- **Chart.js** for interactive data visualization
- **CORS-enabled** REST API communication with Flask backend
- **Real-time IST clock** and date/time handling
- **Responsive design**: Desktop, tablet, and mobile optimized

## Files

- **index.html** — Main page structure (400+ lines)
  - Header with IST clock
  - Input panel (region, date, hour, temperature, holiday toggle)
  - Results section (charts, predictions, insights)
  - Footer

- **app.js** — Application logic (500+ lines)
  - State management
  - Event handlers (region selection, date picker, hour slider, form submission)
  - API calls to Flask backend (`POST /predict`, `GET /get_temperature`)
  - Chart.js rendering (line chart for 24-hour demand, bar chart for regions)
  - Live clock updates (IST timezone)

- **styles.css** — Complete design system (1000+ lines)
  - CSS Custom Properties (color palette, spacing, shadows)
  - Responsive grid layouts
  - Animations (slideUp, pulse-glow, shake, spin)
  - Interactive components (sliders, toggles, buttons)
  - Media queries for tablet/mobile

## Running

### Option 1: Python HTTP Server (Recommended)

```bash
# In the frontend folder
python -m http.server 8000

# Open browser:
# http://localhost:8000
```

### Option 2: Live Server (VS Code Extension)

Install **Live Server** extension and right-click `index.html` → "Open with Live Server"

### Option 3: Docker / Any Web Server

```bash
# Using any web server (nginx, apache, etc.)
# Serve the frontend/ folder as the document root
# Access at: http://localhost:XXXX
```

## Configuration

### API Base URL

The backend API is hardcoded in `app.js`:

```javascript
const API_BASE = 'http://localhost:5000';
```

To change the backend URL:
1. Edit `app.js` line 26
2. Update `API_BASE` to your Flask server's address
3. Example: `const API_BASE = 'http://192.168.1.100:5000';`

### Timezone

The dashboard displays **Indian Standard Time (IST = UTC+5:30)**.
Modify the `updateClock()` function in `app.js` to change timezone.

## Features

### Input Panel
- **Region Selection** — 5 region pills (North, South, East, West, North-East)
- **Date Picker** — Select forecast date (min: today, max: ~7 days)
- **Hour Slider** — Choose hour (0–23) with gradient indicating time of day
- **Temperature Input** — Manual entry or auto-fetch from weather API
- **Holiday Toggle** — Mark as public holiday to adjust forecast baseline

### Results Display
- **Primary Prediction Card** — Forecast value (GW), confidence interval, status badge
- **24-Hour Demand Chart** — Line chart showing hourly demand pattern
- **Regional Comparison Chart** — Horizontal bar chart for all 5 regions
- **Insight Strip** — Peak hour, temperature impact, YoY comparison

### Status Badges
- 🟢 **Normal** — Demand within seasonal baseline
- 🟡 **Alert** — Demand 10–20% above baseline
- 🔴 **Critical** — Demand >20% above baseline

## Architecture

```
Frontend (HTML/CSS/JS)
    ↓ (REST API calls)
Flask Backend (Python)
    ↓ (loads model)
Trained LSTM/LightGBM Models
    ↓ (predictions)
JSON Response
    ↓ (Chart.js visualization)
User Dashboard
```

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## Customization

### Change Color Palette

Edit CSS variables in `styles.css` (lines 4–40):

```css
:root {
  --navy: #1A3C6E;
  --blue: #2E75B6;
  --amber: #B7770D;
  /* ... etc ... */
}
```

### Modify Chart Styling

Chart options are in `app.js` functions:
- `renderHourlyChart()` — 24-hour line chart
- `renderRegionalChart()` — Regional bar chart

### Add New Region

1. Add region to `REGION_LABELS` object in `app.js`
2. Add corresponding pill button in `index.html`
3. Update backend regional fractions in `server.py`

## Performance

- Page load: <500 ms
- API response: 200–500 ms (depends on backend)
- Chart rendering: <1000 ms
- Total forecast submission to results display: ~2 seconds

## Dependencies

All dependencies are CDN-based or built-in:
- **Chart.js** — Loaded via CDN (no npm required)
- **Browser APIs** — Fetch, Date, LocalStorage, etc.

## Troubleshooting

### Dashboard displays but charts won't load
- Check browser console (F12) for JavaScript errors
- Verify backend is running and accessible
- Ensure `API_BASE` URL is correct in `app.js`

### API calls fail with CORS error
- Backend must have CORS enabled (already configured in `server.py`)
- Check backend logs for error messages

### Temperature auto-fetch not working
- Weather API might be unavailable or rate-limited
- User can enter temperature manually
- Check weather_api.py configuration

### Date picker not showing future dates
- Browser's date input may enforce date limitations
- Try a different browser or OS

---

**Frontend last updated**: 2024-06-08
