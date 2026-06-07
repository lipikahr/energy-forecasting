# GridSense India — Electricity Demand Forecasting Dashboard

An advanced LSTM + LightGBM machine learning powered web application for forecasting electricity demand across Indian power grid regions in real-time.

## 📋 Project Overview

**GridSense India** predicts hourly electricity demand for the Indian national grid and its regional subdivisions (North, South, East, West, North-East) using:

- **Deep Learning**: LSTM (Long Short-Term Memory) neural networks for temporal pattern recognition
- **Gradient Boosting**: LightGBM for ensemble forecasting accuracy  
- **Weather Integration**: Real-time temperature data from OpenWeatherMap API
- **Interactive Dashboard**: Modern, responsive web UI built with HTML5, CSS3, JavaScript, and Chart.js

### Key Features

✅ **Regional Forecasts** — Predict demand for 5 Indian power grid regions separately or combined
✅ **24-Hour Trends** — Visualize hourly demand patterns for the selected day  
✅ **Holiday Override** — Adjust forecasts for national public holidays and weekends  
✅ **Confidence Intervals** — Understand prediction uncertainty with low/high bounds  
✅ **Live Weather** — Auto-fetch temperature from external weather API or enter manually  
✅ **Real-Time Status** — Color-coded load badges (Normal / Alert / Critical)  
✅ **IST Clock** — Display Indian Standard Time and maintain forecast timestamps  

---

## 📁 Project Structure

```
energy-forecasting/
├── frontend/                      # Web UI (HTML/CSS/JavaScript)
│   ├── index.html               # Dashboard layout & structure
│   ├── app.js                   # Application logic & interactivity
│   └── styles.css               # Responsive design system
│
├── backend/                      # Python ML models & API
│   ├── server.py                # Flask API server
│   ├── run_forecaster.py        # LSTM/LightGBM model trainer & predictor
│   ├── weather_api.py           # OpenWeatherMap temperature fetcher
│   ├── requirements.txt         # Python dependencies
│   ├── SmartGrid_Forecaster_LSTM_LightGBM.ipynb  # Model development notebook
│   └── outputs/                 # Model outputs, plots, saved models
│
├── venv/                         # Python virtual environment
├── requirements_no_directml.txt  # Frontend server dependencies (no GPU)
├── README.md                     # This file
└── .gitignore                    # Git exclusions

```

### Directory Breakdown

**Frontend (`frontend/`)**
- Standalone HTML/CSS/JavaScript web application
- No build step required — runs directly in browser
- Communicates with backend via REST API (CORS-enabled)
- Responsive design: desktop, tablet, mobile

**Backend (`backend/`)**
- Flask REST API server running on `http://localhost:5000`
- LSTM neural network model trained on 46,000+ hourly load records
- LightGBM ensemble for ensemble accuracy
- TensorFlow, scikit-learn, pandas data processing pipeline
- OpenWeatherMap API integration for real-time weather

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.11+** (3.13 confirmed working)
- **Node.js** (optional, for frontend tooling)
- **pip** (Python package manager)
- **Git** (for version control)
- **Internet connection** (for weather API calls)

### 1. Clone / Setup

```bash
# Navigate to the project directory
cd energy-forecasting

# Verify structure
ls -la
# Should see: frontend/, backend/, venv/, README.md, etc.
```

### 2. Activate Virtual Environment

The project includes a pre-configured `venv` with dependencies installed.

**Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

**Windows (CMD):**
```cmd
.\venv\Scripts\activate.bat
```

**macOS / Linux:**
```bash
source venv/bin/activate
```

Confirm activation — your prompt should show `(venv)` prefix.

### 3. Install / Update Dependencies (if needed)

```bash
# Navigate to backend folder
cd backend

# Install from requirements
pip install -r ../requirements_no_directml.txt

# Or manually for individual packages
pip install flask flask-cors requests tensorflow sklearn pandas numpy lightgbm xgboost seaborn matplotlib openpyxl

cd ..
```

### 4. Run Backend Server

```bash
# From project root, start Flask API
python backend/server.py

# Or run it directly from backend/
cd backend
python server.py

# Expected output:
# WARNING: in use production server for development. Use a production WSGI server instead.
# Running on http://127.0.0.1:5000
```

The backend server now listens on `http://localhost:5000`.

### 5. Open Frontend in Browser

In a **new terminal** (keep backend running):

