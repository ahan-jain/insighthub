from typing import List, Set


class AutoTagger:

    LABEL_TAGS = {
        
        #personnel
        'person': ['personnel', 'human-present'],
    
        # PPE
        'helmet': ['safety-equipment', 'ppe', 'ppe-compliant', 'head-protection'],
        'vest': ['safety-equipment', 'ppe', 'ppe-compliant', 'high-visibility'],
        'gloves': ['safety-equipment', 'ppe', 'ppe-compliant', 'hand-protection'],
        'goggles': ['safety-equipment', 'ppe', 'ppe-compliant', 'eye-protection'],
        'mask': ['safety-equipment', 'ppe', 'ppe-compliant', 'respiratory-protection'],
        'safety_shoe': ['safety-equipment', 'ppe', 'ppe-compliant', 'foot-protection'],
        
        # Infrastructure
        'pipe': ['infrastructure', 'plumbing'],
        'valve': ['infrastructure', 'mechanical'],

        # Damage indicators
        'crack': ['damage', 'structural-issue', 'maintenance-required'],
        'leak': ['damage', 'immediate-action', 'leak-risk'],
        'fire': ['emergency', 'immediate-action', 'critical'],

        # Vehicles
        'car': ['vehicle', 'transportation'],
        'truck': ['vehicle', 'heavy-equipment'],
        'bus': ['vehicle', 'public-transport'],

        # Construction
        'excavator': ['construction', 'heavy-equipment'],
        'crane': ['construction', 'lifting-equipment'],
        'ladder': ['construction', 'elevated-work'],

        # Animals
        'dog': ['animal', 'pet'],
        'cat': ['animal', 'pet'],
        'bird': ['animal', 'wildlife'],
    }

    @classmethod
    def generate_tags(cls, detections: List[dict]) -> List[str]:
        if not detections:
            return ['no-detections']

        tags: Set[str] = set()
        labels = [d['label'].lower() for d in detections]

        # 1. Add base tags from label mappings
        for label in labels:
            if label in cls.LABEL_TAGS:
                tags.update(cls.LABEL_TAGS[label])

        # 2. Add combination tags (context-aware)
        tags.update(cls._get_combination_tags(labels))

        # 3. Add count-based tags
        person_count = labels.count('person')
        if person_count > 1:
            tags.add('multiple-workers')
        if person_count >= 5:
            tags.add('team-present')

        # 4. Add confidence-based tags
        high_conf_count = sum(1 for d in detections if d['confidence'] > 0.85)
        if high_conf_count >= 3:
            tags.add('high-confidence')

        # 5. Add object diversity tag
        unique_labels = len(set(labels))
        if unique_labels >= 5:
            tags.add('complex-scene')

        return sorted(list(tags))

    @classmethod
    def _get_combination_tags(cls, labels: List[str]) -> Set[str]:
        tags: Set[str] = set()
        label_set = set(labels)

        # Safety combinations
        if 'person' in label_set:
            if any(ppe in label_set for ppe in ['hard_hat', 'helmet', 'vest', 'safety_vest']):
                tags.add('ppe-compliant')
            else:
                tags.add('safety-review-needed')

        # Infrastructure damage
        if 'crack' in label_set:
            if any(infra in label_set for infra in ['pipe', 'wall', 'beam', 'column']):
                tags.add('structural-damage')
            if 'pipe' in label_set:
                tags.add('pipe-damage')
                tags.add('leak-risk')

        # Construction site
        construction_indicators = {'excavator', 'crane', 'truck', 'ladder', 'hard_hat'}
        if len(construction_indicators.intersection(label_set)) >= 2:
            tags.add('construction-site')

        # Elevated work
        if 'ladder' in label_set and 'person' in label_set:
            tags.add('elevated-work')
            tags.add('fall-risk')

        # Vehicle area
        vehicle_types = {'car', 'truck', 'bus'}
        if len(vehicle_types.intersection(label_set)) >= 2:
            tags.add('vehicle-area')
            tags.add('traffic')

        # Emergency indicators
        emergency_keywords = {'fire', 'smoke', 'flood', 'gas'}
        if emergency_keywords.intersection(label_set):
            tags.add('emergency')
            tags.add('immediate-response-required')

        return tags
