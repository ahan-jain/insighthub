from typing import List, Dict, Tuple

class SeverityClassifier:
    
    CRITICAL_KEYWORDS = {
        'crack', 'fire', 'flood', 'collapse', 'gas', 'leak',
        'damage', 'broken', 'hazard', 'smoke'
    }
    
    SAFETY_EQUIPMENT = {
        'helmet', 'vest', 'gloves', 'goggles', 'mask', 'safety_shoe'
    }
    
    INFRASTRUCTURE = {
        'pipe', 'valve', 'tank', 'cable', 'wire',
        'beam', 'column', 'wall', 'roof'
    }
    
    @classmethod
    def classify(cls, detections: List[Dict]) -> Tuple[str, str]:
        if not detections:
            return "LOW", "No objects detected"
        
        labels = [d['label'].lower() for d in detections]
        confidences = [d['confidence'] for d in detections]
        avg_confidence = sum(confidences) / len(confidences)
        
        # 1. Check for critical issues
        critical_found = cls.CRITICAL_KEYWORDS.intersection(labels)
        if critical_found:
            keywords = ', '.join(critical_found)
            return "CRITICAL", f"Critical issue detected: {keywords}"
        
        # 2. Check for safety violations (person without PPE)
        person_count = labels.count('person')
        ppe_detected = cls.SAFETY_EQUIPMENT.intersection(labels)
        
        if person_count > 0:
            if len(ppe_detected) == 0:
                return "HIGH", f"Safety concern: {person_count} person(s) without visible PPE"
            elif len(ppe_detected) >= 2:
                # Good PPE coverage
                ppe_list = ', '.join(ppe_detected)
                return "LOW", f"Safety compliant: Person wearing {ppe_list}"
            else:
                # Some PPE but not comprehensive
                ppe_list = ', '.join(ppe_detected)
                return "MEDIUM", f"Partial PPE detected: {ppe_list}. Review for complete compliance"
        
        # 3. Check for infrastructure + high confidence
        infra_found = cls.INFRASTRUCTURE.intersection(labels)
        if infra_found and avg_confidence > 0.7:
            items = ', '.join(infra_found)
            return "HIGH", f"Infrastructure inspection: {items} detected"
        
        # 4. Check for complex scenes
        high_conf_count = sum(1 for c in confidences if c > 0.75)
        if high_conf_count >= 5:
            return "MEDIUM", f"Multiple objects detected ({high_conf_count} items)"
        
        if len(detections) >= 3:
            return "MEDIUM", f"Multiple objects detected ({len(detections)} items)"
        
        # 5. Default to LOW
        return "LOW", f"Routine observation: {len(detections)} object(s) detected"