```bash
# Navigate to frontend folder
cd frontend

# Start a simple HTTP server (Python 3+)
python -m http.server 8000

# Expected output:
# Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/)
```

Then open your browser and go to:
```
http://localhost:8000
```

The **GridSense India** dashboard loads. The app auto-connects to the backend at `http://localhost:5000`.

---

## 📊 Usage Guide

### Step 1: Select Grid Region

Click one of the 5 region pills at the top:
- **North** — Northern Grid  
- **South** — Southern Grid  
- **East** — Eastern Grid  
- **West** — Western Grid  
- **North-East** — North-Eastern Grid  

### Step 2: Pick Forecast Date

Use the **Forecast Date** date picker. The app fetches weather data automatically.
- Minimum: today
- Maximum: typically up to 7 days ahead (depending on API)

### Step 3: Select Hour

Drag the **Hour of Day** slider to choose an hour (0–23).
- Peak hours (7 PM–10 PM) are highlighted in amber
- Selected hour is shown in 12-hour format (e.g., "6:00 PM")

### Step 4: Input Temperature (°C)

Either:
- **Auto-fetch**: The app retrieves temperature from OpenWeatherMap if region & date are selected
- **Manual entry**: Type your expected temperature (range: -10 to 55°C)

### Step 5: Holiday Override (Optional)

Toggle **ON** if forecasting for a national public holiday:
- Republic Day, Independence Day, Diwali, etc.
- Reduces expected demand baseline

### Step 6: Click "Forecast Demand"

The app submits your inputs to the Flask backend. A progress bar animates while processing.

### Results

The dashboard displays:

1. **Predicted Electricity Demand** (GW)
   - Primary forecast value
   - Confidence interval (low/high bounds)
   - Status badge: Normal / Alert / Critical

2. **24-Hour Demand Curve**
   - Line chart showing hourly demand across the entire day
   - Golden line marks your selected hour
   - Interactive tooltips on hover

3. **Regional Demand Comparison**
   - Horizontal bar chart comparing all 5 regions
   - Selected region highlighted in navy blue

4. **Insight Strip**
   - **Peak Hour**: Time of maximum demand that day
   - **Temp Impact**: Temperature effect on demand (%)
   - **YoY Comparison**: vs. same day last year (GW delta)

---

## 🔧 Backend API Reference

### `POST /predict`

Predict electricity demand for a specific region, date, hour, and weather.

**Request:**
```json
{
  "region": "North",
  "month": 6,
  "day_of_week": 2,
  "hour": 18,
  "temperature": 32.5,
  "is_holiday": false
}
```

**Response:**
```json
{
  "predicted_demand_gw": 145.2,
  "confidence_low": 138.5,
  "confidence_high": 151.9,
  "hourly_forecast": [120.1, 118.5, 115.2, ..., 145.2, ...],
  "regional_comparison": {
    "North": 145.2,
    "South": 112.0,
    "East": 72.5,
    "West": 128.3,
    "NorthEast": 22.1
  }
}
```

### `GET /get_temperature`

Fetch real-time temperature from weather API.

**Query Parameters:**
```
?region=North&date=2024-06-08
```

**Response:**
```json
{
  "region": "North",
  "city": "New Delhi",
  "temperature_celsius": 34.2,
  "date": "2024-06-08"
}
```

---

## 📦 Dependencies

### Frontend
- **Chart.js** (CDN link in `index.html`)
- No npm/node setup required

### Backend

```
flask==3.1.3
flask-cors==6.0.3
requests==2.34.2
numpy==<recent>
pandas==<recent>
scikit-learn==<recent>
tensorflow==2.21.0  (or higher)
lightgbm==<recent>
xgboost==<recent>
seaborn==<recent>
matplotlib==<recent>
openpyxl==<recent>  (for Excel file I/O)
```

See `backend/../requirements_no_directml.txt` for exact pinned versions.

---

## 🤖 Machine Learning Model Details

### LSTM Neural Network

- **Architecture**: 1 input layer → 3 LSTM layers (64, 32, 16 units) → 2 Dense layers → 1 output
- **Lookback Window**: 168 hours (1 week)  
- **Training Data**: 46,000+ hourly load records from Grid India (POSOCO)
- **Features**: Hour sin/cos, month sin/cos, day-of-week sin/cos, is_weekend, temperature, historical demand
- **Optimizer**: Adam  
- **Loss**: Mean Squared Error (MSE)  
- **Callbacks**: Early stopping, learning rate reduction

