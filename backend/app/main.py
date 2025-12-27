from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from datetime import datetime, timezone
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from pathlib import Path
import shutil
from .cv.infer import ObjectDetector
from .cv.annotate import draw_detections
from .utils.severity_classifier import SeverityClassifier
from .utils.auto_tagger import AutoTagger
from .utils.pdf_generator import generate_analysis_report
from collections import Counter
from datetime import timedelta


class Detection(BaseModel):
    label: str = Field(..., description="Object class name (e.g., 'person', 'car')")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score (0.0 to 1.0)")
    bbox: List[float] = Field(..., min_items=4, max_items=4, description="Bounding box [x1, y1, x2, y2]")


class AnalysisResponse(BaseModel):
    analysis_id: str = Field(..., description="Unique UUID")
    detections: List[Detection] = Field(..., description="All detected objects")
    score: float = Field(..., ge=0.0, le=1.0, description="Mean confidence")
    summary: str = Field(..., description="Human-readable summary")
    latitude: Optional[float] = Field(None, ge=-90, le=90, description="GPS latitude")
    longitude: Optional[float] = Field(None, ge=-180, le=180, description="GPS longitude")
    location_accuracy: Optional[float] = Field(None, ge=0, description="GPS accuracy in meters")
    timestamp: str = Field(..., description="ISO 8601 timestamp")
    severity: str = Field(..., description="Issue severity level")
    severity_reason: str = Field(..., description="Explanation for severity")
    tags: List[str] = Field(..., description="Auto-generated contextual tags")


app = FastAPI(title="InsightHub")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Initializing YOLO model...")
detector = ObjectDetector()
print("Model ready!")

STORAGE_DIR = Path("app/storage/images")
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR = Path("app/cv/storage/images")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

analyses_storage = {}


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "insight-hub"}


@app.get("/")
def root():
    return {"message": "InsightHub v1.0"}


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_image(
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    location_accuracy: Optional[float] = Form(None)
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")
    
    analysis_id = str(uuid.uuid4())
    print(f"📸 Processing analysis: {analysis_id}")
    
    if latitude and longitude:
        print(f"📍 Location: {latitude:.4f}°, {longitude:.4f}° (±{location_accuracy:.0f}m)")
    
    file_ext = Path(file.filename).suffix
    image_path = STORAGE_DIR / f"{analysis_id}{file_ext}"
    
    with image_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    print(f"Saved to: {image_path}")
    
    try:
        print("Running YOLO inference...")
        detections = detector.detect(str(image_path))
        print(f"Found {len(detections)} objects")
        
        if detections:
            score = sum(d["confidence"] for d in detections) / len(detections)
        else:
            score = 0.0
        
        if not detections:
            summary = "No objects detected in the image."
        else:
            label_counts = {}
            for d in detections:
                label = d["label"]
                label_counts[label] = label_counts.get(label, 0) + 1
            
            parts = [f"{count} {label}(s)" for label, count in label_counts.items()]
            summary = f"Detected: {', '.join(parts)}"
        
        print(f"Summary: {summary}")
        
        detection_models = [Detection(**d) for d in detections]
        severity, severity_reason = SeverityClassifier.classify(detections)
        tags = AutoTagger.generate_tags(detections)
        
        response = AnalysisResponse(
            analysis_id=analysis_id,
            detections=detection_models,
            score=round(score, 3),
            summary=summary,
            latitude=latitude,
            longitude=longitude,
            location_accuracy=location_accuracy,
            timestamp=datetime.now(timezone.utc).isoformat(),
            severity=severity,
            severity_reason=severity_reason,
            tags=tags
        )
        
        analyses_storage[analysis_id] = response.model_dump()

        try:
            annotated_path = OUTPUT_DIR / f"{analysis_id}_annotated.jpg"
            draw_detections(str(image_path), detections, str(annotated_path))
        except Exception as e:
            print(f"Warning: Could not generate annotated image: {e}")

        return response
    
    except Exception as e:
        if image_path.exists():
            image_path.unlink()
        
        print(f"Error: {str(e)}")
        raise HTTPException(500, f"Analysis failed: {str(e)}")


@app.get("/images/{analysis_id}/original")
def get_original_image(analysis_id: str):
    for ext in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        path = STORAGE_DIR / f"{analysis_id}{ext}"
        if path.exists():
            return FileResponse(path)
    
    raise HTTPException(404, f"Image not found: {analysis_id}")


@app.get("/images/{analysis_id}/annotated")
def get_annotated_image(analysis_id: str):
    path = OUTPUT_DIR / f"{analysis_id}_annotated.jpg"
    
    if path.exists():
        return FileResponse(path)
    
    raise HTTPException(404, f"Annotated image not found: {analysis_id}")


@app.get("/analyze/{analysis_id}/report")
async def generate_report(analysis_id: str):
    if analysis_id not in analyses_storage:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    analysis_data = analyses_storage[analysis_id]
    
    for ext in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        original_path = STORAGE_DIR / f"{analysis_id}{ext}"
        if original_path.exists():
            break
    else:
        raise HTTPException(status_code=404, detail="Original image not found")
    
    annotated_path = OUTPUT_DIR / f"{analysis_id}_annotated.jpg"
    if not annotated_path.exists():
        raise HTTPException(status_code=404, detail="Annotated image not found")
    
    pdf_path = STORAGE_DIR / f"{analysis_id}_report.pdf"
    
    success = generate_analysis_report(
        analysis_data=analysis_data,
        original_image_path=str(original_path),
        annotated_image_path=str(annotated_path),
        output_path=str(pdf_path)
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="PDF generation failed")
    
    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=f"analysis_{analysis_id}_report.pdf"
    )

@app.get("/analytics/overview")
async def get_analytics_overview():
    if not analyses_storage:
        return {
            "total_analyses": 0,
            "time_series": [],
            "top_detections": [],
            "recent_analyses": [],
            "severity_breakdown": {}
        }
    
    total_analyses = len(analyses_storage)
    
    time_series_data = {}
    for analysis in analyses_storage.values():
        date = datetime.fromisoformat(analysis['timestamp'].replace('Z', '+00:00'))
        date_key = date.strftime('%Y-%m-%d')
        time_series_data[date_key] = time_series_data.get(date_key, 0) + 1
    
    today = datetime.now()
    time_series = []
    for i in range(30, -1, -1):
        date = today - timedelta(days=i)
        date_key = date.strftime('%Y-%m-%d')
        time_series.append({
            "date": date_key,
            "count": time_series_data.get(date_key, 0)
        })
    
    all_labels = []
    for analysis in analyses_storage.values():
        for detection in analysis['detections']:
            all_labels.append(detection['label'])
    
    label_counts = Counter(all_labels)
    top_detections = [
        {"label": label, "count": count}
        for label, count in label_counts.most_common(10)
    ]
    
    sorted_analyses = sorted(
        analyses_storage.values(),
        key=lambda x: x['timestamp'],
        reverse=True
    )
    recent_analyses = [
        {
            "analysis_id": a['analysis_id'],
            "timestamp": a['timestamp'],
            "detection_count": len(a['detections']),
            "score": a['score'],
            "severity": a.get('severity', 'UNKNOWN')
        }
        for a in sorted_analyses[:10]
    ]
    
    severity_counts = Counter(
        a.get('severity', 'UNKNOWN')
        for a in analyses_storage.values()
    )
    
    return {
        "total_analyses": total_analyses,
        "time_series": time_series,
        "top_detections": top_detections,
        "recent_analyses": recent_analyses,
        "severity_breakdown": dict(severity_counts)
    }