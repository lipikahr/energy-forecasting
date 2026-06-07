/**
 * GridSense India — Application Logic
 * Handles all interactivity, API calls, Chart.js rendering, and live clock.
 */

(function () {
  'use strict';

  // ============================================
  // Constants
  // ============================================
  const API_BASE = 'http://localhost:5000';
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const REGION_LABELS = {
    North: 'Northern Grid',
    South: 'Southern Grid',
    East: 'Eastern Grid',
    West: 'Western Grid',
    NorthEast: 'North-Eastern Grid',
  };

  // Seasonal average baselines per region (GW) — for status badge comparison
  const SEASONAL_AVG = {
    North: 145, South: 112, East: 72, West: 128, NorthEast: 22,
  };

  // ============================================
  // State
  // ============================================
  let state = {
    region: null,
    date: null,
    month: null,
    dayOfWeek: null,
    hour: 12,
    temperature: null,
    tempAutoFetched: false,
    isHoliday: false,
    lastPrediction: null,
  };

  let hourlyChart = null;
  let regionalChart = null;

  // ============================================
  // DOM References
  // ============================================
  const $ = (id) => document.getElementById(id);

  const dom = {
    headerTime: $('header-time'),
    headerDate: $('header-date'),
    regionPills: $('region-pills'),
    forecastDate: $('forecast-date'),
    chipMonth: $('chip-month'),
    chipMonthText: $('chip-month-text'),
    chipDay: $('chip-day'),
    chipDayText: $('chip-day-text'),
    hourSlider: $('hour-slider'),
    hourDisplay: $('hour-display'),
    hourDisplayText: $('hour-display-text'),
    tempInput: $('temp-input'),
    tempStatus: $('temp-status'),
    tempStatusText: $('temp-status-text'),
    holidayCheckbox: $('holiday-checkbox'),
    holidayWarning: $('holiday-warning'),
    forecastBtn: $('forecast-btn'),
    progressWrapper: $('progress-wrapper'),
    progressBar: $('progress-bar'),
    resultsSection: $('results-section'),
    predictionValue: $('prediction-value'),
    predictionContext: $('prediction-context'),
    predictionRangeText: $('prediction-range-text'),
    statusBadge: $('status-badge'),
    statusBadgeText: $('status-badge-text'),
    hourlyChartCanvas: $('hourly-chart'),
    regionalChartCanvas: $('regional-chart'),
    insightPeak: $('insight-peak'),
    insightTemp: $('insight-temp'),
    insightYoy: $('insight-yoy'),
  };

  // ============================================
  // Live IST Clock
  // ============================================
  function updateClock() {
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const ist = new Date(utc + istOffset);

    const hours = ist.getHours();
    const mins = ist.getMinutes();
    const secs = ist.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;

    dom.headerTime.textContent =
      `${h12}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} ${ampm}`;
    dom.headerDate.textContent =
      `${DAYS[ist.getDay()]}, ${ist.getDate()} ${MONTHS[ist.getMonth()]} ${ist.getFullYear()}`;
  }

  // ============================================
  // Region Selection
  // ============================================
  function initRegionPills() {
    const pills = dom.regionPills.querySelectorAll('.region-pill');
    pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        // Deactivate all
        pills.forEach((p) => p.classList.remove('active'));
        // Activate clicked
        pill.classList.add('active');
        state.region = pill.dataset.region;
        tryFetchTemperature();
      });
    });
  }

  // ============================================
  // Date Picker
  // ============================================
  function initDatePicker() {
    // Set min date to today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dom.forecastDate.min = `${yyyy}-${mm}-${dd}`;

    dom.forecastDate.addEventListener('change', () => {
      const val = dom.forecastDate.value;
      if (!val) return;

      const parts = val.split('-');
      const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));

      state.date = val;
      state.month = dateObj.getMonth() + 1; // 1-indexed
      state.dayOfWeek = dateObj.getDay(); // 0=Sunday

      // Update chips
      dom.chipMonthText.textContent = MONTHS[dateObj.getMonth()];
      dom.chipMonth.classList.add('visible');

      dom.chipDayText.textContent = DAYS[dateObj.getDay()];
      dom.chipDay.classList.add('visible');

      tryFetchTemperature();
    });
  }

  // ============================================
  // Hour Slider
  // ============================================
  function initHourSlider() {
    function updateHourDisplay() {
      const h = parseInt(dom.hourSlider.value);
      state.hour = h;

      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      dom.hourDisplayText.textContent = `${h12}:00 ${ampm}`;

      // Peak indicator (7 PM to 10 PM = hours 19-22)
      const isPeak = h >= 19 && h <= 22;
      dom.hourDisplay.classList.toggle('peak', isPeak);
    }

    dom.hourSlider.addEventListener('input', updateHourDisplay);
    updateHourDisplay();
  }

  // ============================================
  // Temperature Auto-Fetch
  // ============================================
  let tempFetchController = null;

  function tryFetchTemperature() {
    if (!state.region || !state.date) return;

    // Cancel any in-flight request
    if (tempFetchController) {
      tempFetchController.abort();
    }

    tempFetchController = new AbortController();

    // Show loading state
    setTempStatus('loading', 'Fetching temperature…');

    const url = `${API_BASE}/get_temperature?region=${encodeURIComponent(state.region)}&date=${encodeURIComponent(state.date)}`;

    fetch(url, { signal: tempFetchController.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.temperature_celsius != null) {
          dom.tempInput.value = data.temperature_celsius;
          state.temperature = data.temperature_celsius;
          state.tempAutoFetched = true;
          setTempStatus('auto', `Auto-fetched via Weather API — ${data.city}`);
        } else {
          throw new Error('No temperature data');
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        state.tempAutoFetched = false;
        setTempStatus('error', 'Weather API unavailable — please enter temperature manually');
      });
  }

  function setTempStatus(type, text) {
    dom.tempStatus.className = `temp-status ${type}`;

    // Update icon
    const icons = {
      auto: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>',
      manual: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
      loading: '<div class="temp-spinner"></div>',
    };

    dom.tempStatus.innerHTML = `${icons[type] || ''}<span id="temp-status-text">${text}</span>`;
  }

  function initTempInput() {
    dom.tempInput.addEventListener('input', () => {
      state.temperature = parseFloat(dom.tempInput.value) || null;
      if (state.tempAutoFetched) {
        state.tempAutoFetched = false;
        setTempStatus('manual', 'Enter manually');
      }
    });
  }

  // ============================================
  // Holiday Toggle
  // ============================================
  function initHolidayToggle() {
    dom.holidayCheckbox.addEventListener('change', () => {
      state.isHoliday = dom.holidayCheckbox.checked;
      dom.holidayWarning.classList.toggle('visible', state.isHoliday);
    });
  }

  // ============================================
  // Forecast Submission
  // ============================================
  function initForecastButton() {
    dom.forecastBtn.addEventListener('click', () => {
      // Validate inputs
      if (!state.region) {
        shakeElement(dom.regionPills);
        return;
      }
      if (!state.date) {
        shakeElement(dom.forecastDate);
        return;
      }
      if (state.temperature == null || isNaN(state.temperature)) {
        shakeElement(dom.tempInput);
        return;
      }

      // Start loading animation
      dom.forecastBtn.classList.add('loading');
      dom.forecastBtn.innerHTML = `
        <div class="temp-spinner" style="border-color: rgba(255,255,255,0.3); border-top-color: white;"></div>
        Processing Forecast…
      `;
      dom.progressWrapper.classList.add('active');
      dom.progressBar.classList.remove('filling');

      // Trigger progress bar animation
      requestAnimationFrame(() => {
        dom.progressBar.classList.add('filling');
      });

      // Call API after 1.5s visual delay
      setTimeout(() => {
        callPredictAPI();
      }, 1500);
    });
  }

  function shakeElement(el) {
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = 'shake 0.4s ease';
    setTimeout(() => { el.style.animation = ''; }, 400);
  }

  // Add shake animation dynamically
  const shakeStyle = document.createElement('style');
  shakeStyle.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-8px); }
      40% { transform: translateX(8px); }
      60% { transform: translateX(-4px); }
      80% { transform: translateX(4px); }
    }
  `;
  document.head.appendChild(shakeStyle);

  async function callPredictAPI() {
    // Map JS day (0=Sun) to Python day (0=Mon)
    const pyDow = state.dayOfWeek === 0 ? 6 : state.dayOfWeek - 1;

    const body = {
      region: state.region,
      date: state.date,
      month: state.month,
      day_of_week: pyDow,
      hour: state.hour,
      temperature: state.temperature,
      is_holiday: state.isHoliday,
    };

    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      state.lastPrediction = data;
      renderResults(data);
    } catch (err) {
      console.error('Prediction API error:', err);
      alert('Failed to get forecast. Please ensure the backend server is running at http://localhost:5000');
    } finally {
      resetForecastButton();
    }
  }

  function resetForecastButton() {
    dom.forecastBtn.classList.remove('loading');
    dom.forecastBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z"/></svg>
      Forecast Demand
    `;
    dom.progressWrapper.classList.remove('active');
    dom.progressBar.classList.remove('filling');
    dom.progressBar.style.width = '0%';
  }

  // ============================================
  // Results Rendering
  // ============================================
  function renderResults(data) {
    const {
      predicted_demand_gw: demand,
      confidence_low: low,
      confidence_high: high,
      hourly_forecast: hourly,
      regional_comparison: regional,
    } = data;

    // Parse date for display
    const dateParts = state.date.split('-');
    const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    const dayName = DAYS[dateObj.getDay()];
    const monthName = MONTHS[dateObj.getMonth()];
    const dateStr = `${dayName}, ${dateObj.getDate()} ${monthName} ${dateObj.getFullYear()}`;

    const h12 = state.hour % 12 || 12;
    const ampm = state.hour >= 12 ? 'PM' : 'AM';
    const timeStr = `${h12}:00 ${ampm}`;

    // Primary prediction
    dom.predictionValue.textContent = demand.toFixed(1);
    dom.predictionContext.textContent = `${REGION_LABELS[state.region] || state.region} | ${dateStr} | ${timeStr}`;
    dom.predictionRangeText.textContent = `Range: ${low.toFixed(1)} GW — ${high.toFixed(1)} GW`;

    // Status badge
    const avg = SEASONAL_AVG[state.region] || 100;
    const pctAbove = ((demand - avg) / avg) * 100;

    if (pctAbove > 20) {
      dom.statusBadge.className = 'status-badge critical';
      dom.statusBadge.querySelector('svg').innerHTML = '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>';
      dom.statusBadgeText.textContent = 'Critical Peak — Action Required';
    } else if (pctAbove > 10) {
      dom.statusBadge.className = 'status-badge high';
      dom.statusBadge.querySelector('svg').innerHTML = '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>';
      dom.statusBadgeText.textContent = 'High Load — Alert';
    } else {
      dom.statusBadge.className = 'status-badge normal';
      dom.statusBadge.querySelector('svg').innerHTML = '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>';
      dom.statusBadgeText.textContent = 'Normal Load';
    }

    // Render charts
    renderHourlyChart(hourly, state.hour);
    renderRegionalChart(regional, state.region);

    // Insight strip
    renderInsights(hourly, demand, avg);

    // Show results section
    dom.resultsSection.classList.remove('visible');
    // Force reflow
    void dom.resultsSection.offsetWidth;
    dom.resultsSection.classList.add('visible');

    // Scroll into view
    setTimeout(() => {
      dom.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  // ============================================
  // Chart.js — 24-Hour Demand Curve
  // ============================================
  const verticalLinePlugin = {
    id: 'verticalLine',
    afterDatasetsDraw(chart) {
      const selectedHour = chart.options.plugins.verticalLine?.hour;
      if (selectedHour == null) return;

      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      const point = meta.data[selectedHour];
      if (!point) return;

      const { x } = point;
      const yAxis = chart.scales.y;

      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = '#B7770D';
      ctx.lineWidth = 2;
      ctx.moveTo(x, yAxis.top);
      ctx.lineTo(x, yAxis.bottom);
      ctx.stroke();
      ctx.restore();
    },
  };

  Chart.register(verticalLinePlugin);

  function renderHourlyChart(hourly, selectedHour) {
    if (hourlyChart) hourlyChart.destroy();

    const labels = Array.from({ length: 24 }, (_, i) => {
      const h = i % 12 || 12;
      const ampm = i >= 12 ? 'PM' : 'AM';
      return `${h} ${ampm}`;
    });

    // Highlight selected point
    const pointBg = hourly.map((_, i) =>
      i === selectedHour ? '#B7770D' : 'transparent'
    );
    const pointRadius = hourly.map((_, i) =>
      i === selectedHour ? 6 : 0
    );
    const pointBorder = hourly.map((_, i) =>
      i === selectedHour ? '#B7770D' : 'transparent'
    );

    hourlyChart = new Chart(dom.hourlyChartCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Demand (GW)',
          data: hourly,
          fill: true,
          borderColor: '#1A3C6E',
          backgroundColor: createGradient(dom.hourlyChartCanvas, '#1A3C6E', 0.15),
          borderWidth: 2.5,
          tension: 0.4,
          pointBackgroundColor: pointBg,
          pointBorderColor: pointBorder,
          pointRadius: pointRadius,
          pointHoverRadius: 6,
          pointBorderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1200,
          easing: 'easeOutQuart',
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1A3C6E',
            titleFont: { family: 'Inter', size: 12 },
            bodyFont: { family: 'Inter', size: 13, weight: '600' },
            cornerRadius: 8,
            padding: 10,
            callbacks: {
              label: (ctx) => `${ctx.parsed.y.toFixed(1)} GW`,
            },
          },
          verticalLine: { hour: selectedHour },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Inter', size: 10 },
              color: '#718096',
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 12,
            },
          },
          y: {
            grid: { color: '#F0F0F0', lineWidth: 1 },
            border: { display: false },
            ticks: {
              font: { family: 'Inter', size: 10 },
              color: '#718096',
              callback: (v) => `${v} GW`,
            },
          },
        },
      },
    });
  }

  function createGradient(canvas, color, alpha) {
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.parentElement.clientHeight || 280);
    gradient.addColorStop(0, hexToRgba(color, alpha));
    gradient.addColorStop(1, hexToRgba(color, 0.01));
    return gradient;
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // ============================================
  // Chart.js — Regional Comparison Bar Chart
  // ============================================
  function renderRegionalChart(regional, selectedRegion) {
    if (regionalChart) regionalChart.destroy();

    const regionKeys = ['North', 'South', 'East', 'West', 'NorthEast'];
    const regionDisplayNames = ['North', 'South', 'East', 'West', 'North-East'];

    const values = regionKeys.map((k) => regional[k] || 0);
    const colors = regionKeys.map((k) =>
      k === selectedRegion ? '#1A3C6E' : '#A8C8E8'
    );
    const borderColors = regionKeys.map((k) =>
      k === selectedRegion ? '#142E54' : '#8BB8DE'
    );

    regionalChart = new Chart(dom.regionalChartCanvas, {
      type: 'bar',
      data: {
        labels: regionDisplayNames,
        datasets: [{
          label: 'Demand (GW)',
          data: values,
          backgroundColor: colors,
          borderColor: borderColors,
          borderWidth: 1,
          borderRadius: 6,
          barThickness: 28,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1000,
          easing: 'easeOutQuart',
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1A3C6E',
            titleFont: { family: 'Inter', size: 12 },
            bodyFont: { family: 'Inter', size: 13, weight: '600' },
            cornerRadius: 8,
            padding: 10,
            callbacks: {
              label: (ctx) => `${ctx.parsed.x.toFixed(1)} GW`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: '#F0F0F0', lineWidth: 1 },
            border: { display: false },
            ticks: {
              font: { family: 'Inter', size: 10 },
              color: '#718096',
              callback: (v) => `${v} GW`,
            },
          },
          y: {
            grid: { display: false },
            ticks: {
              font: { family: 'Inter', size: 12, weight: '600' },
              color: '#1A1A1A',
            },
          },
        },
      },
    });
  }

  // ============================================
  // Insight Strip
  // ============================================
  function renderInsights(hourly, demand, seasonalAvg) {
    // Peak hour
    let peakVal = 0;
    let peakHour = 0;
    hourly.forEach((v, i) => {
      if (v > peakVal) { peakVal = v; peakHour = i; }
    });
    const peakH12 = peakHour % 12 || 12;
    const peakAmPm = peakHour >= 12 ? 'PM' : 'AM';
    dom.insightPeak.textContent = `${peakH12}:00 ${peakAmPm}`;

    // Temperature impact
    const baselineTemp = 25;
    const currentTemp = state.temperature || 30;
    const tempDiffPct = ((currentTemp - baselineTemp) / baselineTemp * 100 * 0.8).toFixed(0);
    const sign = tempDiffPct >= 0 ? '+' : '';
    dom.insightTemp.textContent = `${sign}${tempDiffPct}% vs baseline`;

    // Year-over-year comparison (simulated)
    const yoyDelta = (demand * 0.025 + ((state.month || 1) - 6) * 0.3).toFixed(1);
    const yoySign = yoyDelta >= 0 ? '+' : '';
    dom.insightYoy.textContent = `${yoySign}${yoyDelta} GW`;
  }

  // ============================================
  // Initialization
  // ============================================
  function init() {
    updateClock();
    setInterval(updateClock, 1000);

    initRegionPills();
    initDatePicker();
    initHourSlider();
    initTempInput();
    initHolidayToggle();
    initForecastButton();

    // Set default temperature status
    setTempStatus('manual', 'Enter manually');
  }

  // Start the app
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