### LightGBM Ensemble

- **Type**: Gradient boosting regressor
- **Max Depth**: 8  
- **Num Leaves**: 31  
- **Training Metric**: RMSE  
- Aggregated with LSTM for final prediction (average or weighted blend)

### Data Sources

- **Load Data**: `hourlyLoadDataIndia.xlsx` (POSOCO / Grid India)
- **Temperature**: `monthly_temp.xlsx` or real-time OpenWeatherMap API
- **Preprocessing**: MinMax scaling (0–1 range), date/time feature engineering

---

## 🔌 Environment & Configuration

### Python Environment Details

- **Python Version**: 3.11.9 or higher (tested on 3.13)
- **Virtual Environment**: Located in `venv/` folder
- **Package Manager**: pip

### If GPU Training Required (Optional)

GPU support (CUDA / DirectML) is **not required** for running predictions. The pre-trained model runs efficiently on CPU.

**To enable GPU (advanced):**

1. Install NVIDIA CUDA + cuDNN (NVIDIA GPUs only)
2. Or: Use WSL2 with CUDA on Windows
3. Or: Use TensorFlow-DirectML on Windows (Python 3.11 required)

For this project, CPU inference is sufficient.

---

## 📈 Model Performance

- **MAE (Mean Absolute Error)**: ~3.5 GW
- **RMSE (Root Mean Squared Error)**: ~4.2 GW
- **R² Score**: 0.88–0.92 depending on region
- **Inference Time**: <500 ms per prediction (CPU)

---

## 🛠️ Development & Customization

### Retraining the Model

```bash
cd backend
python run_forecaster.py
```

This script:
1. Loads hourly load + monthly temperature data
2. Trains LSTM + LightGBM models
3. Saves trained models to `outputs/`
4. Generates performance plots

### Updating Frontend

Edit files in `frontend/`:
- `index.html` — Layout & structure  
- `app.js` — JavaScript logic (modify `API_BASE` to change backend URL)
- `styles.css` — Design & theme

No build step needed — changes take effect on page refresh.

### Modifying API Endpoints

Edit `backend/server.py` to add new Flask routes or modify existing ones.

---

## 🐛 Troubleshooting

### Issue: "Cannot GET /" when opening frontend

**Solution:**
- Ensure frontend HTTP server is running (`python -m http.server 8000`)
- Check browser is accessing `http://localhost:8000` (not `file://`)

### Issue: "Failed to get forecast. Please ensure backend is running…"

**Solution:**
- Start backend: `python backend/server.py` from project root
- Confirm backend runs on `http://localhost:5000`
- Check CORS headers are enabled (already configured in `server.py`)

### Issue: "Weather API unavailable"

**Solution:**
- Enter temperature manually in the frontend
- Check internet connection
- Verify OpenWeatherMap API key (if self-hosted)

### Issue: Missing data files (hourlyLoadDataIndia.xlsx, etc.)

**Solution:**
- Ensure data files are in `backend/` folder
- See `run_forecaster.py` for expected file names
- Place Excel files in the backend directory before training

### Issue: TensorFlow not found

**Solution:**
```bash
pip install tensorflow
# Or for older Python:
pip install tensorflow==2.15.0
```

---

## 📝 License

This project is for **academic and educational purposes**. 

---

## 👥 Credits & References

- **Framework**: Flask, TensorFlow, LightGBM, scikit-learn
- **Data Source**: Grid India (POSOCO)
- **Weather API**: OpenWeatherMap
- **Frontend UI Library**: Chart.js, Google Fonts (Inter)
- **Models**: LSTM + Gradient Boosting Ensemble

---

## 📧 Support & Contributing

For issues, questions, or contributions:

1. Check this README for common troubleshooting
2. Review backend logs for errors  
3. Inspect browser DevTools console for frontend errors
4. Refer to individual source files for detailed documentation

**Last Updated**: 2024-06-08

---

## 🎯 Key Folders Quick Reference

| Folder | Purpose | Key Files |
|--------|---------|-----------|
| `frontend/` | Web UI assets | `index.html`, `app.js`, `styles.css` |
| `backend/` | ML models & API | `server.py`, `run_forecaster.py`, `weather_api.py` |
| `backend/outputs/` | Model artifacts | Saved `.keras` models, plots, CSVs |
| `venv/` | Python environment | Auto-managed by pip |

---

**Enjoy forecasting India's electricity demand with GridSense! ⚡**
