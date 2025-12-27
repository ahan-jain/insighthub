from typing import List, Dict, Tuple

class SeverityClassifier:
    
    CRITICAL_KEYWORDS = {
        'fire', 'smoke'
    }
    
    HIGH_PRIORITY = {
        'crack', 'pothole'
    }
    
    SAFETY_EQUIPMENT = {
        'helmet', 'vest', 'mask', 'gloves', 'goggles', 'safety_shoe'
    }
    
    @classmethod
    def classify(cls, detections: List[Dict]) -> Tuple[str, str]:
        if not detections:
            return "LOW", "No objects detected"
        
        labels = [d['label'].lower() for d in detections]
        confidences = [d['confidence'] for d in detections]
        avg_confidence = sum(confidences) / len(confidences)
        
        # 1. CRITICAL: Fire or smoke
        critical_found = cls.CRITICAL_KEYWORDS.intersection(labels)
        if critical_found:
            items = ', '.join(critical_found)
            return "CRITICAL", f"Emergency detected: {items}"
        
        # 2. HIGH: Infrastructure damage
        damage_found = cls.HIGH_PRIORITY.intersection(labels)
        if damage_found:
            items = ', '.join(damage_found)
            return "HIGH", f"Infrastructure damage detected: {items}"
        
        # 3. Check PPE compliance - person or head detected
        has_person = 'person' in labels or 'head' in labels
        ppe_detected = cls.SAFETY_EQUIPMENT.intersection(labels)
        has_helmet = 'helmet' in labels
        
        if has_person:
            # CRITICAL if person detected but no helmet
            if not has_helmet:
                return "CRITICAL", "Safety violation: Person without helmet detected"
            
            # Check other PPE
            if len(ppe_detected) >= 4:
                ppe_list = ', '.join(ppe_detected)
                return "LOW", f"Full PPE compliance: {ppe_list}"
            elif len(ppe_detected) >= 2:
                ppe_list = ', '.join(ppe_detected)
                return "MEDIUM", f"Partial PPE detected: {ppe_list}. Review for complete compliance"
            elif len(ppe_detected) == 1:
                ppe_item = list(ppe_detected)[0]
                return "HIGH", f"Insufficient PPE: Only {ppe_item} detected"
            else:
                return "HIGH", "Safety concern: Person without visible PPE"
        
        # 4. Complex scenes
        high_conf_count = sum(1 for c in confidences if c > 0.75)
        if high_conf_count >= 5:
            return "MEDIUM", f"Multiple objects detected ({high_conf_count} items)"
        
        if len(detections) >= 3:
            return "MEDIUM", f"Multiple objects detected ({len(detections)} items)"
        
        # 5. Default
        return "LOW", f"Routine observation: {len(detections)} object(s) detected"