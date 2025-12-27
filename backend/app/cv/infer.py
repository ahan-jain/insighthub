from ultralytics import YOLO
from pathlib import Path
from typing import List, Dict

class ObjectDetector:
    def __init__(self):
        self.general_model = YOLO("yolov8n.pt")
        print("General YOLO v8 loaded")
        
        self.ppe_model = self._load_model("app/models/ppe-detection.pt", "PPE Detection")
        self.helmet_model = self._load_model("app/models/helmet-violation.pt", "Helmet Violation Detection")
        self.crack_model = self._load_model("app/models/crack-detection.pt", "Crack Detection")
        self.fire_model = self._load_model("app/models/fire-detection.pt", "Fire Detection")
    
    def _load_model(self, path: str, name: str):
        model_path = Path(path)
        if model_path.exists():
            model = YOLO(str(model_path))
            print(f"{name} model loaded")
            print(f"   Classes: {model.names}")
            return model
        else:
            print(f"⚠️  {name} model not found at {path}")
            return None
    
    def detect(self, image_path: str) -> List[Dict]:
        detections = []
        
        # 1. General YOLO (person, car, etc.)
        general_results = self.general_model(image_path, verbose=False)[0]
        for box in general_results.boxes:
            detections.append({
                "label": general_results.names[int(box.cls[0])],
                "confidence": float(box.conf[0]),
                "bbox": box.xyxy[0].tolist()
            })
        
        # 2. Helmet Model (helmet, head, person)
        if self.helmet_model:
            helmet_results = self.helmet_model(image_path, verbose=False)[0]
            for box in helmet_results.boxes:
                label = helmet_results.names[int(box.cls[0])]
                conf = float(box.conf[0])
                print(f"   {label}: {conf:.2%}")
                
                label = label.lower().replace(' ', '_')
                detections.append({
                    "label": label,
                    "confidence": conf,
                    "bbox": box.xyxy[0].tolist()
                })
        
        # 3. PPE Detection (gloves, vest, goggles, helmet, mask, safety_shoe)
        if self.ppe_model:
            ppe_results = self.ppe_model(image_path, verbose=False)[0]
            for box in ppe_results.boxes:
                label = ppe_results.names[int(box.cls[0])]
                label = label.lower().replace(' ', '_')
                
                detections.append({
                    "label": label,
                    "confidence": float(box.conf[0]),
                    "bbox": box.xyxy[0].tolist()
                })
        
        # 4. Crack Detection
        if self.crack_model:
            crack_results = self.crack_model(image_path, verbose=False)[0]
            for box in crack_results.boxes:
                label = crack_results.names[int(box.cls[0])]
                label = label.lower().replace(' ', '_')
                
                detections.append({
                    "label": label,
                    "confidence": float(box.conf[0]),
                    "bbox": box.xyxy[0].tolist()
                })
        
        # 5. Fire Detection
        if self.fire_model:
            fire_results = self.fire_model(image_path, conf = 0.66, verbose=False)[0]
            for box in fire_results.boxes:
                label = fire_results.names[int(box.cls[0])]
                label = label.lower().replace(' ', '_')
                
                detections.append({
                    "label": label,
                    "confidence": float(box.conf[0]),
                    "bbox": box.xyxy[0].tolist()
                })
        
        return detections