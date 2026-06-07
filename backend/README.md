# Backend — GridSense India ML Server

The Flask API server and machine learning pipeline for electricity demand forecasting.

## Overview

Python-based backend providing:
- **Flask REST API** on `http://localhost:5000`
- **LSTM + LightGBM** ensemble machine learning models
- **Real-time weather integration** (OpenWeatherMap)
- **Model training & evaluation** pipeline

## Files

### Core API
- **server.py** — Flask application
  - `POST /predict` — Forecast demand for region/date/hour/weather
  - `GET /get_temperature` — Fetch real-time temperature
  - Static file serving (frontend folder)
  - CORS enabled for frontend communication

### ML Training
- **run_forecaster.py** — Model training script
  - Loads hourly demand data from Excel
  - Trains LSTM neural network (168-hour lookback, 3 LSTM layers)
  - Trains LightGBM ensemble (500 estimators, max_depth=8)
  - Evaluates models (MAE, RMSE, R², MAPE)
  - Generates performance plots to `outputs/`
  - Saves trained models as `.keras` files

- **SmartGrid_Forecaster_LSTM_LightGBM.ipynb** — Jupyter notebook
  - End-to-end analysis and model development
  - Feature engineering examples
  - Visualizations (actual vs predicted, error distribution)
  - Used for research and experimentation

### Utilities
- **weather_api.py** — OpenWeatherMap integration
  - Fetch current temperature for regions
  - Handle API errors gracefully
  - Fallback mechanisms

## Setup & Installation

### 1. Navigate to Backend Folder

```bash
cd backend
```

### 2. Create Virtual Environment (if not already created)

```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

Dependencies include:
- Flask, Flask-CORS — Web framework
- TensorFlow — Deep learning
- scikit-learn — ML preprocessing & metrics
- pandas, numpy — Data manipulation
- LightGBM, XGBoost — Gradient boosting
- requests — HTTP client (weather API)
- seaborn, matplotlib — Visualization
- openpyxl — Excel file I/O

## Running

### Start Flask Server

```bash
python server.py

# Expected output:
# WARNING: in use production server for development. Use a production WSGI server instead.
# Running on http://127.0.0.1:5000
```

The server listens on `http://localhost:5000` by default.

### For Production Deployment

Use a production WSGI server:

```bash
# Install gunicorn
pip install gunicorn

# Run with gunicorn (4 workers)
gunicorn -w 4 -b 0.0.0.0:5000 server:app
```

## API Endpoints

### POST /predict

**Purpose**: Forecast electricity demand

**Request Body** (JSON):
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

**Parameters**:
- `region` (string) — "North", "South", "East", "West", or "NorthEast"
- `month` (int) — 1–12 (1-indexed)
- `day_of_week` (int) — 0–6 (0=Monday, 6=Sunday)
- `hour` (int) — 0–23 (24-hour format)
- `temperature` (float) — °C, range: -10 to 55
- `is_holiday` (boolean) — true if national holiday

**Response** (JSON):
```json
{
  "predicted_demand_gw": 145.2,
  "confidence_low": 138.5,
  "confidence_high": 151.9,
  "hourly_forecast": [120.1, 118.5, ..., 145.2, ...],
  "regional_comparison": {
    "North": 145.2,
    "South": 112.0,
    "East": 72.5,
    "West": 128.3,
    "NorthEast": 22.1
  }
}
```

**Status Codes**:
- `200 OK` — Prediction successful
- `400 Bad Request` — Invalid input parameters
- `500 Internal Server Error` — Model loading or inference error

### GET /get_temperature

**Purpose**: Fetch real-time temperature for a region/date

**Query Parameters**:
```
?region=North&date=2024-06-08
```

- `region` (string) — Grid region (North, South, East, West, NorthEast)
- `date` (string) — YYYY-MM-DD format

**Response** (JSON):
```json
{
  "region": "North",
  "city": "New Delhi",
  "temperature_celsius": 34.2,
  "date": "2024-06-08"
}
```

**Error Response**:
```json
{
  "error": "Weather API unavailable. Please enter temperature manually.",
  "temperature_celsius": null
}
```

## Training Models

### One-Time Training

```bash
python run_forecaster.py
```

This script:
1. Loads data from Excel files
2. Splits into train/test (80/20 chronological, no shuffle)
3. Trains LSTM (epochs=100, batch_size=32)
4. Trains LightGBM (500 trees)
5. Evaluates both models
6. Saves models to `outputs/`
7. Generates plots:
   - `feature_importance_lgb.png`
   - `lstm_vs_predictions.png`
   - `error_distribution.png`
   - `regional_comparison.png`

### Data Requirements

Place these Excel files in the `backend/` folder before training:
- **hourlyLoadDataIndia.xlsx** — Hourly demand data (POSOCO)
  - Columns: Timestamp, North, South, East, West, NorthEast, National Hourly Demand
  - ~46,000+ rows (hourly, 5+ years)

- **monthly_temp.xlsx** — Monthly temperature data
  - Columns: Region, Month, Avg Temperature

### Jupyter Notebook Usage

For exploration & custom analysis:

```bash
jupyter notebook SmartGrid_Forecaster_LSTM_LightGBM.ipynb
```

Run cells sequentially. The notebook covers:
- Data loading & preprocessing
- Feature engineering
- LSTM architecture & training
- LightGBM comparison
- Performance evaluation plots

## Model Architecture

### LSTM Neural Network

