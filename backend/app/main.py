from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List
import uuid
from pathlib import Path
import shutil
from .cv.infer import ObjectDetector

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

@app.get("/health")
def health_check():
    """
    Health check endpoint.
    Returns: JSON response
    """
    return {"status": "healthy", "service": "insight-hub"}
@app.get("/")
def root():
    return {"message": "InsightHub v1.0"}

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_image(file: UploadFile = File(...)):
    """
    Analyze an uploaded image for objects.
    
    Args:
        file: Uploaded image (JPEG, PNG, etc.)
    
    Returns:
        AnalysisResponse with detections and metadata
    """
    
    # STEP 1: Validate File Type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="File must be an image (JPEG, PNG, etc.)"
        )
    
    # STEP 2: Generate Unique ID
    analysis_id = str(uuid.uuid4())
    print(f"📸 Processing analysis: {analysis_id}")
    
    # STEP 3: Save Uploaded File
    file_ext = Path(file.filename).suffix
    image_path = STORAGE_DIR / f"{analysis_id}{file_ext}"
    
    with image_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    print(f"Saved to: {image_path}")
    
    try:
        # STEP 4: Run YOLO Detection
        print("🔍 Running YOLO inference...")
        detections = detector.detect(str(image_path))
        print(f"Found {len(detections)} objects")
        
        # STEP 5: Calculate Quality Score
        if detections:
            score = sum(d["confidence"] for d in detections) / len(detections)
        else:
            score = 0.0
        
        # STEP 6: Generate Summary
        if not detections:
            summary = "No objects detected in the image."
        else:
            label_counts = {}
            for d in detections:
                label = d["label"]
                label_counts[label] = label_counts.get(label, 0) + 1
            
            parts = [f"{count} {label}(s)" for label, count in label_counts.items()]
            summary = f"Detected: {', '.join(parts)}"
        
        print(f"📝 Summary: {summary}")
        
        # STEP 7: Convert to Pydantic Models
        detection_models = [Detection(**d) for d in detections]
        
        # STEP 8: Return Response
        return AnalysisResponse(
            analysis_id=analysis_id,
            detections=detection_models,
            score=round(score, 3),
            summary=summary
        )
    
    except Exception as e:
        if image_path.exists():
            image_path.unlink()
        
        print(f"Error: {str(e)}")
        raise HTTPException(500, f"Analysis failed: {str(e)}")