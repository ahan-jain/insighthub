# InsightHub - Field Intelligence Platform

A production-ready AI-powered field inspection platform combining computer vision, GPS tracking, and offline-first architecture to enable real-time safety compliance monitoring in remote locations.

## What It Is

InsightHub is a full-stack web application that uses multiple specialized AI models to automatically detect safety violations, infrastructure damage, and emergency hazards from field photos. Built for construction sites, facilities management, and field operations teams who need reliable safety monitoring without constant internet connectivity.

## Target Market

### Primary Users
- **Construction Companies** - Safety compliance monitoring across job sites
- **Facilities Management** - Infrastructure inspection and maintenance tracking
- **Industrial Operations** - PPE compliance and hazard detection
- **Field Service Teams** - Remote inspection with offline capabilities

### Use Cases
- Real-time PPE compliance verification (helmets, vests, gloves, etc.)
- Infrastructure damage detection (cracks, potholes)
- Emergency hazard identification (fire, smoke)
- GPS-tagged inspection records with automated reporting
- Offline field operations with automatic data synchronization

## Features

### 1. Multi-Model AI Pipeline
- **5 Specialized YOLO Models** working in parallel:
  - General object detection (YOLO v8)
  - PPE equipment detection (6 classes)
  - Helmet violation detection (3 classes)
  - Infrastructure damage detection (2 classes)
  - Fire/smoke detection (2 classes)
- **10+ Detection Classes**: helmet, vest, gloves, goggles, mask, safety shoes, crack, pothole, fire, smoke
- **Real-time inference**: Less than 100ms per image on standard hardware
- **Confidence scoring**: Per-detection confidence levels with adjustable thresholds

### 2. GPS Geo-Tagging
- Automatic location capture on upload
- Interactive Leaflet maps showing inspection locations
- Accuracy metrics (±meters) displayed
- Works on mobile devices with GPS capability
- Offline location caching for later sync

### 3. Offline-First PWA
- **100% offline functionality** - works without internet
- IndexedDB for local data persistence
- Background sync automatically uploads when connection returns
- Service workers for offline asset caching
- Progressive Web App - installable on mobile/desktop

### 4. Automated Safety Classification
- **4-Level Severity System**:
  - CRITICAL: Fire, smoke, helmet violations
  - HIGH: Infrastructure damage, insufficient PPE
  - MEDIUM: Partial PPE compliance, complex scenes
  - LOW: Full compliance, routine observations
- Rule-based logic with explainable reasoning
- Context-aware assessment (e.g., person + no helmet = CRITICAL)

### 5. Smart Auto-Tagging
- Context-aware tag generation
- PPE compliance tagging (full/partial/missing)
- Infrastructure and emergency categorization
- Semantic labels for filtering and search

### 6. PDF Report Generation
- Professional inspection reports with one click
- Includes:
  - Analysis metadata (ID, timestamp, location)
  - Severity assessment with reasoning
  - Original and annotated images side-by-side
  - Detection table with confidence scores
  - Auto-generated tags
- Ready for client delivery or regulatory compliance

### 7. Analytics Dashboard
- **Time-series visualizations**:
  - 30-day trend line chart
  - Top detected objects bar chart
  - Severity distribution pie chart
- **Key metrics**:
  - Total analyses count
  - 7-day activity summary
  - Average detections per analysis
  - Critical issues tracker
- **Recent activity feed** with drill-down to individual analyses
- Interactive charts with tooltips and formatting

## Technical Stack

### Frontend
- **Framework**: Next.js 15 (React 18, TypeScript)
- **Visualizations**: Recharts (charts), Leaflet (maps)
- **Offline**: IndexedDB, Service Workers, Background Sync
- **Styling**: Inline CSS (custom design system)
- **PWA**: next-pwa for service worker generation

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **AI/ML**: Ultralytics YOLO v8, PyTorch
- **PDF Generation**: ReportLab
- **Image Processing**: OpenCV, Pillow
- **API**: RESTful with CORS support

### AI Models
1. **YOLO v8n** (6.2 MB) - General object detection
2. **PPE Detector** (6.5 MB) - 6-class safety equipment
3. **Helmet Violation** (6.3 MB) - 3-class head protection
4. **Crack Detection** (6.2 MB) - 2-class infrastructure
5. **Fire Detection** (22 MB) - 2-class emergency

### Storage & Data
- **Offline Buffer**: IndexedDB for client-side temporary storage during offline mode
- **Analysis Data**: In-memory Python dictionary (resets on server restart)
- **Images**: Local filesystem at `backend/app/storage/images/`

