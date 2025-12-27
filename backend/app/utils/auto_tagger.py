from typing import List, Dict, Set

class AutoTagger:
    
    LABEL_TAGS = {
        # Personnel
        'person': ['personnel', 'human-present'],
        'head': ['personnel', 'human-present'],
        
        # PPE Equipment
        'helmet': ['safety-equipment', 'ppe', 'ppe-compliant', 'head-protection'],
        'vest': ['safety-equipment', 'ppe', 'ppe-compliant', 'high-visibility'],
        'mask': ['safety-equipment', 'ppe', 'ppe-compliant', 'respiratory-protection'],
        'gloves': ['safety-equipment', 'ppe', 'ppe-compliant', 'hand-protection'],
        'goggles': ['safety-equipment', 'ppe', 'ppe-compliant', 'eye-protection'],
        'safety_shoe': ['safety-equipment', 'ppe', 'ppe-compliant', 'foot-protection'],
        
        # Infrastructure Damage
        'crack': ['infrastructure-damage', 'structural-issue', 'maintenance-required'],
        'pothole': ['infrastructure-damage', 'road-hazard', 'maintenance-required'],
        
        # Emergency
        'fire': ['emergency', 'critical-hazard', 'evacuation-required'],
        'smoke': ['emergency', 'fire-risk', 'investigation-required'],
        
        # Vehicles
        'car': ['infrastructure', 'vehicle'],
        'truck': ['infrastructure', 'vehicle', 'heavy-vehicle'],
        'bus': ['infrastructure', 'vehicle', 'heavy-vehicle'],
    }
    
    @classmethod
    def generate_tags(cls, detections: List[Dict]) -> List[str]:
        if not detections:
            return []
        
        tags: Set[str] = set()
        labels = [d['label'].lower() for d in detections]
        
        for label in labels:
            if label in cls.LABEL_TAGS:
                tags.update(cls.LABEL_TAGS[label])
        
        # Contextual rules - check if person/head detected
        has_person = 'person' in labels or 'head' in labels
        
        if has_person:
            ppe_equipment = {'helmet', 'vest', 'mask', 'gloves', 'goggles', 'safety_shoe'}
            detected_ppe = ppe_equipment.intersection(labels)
            
            # Check specifically for helmet
            has_helmet = 'helmet' in labels
            
            if not has_helmet:
                tags.add('safety-violation')
                tags.add('helmet-missing')
            elif len(detected_ppe) >= 3:
                tags.add('full-ppe-compliant')
            elif len(detected_ppe) >= 1:
                tags.add('partial-ppe')
        
        # Emergency scenarios
        if 'fire' in labels or 'smoke' in labels:
            tags.add('immediate-action-required')
        
        # Infrastructure concerns
        if 'crack' in labels or 'pothole' in labels:
            tags.add('inspection-required')
        
        return sorted(list(tags))