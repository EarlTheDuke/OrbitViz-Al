# 🛰️ OrbitViz AI

A stunning real-time 3D visualization of satellites, space stations, and orbital debris with AI-powered predictions. Track thousands of man-made objects orbiting Earth with beautiful graphics, mission control experience, and intelligent analytics.

![OrbitViz AI](https://img.shields.io/badge/OrbitViz-AI-00d4ff?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)
![Three.js](https://img.shields.io/badge/Three.js-r160-black?style=flat-square&logo=three.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat-square&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.10+-3776ab?style=flat-square&logo=python)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwindcss)

## ✨ Features

### Phase 1 ✅ Core Visualization
- 🌍 **3D Earth Globe** - Beautiful textured Earth with clouds and atmospheric glow
- 📡 **Real-Time Tracking** - Live positions of satellites using TLE data from CelesTrak
- 🔍 **Search & Filter** - Find satellites by name, NORAD ID, type, or altitude
- 💫 **Orbital Paths** - Visualize complete orbital trajectories
- 🖱️ **Interactive** - Hover for quick info, click for detailed satellite data
- 📊 **Live Dashboard** - Real-time statistics and system status
- 🎨 **Futuristic UI** - Dark theme with cyber aesthetics

### Phase 2 ✅ Advanced Features
- ⏰ **Time Controls** - Replay historical orbits or preview future positions
- ⚙️ **Settings Panel** - Customize visualization (colors, effects, performance)
- 📥 **Data Export** - Export satellite data to CSV for analysis
- ⚠️ **Collision Alerts** - Real-time proximity warnings
- 📱 **Mobile Responsive** - Works on tablets and phones

### Phase 3 ✅ AI/ML Backend
- 🤖 **Python FastAPI Backend** - High-performance API server
- 🔮 **Orbital Predictions** - Calculate future satellite positions
- 💥 **Collision Risk Analysis** - AI-powered conjunction detection
- 📉 **Re-entry Predictions** - Estimate orbital decay and re-entry dates
- 📊 **Debris Density Analysis** - Statistical analysis by altitude

### Phase 4 ✅ Notifications & Immersive Experience
- 🔔 **Push Notifications** - Browser alerts for satellite passes and collision warnings
- 📣 **Notification Center** - In-app notification history with filters and sound controls
- ⏰ **Pass Reminders** - Set reminders for upcoming satellite flyovers
- 🌐 **WebXR Support** - VR/AR mode for immersive satellite visualization
- 🎧 **Audio Alerts** - Customizable sound effects for different alert types

### Phase 5 ✅ AI Intelligence & Global Reach
- 🧠 **Anomaly Detection Engine** - ML-powered detection of orbital maneuvers, decay anomalies, and unusual behavior
- 📊 **Fleet Analysis** - Batch satellite analysis with severity classification
- 🔬 **Behavior Classifiers** - Velocity change detection, altitude deviation tracking, tumbling detection
- 🌍 **Multi-language Support** - 10 languages including English, Spanish, French, German, Chinese, Japanese, Russian
- 🌐 **RTL Support** - Right-to-left language support (Arabic)
- 📈 **ML Model Dashboard** - Real-time model accuracy and status monitoring

### Coming in Phase 6
- 🛸 **Space Weather Integration** - Solar activity impact on satellites
- 📡 **Ground Station Coverage** - Visibility analysis for communication
- 🔗 **API Integrations** - Space-Track.org, N2YO, and more

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.10+ (for backend)
- npm or yarn

### Frontend Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will open at `http://localhost:3000`

### Backend Installation (Optional - for AI features)

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --port 8000
```

The backend API will be available at `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`

## 🎮 Controls

| Action | Control |
|--------|---------|
| Rotate | Left-click + drag |
| Zoom | Scroll wheel |
| Pan | Right-click + drag |
| Select satellite | Click on satellite |
| Search | Top search bar |
| Filter | Left sidebar |
| Time travel | Bottom time controls |
| Toggle pause | Space bar |
| Toggle orbits | O key |
| Toggle labels | L key |
| Notifications | Bell icon |
| VR/AR mode | Headset icon (if supported) |

## 📡 Data Sources

- **CelesTrak.org** - TLE (Two-Line Element) data for orbital mechanics
- **NASA Blue Marble** - Earth textures
- All data is fetched in real-time with no API keys required!

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| Three.js + R3F | 3D Rendering |
| satellite.js | Orbital Mechanics |
| Zustand | State Management |
| Framer Motion | Animations |
| Tailwind CSS | Styling |
| Vite | Build Tool |

### Backend
| Technology | Purpose |
|------------|---------|
| FastAPI | Web Framework |
| SGP4 | Orbital Propagation |
| NumPy/SciPy | Numerical Computing |
| SQLite | Data Caching |
| Pydantic | Data Validation |

## 📁 Project Structure

```
OrbitViz AI/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Globe/       # 3D scene components
│   │   │   │   ├── Scene.jsx
│   │   │   │   ├── Earth.jsx
│   │   │   │   ├── Atmosphere.jsx
│   │   │   │   └── Satellites.jsx
│   │   │   └── UI/          # Interface components
│   │   │       ├── TopBar.jsx
│   │   │       ├── Sidebar.jsx
│   │   │       ├── Dashboard.jsx
│   │   │       ├── SatelliteInfo.jsx
│   │   │       ├── TimeControls.jsx
│   │   │       ├── SettingsPanel.jsx
│   │   │       ├── ExportPanel.jsx
│   │   │       ├── CollisionAlerts.jsx
│   │   │       ├── AIPredictions.jsx
│   │   │       ├── NotificationCenter.jsx
│   │   │       ├── VRButton.jsx
│   │   │       ├── AnomalyPanel.jsx
│   │   │       ├── LanguageSelector.jsx
│   │   │       └── ...
│   │   ├── services/
│   │   │   ├── satelliteService.js
│   │   │   ├── apiService.js
│   │   │   ├── collisionService.js
│   │   │   ├── notificationService.js
│   │   │   ├── anomalyService.js
│   │   │   └── i18n.js
│   │   ├── stores/
│   │   │   └── useStore.js
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
│
└── backend/                  # Python FastAPI backend
    ├── app/
    │   ├── main.py          # FastAPI app entry
    │   ├── config.py        # Configuration
    │   ├── routers/
    │   │   ├── satellites.py
    │   │   ├── predictions.py
    │   │   └── analysis.py
    │   └── services/
    │       ├── cache.py
    │       └── data_fetcher.py
    └── requirements.txt
```

## 🌟 Satellite Types

| Type | Color | Description |
|------|-------|-------------|
| 🟢 Satellite | Green | Active operational satellites |
| 🟠 Station | Orange | Space stations (ISS, Tiangong, etc.) |
| 🔴 Debris | Red | Space debris and fragments |
| 🟣 Rocket Body | Purple | Spent rocket stages |

## 🔌 API Endpoints

When the backend is running:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/satellites` | GET | Get all satellites |
| `/api/satellites/{id}` | GET | Get specific satellite |
| `/api/predictions/orbit/{id}` | GET | Get orbital predictions |
| `/api/analysis/conjunctions/{id}` | GET | Analyze collision risks |
| `/api/analysis/reentry/{id}` | GET | Predict re-entry |
| `/api/analysis/debris-density` | GET | Get debris statistics |
| `/api/anomaly/analyze/{id}` | GET | Analyze satellite for anomalies |
| `/api/anomaly/batch` | GET | Run batch fleet analysis |
| `/api/anomaly/recent` | GET | Get recent anomaly detections |
| `/api/anomaly/statistics` | GET | Get ML model statistics |
| `/health` | GET | Backend health check |
| `/docs` | GET | OpenAPI documentation |

## 🔮 Roadmap

- [x] **Phase 1**: Core visualization with real-time tracking
- [x] **Phase 2**: Advanced filters, time controls, export features
- [x] **Phase 3**: Python backend with AI/ML predictions
- [x] **Phase 4**: Push notifications, WebXR support, notification center
- [x] **Phase 5**: Anomaly detection, fleet analysis, internationalization
- [ ] **Phase 6**: Space weather, ground stations, external API integrations

## 🌐 Deploy Your Own

### Deploy to Vercel (Free - Recommended)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit"
   gh repo create orbitviz-ai --public --push
   ```

2. **Deploy on Vercel:**
   - Go to [vercel.com](https://vercel.com) and sign in with GitHub
   - Click "Add New Project"
   - Import your `orbitviz-ai` repository
   - Set **Root Directory** to `frontend`
   - Click "Deploy"
   - Your app will be live at `your-project.vercel.app`!

### Deploy to Netlify (Alternative)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

1. Go to [netlify.com](https://netlify.com) and sign in
2. Drag & drop your `frontend/dist` folder (after running `npm run build`)
3. Or connect your GitHub repo with base directory set to `frontend`

### Environment Variables (Optional)

If you want to connect to a backend API, set these in your deployment:

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL (e.g., `https://your-api.railway.app`) |

---

## 📜 License

MIT License - feel free to use this for learning, personal projects, or commercial applications.

## 🙏 Acknowledgments

- [CelesTrak](https://celestrak.org) for providing free TLE data
- [satellite.js](https://github.com/shashwatak/satellite-js) for orbital mechanics
- [NASA](https://nasa.gov) for Earth imagery
- The space community for inspiration

---

<p align="center">
  <strong>Built with 💙 for space enthusiasts</strong>
</p>