**Note:** Current implementation uses in-memory storage for development. Production deployment would require PostgreSQL for persistent data storage and S3/CloudFlare R2 for scalable image hosting.

## Current Limitations

### Model Training & Accuracy

**PPE Detection Model**
- Trained on: Approximately 10,000 images of construction/industrial PPE
- Classes: Gloves, Vest, Goggles, Helmet, Mask, Safety Shoes
- Known limitations:
  - Occluded PPE (partially hidden) may not detect
  - Non-standard PPE colors/styles have lower accuracy
  - Distance: Works best within 20 feet of subject
  - Lighting: Poor performance in low-light conditions

**Helmet Violation Model**
- Trained on: Approximately 5,000 images of head protection scenarios
- Classes: Helmet, Head, Person
- Known limitations:
  - Yellow/orange helmets detected better than other colors
  - Hard hats at extreme angles may be missed
  - False negatives when helmet blends with background

**Infrastructure Damage Model**
- Trained on: Approximately 3,000 images of road/concrete damage
- Classes: Crack, Pothole
- Known limitations:
  - Hairline cracks may be missed
  - Wet surfaces reduce detection accuracy
  - Only trained on asphalt/concrete (not other materials)

**Fire Detection Model**
- Trained on: Approximately 8,000 images of fire/smoke scenarios
- Classes: Fire, Smoke
- Known limitations:
  - Orange/red objects (safety vests) can trigger false positives
  - Requires visible flames or dense smoke
  - Not trained on electrical fires or specific industrial scenarios

### General AI Limitations

**Detection Coverage**
- Models cover approximately 15 object classes total
- Cannot detect: Scaffolding, ladders, electrical hazards, chemical spills, most tools
- Generic YOLO v8 used for general objects (not specialized for construction)

**Accuracy Ranges**
- PPE compliance: 85-90% accuracy in good conditions
- Infrastructure damage: 75-85% accuracy
- Fire detection: 80-90% accuracy (with false positive mitigation)
- Overall: Not suitable as sole safety monitoring solution without human oversight

**Processing Constraints**
- Multi-model inference: 80-120ms per image (5 models)
- Large images (greater than 4000x3000px) may timeout
- Batch processing not implemented
- No real-time video analysis

### Scaling Limitations

**Current Architecture**
- In-memory storage (resets on server restart)
- Single-server deployment
- No load balancing
- No model caching/optimization
- Limited to approximately 100 concurrent users

**Data Constraints**
- No database persistence (development mode)
- IndexedDB limited by browser storage quotas (50MB-500MB)
- No cloud backup or disaster recovery
- Image storage grows unbounded

## Future Enhancements

**Infrastructure & Scaling**
- PostgreSQL database for persistent storage
- Cloud deployment (AWS/Railway + Vercel)
- Redis caching and load balancing
- S3/CloudFlare R2 for image storage
- Multi-region deployment for global latency

**AI/ML Improvements**
- Model optimization with ONNX/TensorRT for faster inference
- GPU acceleration for real-time video analysis
- Fine-tuning on customer-specific datasets
- Expanded detection classes (scaffolding, tools, electrical hazards)
- Ensemble methods for improved accuracy

**Enterprise Features**
- Multi-tenancy and role-based access control
- Custom workflows and approval chains
- Integration APIs (Slack, Teams, email)
- Mobile app (React Native)
- Predictive maintenance analytics
- Custom report templates and BI tool exports

## Installation & Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- 8GB RAM minimum (for running all 5 AI models)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Download AI models (place in backend/app/models/)
# - ppe-detection.pt
# - helmet-violation.pt
# - crack-detection.pt
# - fire-detection.pt

uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Access
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## API Endpoints

### POST /analyze
Upload image for analysis
- **Input**: Multipart form (image file, optional GPS coords)
- **Output**: JSON with detections, severity, tags, metadata

### GET /images/{id}/original
Retrieve original uploaded image

### GET /images/{id}/annotated
Retrieve image with detection bounding boxes

### GET /analyze/{id}/report
Generate and download PDF report

### GET /analytics/overview
Get dashboard analytics data

## Author

**Ahan Jain**
- Email: ahan@ahanjain.com
- LinkedIn: [linkedin.com/in/ahanjain](https://linkedin.com/in/ahanjain)
- GitHub: [github.com/ahan-jain](https://github.com/ahan-jain)

## Acknowledgments

- Ultralytics for YOLO v8 framework
- Hugging Face community for pre-trained models
- Next.js and FastAPI teams for excellent frameworks
- Roboflow Universe for model training resources