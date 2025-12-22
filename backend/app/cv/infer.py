from ultralytics import YOLO
from pathlib import Path
from typing import List, Dict
import json

class ObjectDetector:
    def __init__(self, model_name: str = "yolov8n.pt"):
        print(f"Loading model: {model_name}")
        self.model = YOLO(model_name)
        print("Model loaded successfully")
    
    def detect(self, image_path: str, conf_threshold: float = 0.25) -> List[Dict]:
        results = self.model(image_path, conf=conf_threshold)
        
        detections = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                class_id = int(box.cls[0])
                class_name = self.model.names[class_id]
                confidence = float(box.conf[0])
                bbox = box.xyxy[0].tolist()
                
                detection = {
                    "label": class_name,
                    "confidence": confidence,
                    "bbox": bbox
                }
                detections.append(detection)
        
        return detections

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Run YOLO inference")
    parser.add_argument("--image", required=True, help="Path to image")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold (0.0-1.0)")
    args = parser.parse_args()
    
    detector = ObjectDetector()
    detections = detector.detect(args.image, args.conf)
    
    print(json.dumps(detections, indent=2))
    print(f"\nTotal detections: {len(detections)}")