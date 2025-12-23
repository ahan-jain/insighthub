import cv2
from pathlib import Path
from typing import List, Dict, Tuple

def draw_detections(
    image_path: str,
    detections: List[Dict],
    output_path: str,
    color: Tuple[int, int, int] = (0, 255, 0)
):
    """
    Draw bounding boxes and labels on an image.
    
    Args:
        image_path: Path to input image
        detections: List of detection dicts with bbox, label, confidence
        output_path: Where to save annotated image
        color: BGR color tuple (default: green)
    
    Process:
        1. Read image as NumPy array
        2. For each detection:
           a. Extract bbox coordinates
           b. Draw rectangle
           c. Measure text size
           d. Draw text background
           e. Draw text
        3. Save annotated image
    
    Example:
        detections = [
            {
                "label": "person",
                "confidence": 0.89,
                "bbox": [100, 150, 300, 400]
            }
        ]
        draw_detections("input.jpg", detections, "output.jpg")
    """

    img = cv2.imread(image_path)
    
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")

    for det in detections:
        # Extract detection data
        x1, y1, x2, y2 = map(int, det["bbox"])
        label = det["label"]
        conf = det["confidence"]
        
        cv2.rectangle(
            img,           # Image to draw on (modified in-place)
            (x1, y1),      # Top-left corner
            (x2, y2),      # Bottom-right corner
            color,         # BGR color
            2              # Line thickness (2 pixels)
        )

        text = f"{label} {conf:.2f}"
        
        (text_width, text_height), baseline = cv2.getTextSize(
            text,
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,   # Font scale
            2      # Thickness
        )
        
        cv2.rectangle(
            img,
            # Top-left of background (above the bbox)
            (x1, y1 - text_height - baseline - 5),
            # Bottom-right of background (at bbox top edge)
            (x1 + text_width, y1),
            color,
            -1  # -1 = filled rectangle (not outline)
        )
        
        cv2.putText(
            img,
            text,
            (x1, y1 - 5),  # Position (slightly above bbox)
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,            # Font scale
            (0, 0, 0),      # Black text (on colored background)
            2               # Thickness
        )
    success = cv2.imwrite(output_path, img)
    
    if not success:
        raise ValueError(f"Failed to save image: {output_path}")
    
    print(f"Saved annotated image to: {output_path}")