```
Input (Sequence of 168 hours)
    ↓
LSTM Layer 1 (64 units, return_sequences=True)
    ↓ Dropout(0.2)
LSTM Layer 2 (32 units, return_sequences=True)
    ↓ Dropout(0.2)
LSTM Layer 3 (16 units)
    ↓ Dropout(0.2)
Dense Layer (32 units, ReLU)
    ↓
Dense Output (1 unit, Linear)
    ↓
Predicted Demand (GW)
```

**Training**:
- Optimizer: Adam (lr=0.001)
- Loss: Mean Squared Error (MSE)
- Callbacks: EarlyStopping, ReduceLROnPlateau

### LightGBM Regressor

- **Estimators**: 500
- **Max Depth**: 8
- **Num Leaves**: 31
- **Learning Rate**: 0.05
- **Subsample**: 0.8
- **Colsample**: 0.8

### Ensemble

The final prediction combines LSTM and LightGBM:
```
final_prediction = 0.6 * lstm_pred + 0.4 * lgb_pred
```

## Features Used in Models

1. **Temporal Features** (cyclical encoding):
   - `hour_sin`, `hour_cos` — Hour of day
   - `month_sin`, `month_cos` — Month
   - `dow_sin`, `dow_cos` — Day of week

2. **Contextual**:
   - `is_weekend` (boolean)
   - `is_holiday` (boolean)
   - `temperature_max` (°C)

3. **Historical**:
   - `National Hourly Demand` (previous 168 hours)
   - Lagged demand features

## Performance Metrics

### LSTM
- MAE: ~3.2 GW
- RMSE: ~4.0 GW
- R²: 0.90

### LightGBM
- MAE: ~3.7 GW
- RMSE: ~4.5 GW
- R²: 0.88

### Ensemble (Average)
- MAE: ~3.5 GW
- RMSE: ~4.2 GW
- R²: 0.89

## GPU Acceleration (Optional)

### Requirements

GPU training requires **CUDA** and **cuDNN**. For CPU inference (default), no GPU setup needed.

### NVIDIA GPU (Windows with WSL2)

1. Install WSL2 with Ubuntu
2. Install NVIDIA CUDA Toolkit
3. Install cuDNN library
4. Run `run_forecaster.py` — TensorFlow auto-detects GPU

### DirectML (Windows, Python 3.11 only)

```bash
# Python 3.11 only (not 3.13)
pip install tensorflow-directml

# Then edit run_forecaster.py to import before TensorFlow:
import tensorflow_directml as tf_directml
tf_directml.run()
import tensorflow as tf
```

### macOS (Metal Performance Shaders)

TensorFlow 2.5+ automatically uses Metal GPU acceleration on M1/M2 Macs.

## Troubleshooting

### ModuleNotFoundError: No module named 'tensorflow'

```bash
pip install tensorflow
```

### Model file not found (smartgrid_lstm_model.keras)

- Run `python run_forecaster.py` to train & save the model
- Ensure `outputs/` folder exists
- Check file permissions

### Weather API returns 401/403 error

- Verify OpenWeatherMap API key (if custom setup)
- Check internet connection
- API might be rate-limited — wait a few minutes

### Prediction returns "NaN" or infinite values

- Check input `temperature` parameter is numeric
- Verify `month` and `day_of_week` are in valid ranges
- Retrain model if model file is corrupted

### Server crashes on startup

Check `server.py` logs:
```bash
python -u server.py  # Unbuffered output
```

Common issues:
- Port 5000 already in use
- Missing Excel data files
- Corrupted model file

### Out of memory during training

Reduce batch size in `run_forecaster.py`:
```python
model.fit(X_train, y_train, batch_size=16, ...)  # Changed from 32
```

## File Structure

```
backend/
├── server.py                   # Flask API
├── run_forecaster.py           # Training script
├── weather_api.py              # Weather integration
├── requirements.txt            # Dependencies
├── SmartGrid_Forecaster_LSTM_LightGBM.ipynb
├── outputs/
│   ├── smartgrid_lstm_model.keras  # Trained LSTM
│   ├── smartgrid_lgb_model.pkl    # Trained LightGBM
│   ├── scaler.pkl                 # MinMax scaler
│   ├── feature_importance_lgb.png
│   ├── lstm_vs_predictions.png
│   └── ... (other plots & artifacts)
└── README.md  # This file
```

## Environment Variables (Optional)

You can set environment variables to customize behavior:

```bash
export FLASK_ENV=development  # or production
export FLASK_DEBUG=1
export OPENWEATHER_API_KEY=your_key_here
```

## Testing

### Test Endpoint Locally

```bash
# Test /predict
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "region": "North",
    "month": 6,
    "day_of_week": 2,
    "hour": 18,
    "temperature": 32.5,
    "is_holiday": false
  }'

# Test /get_temperature
curl "http://localhost:5000/get_temperature?region=North&date=2024-06-08"
```

## Logging

Flask logs are printed to console by default.

To enable file logging, add to `server.py`:

```python
import logging
logging.basicConfig(filename='server.log', level=logging.DEBUG)
```

## Next Steps / Improvements

- [ ] Add authentication (API keys)
- [ ] Implement caching for repeated queries
- [ ] Add database support (PostgreSQL/MongoDB)
- [ ] Deploy to cloud (AWS, GCP, Azure)
- [ ] Add more weather features (humidity, wind speed)
- [ ] Retrain models monthly with new data
- [ ] Add real-time prediction pipeline
- [ ] Create CI/CD pipeline for automated testing

---

**Backend last updated**: 2024-06-08
