from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from datetime import datetime, timezone
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import List
import uuid
from pathlib import Path
import shutil
from .cv.infer import ObjectDetector
from .cv.annotate import draw_detections
from typing import List, Optional


class Detection(BaseModel):
    """
    Represents a single object detection.
    
    This model validates that:
    - label is a string
    - confidence is between 0.0 and 1.0
    - bbox has exactly 4 numbers
    """
    label: str = Field(
        ..., 
        description="Object class name (e.g., 'person', 'car')"
    )
    confidence: float = Field(
        ..., 
        ge=0.0,
        le=1.0,
        description="Confidence score (0.0 to 1.0)"
    )
    bbox: List[float] = Field(
        ...,
        min_items=4,
        max_items=4,
        description="Bounding box [x1, y1, x2, y2]"
    )

class AnalysisResponse(BaseModel):
    """
    Complete response sent back to the client.
    
    Contains:
    - Unique ID for this analysis
    - List of all detections
    - Overall quality score
    - Human-readable summary
    """
    analysis_id: str = Field(..., description="Unique UUID")
    detections: List[Detection] = Field(..., description="All detected objects")
    score: float = Field(..., ge=0.0, le=1.0, description="Mean confidence")
    summary: str = Field(..., description="Human-readable summary")

    latitude: Optional[float] = Field(
        None, 
        ge=-90, 
        le=90, 
        description="GPS latitude"
    )
    longitude: Optional[float] = Field(
        None, 
        ge=-180, 
        le=180, 
        description="GPS longitude"
    )
    location_accuracy: Optional[float] = Field(
        None, 
        ge=0, 
        description="GPS accuracy in meters"
    )
    timestamp: str = Field(
        ..., 
        description="ISO 8601 timestamp"
    )


app = FastAPI(title = "InsightHub")

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

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "insight-hub"}
@app.get("/")
def root():
    return {"message": "InsightHub v1.0"}

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_image(file: UploadFile = File(...), 
                        latitude: Optional[float] = Form(None),
                        longitude: Optional[float] = Form(None),
                        location_accuracy: Optional[float] = Form(None)):
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
        
        return AnalysisResponse(
            analysis_id=analysis_id,
            detections=detection_models,
            score=round(score, 3),
            summary=summary,
            latitude=latitude,
            longitude=longitude,
            location_accuracy=location_accuracy,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
    
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