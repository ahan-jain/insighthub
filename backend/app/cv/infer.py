from ultralytics import YOLO
from pathlib import Path

class ObjectDetector:
    def __init__(self):
        # General object detection
        self.general_model = YOLO("yolov8n.pt")
        
        # PPE detection
        ppe_model_path = Path("app/models/ppe-detector.pt")
        if ppe_model_path.exists():
            self.ppe_model = YOLO(str(ppe_model_path))
            print("PPE detection model loaded")
            print(f"   Classes: {self.ppe_model.names}")
        else:
            self.ppe_model = None
            print("PPE model not found")
    
    def detect(self, image_path: str):
        detections = []
        
        # Run general YOLO (person, car, etc.)
        general_results = self.general_model(image_path, verbose=False)[0]
        for box in general_results.boxes:
            detections.append({
                "label": general_results.names[int(box.cls[0])],
                "confidence": float(box.conf[0]),
                "bbox": box.xyxy[0].tolist()
            })
        
        # Run PPE detector if available
        if self.ppe_model:
            ppe_results = self.ppe_model(image_path, verbose=False)[0]
            for box in ppe_results.boxes:
                label = ppe_results.names[int(box.cls[0])]
                
                # Normalize label names to lowercase with underscores
                label = label.lower().replace(' ', '_')
                
                detections.append({
                    "label": label,
                    "confidence": float(box.conf[0]),
                    "bbox": box.xyxy[0].tolist()
                })
        
        return detections