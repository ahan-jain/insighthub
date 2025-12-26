from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image as RLImage, PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
import requests


class PDFReportGenerator:
    
    def __init__(self, output_path: str):
        self.output_path = output_path
        self.doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.5*inch,
        )
        self.styles = getSampleStyleSheet()
        self.story = []
        
        self._create_custom_styles()
    
    def _create_custom_styles(self):
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=20,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#2563eb'),
            spaceAfter=10,
            spaceBefore=15,
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='Metadata',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#4b5563'),
            spaceAfter=5
        ))
    
    def add_header(self, title: str = "InsightHub Detection Report"):
        self.story.append(Paragraph(title, self.styles['ReportTitle']))
        self.story.append(Spacer(1, 0.2*inch))
    
    def add_metadata_section(self, analysis_data: Dict):
        self.story.append(Paragraph("Analysis Information", self.styles['SectionHeader']))
        
        timestamp = datetime.fromisoformat(analysis_data['timestamp'].replace('Z', '+00:00'))
        formatted_time = timestamp.strftime("%B %d, %Y at %I:%M %p")
        
        metadata_rows = [
            ["Analysis ID:", analysis_data['analysis_id']],
            ["Generated:", formatted_time],
            ["Total Detections:", str(len(analysis_data['detections']))],
            ["Average Confidence:", f"{analysis_data['score']:.1%}"],
        ]
        
        if analysis_data.get('latitude') and analysis_data.get('longitude'):
            lat = analysis_data['latitude']
            lon = analysis_data['longitude']
            metadata_rows.append([
                "Location:",
                f"{abs(lat):.4f}°{'N' if lat >= 0 else 'S'}, {abs(lon):.4f}°{'E' if lon >= 0 else 'W'}"
            ])
        
        metadata_table = Table(metadata_rows, colWidths=[1.5*inch, 4.5*inch])
        metadata_table.setStyle(TableStyle([
            ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 10),
            ('FONT', (1, 0), (1, -1), 'Helvetica', 10),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1f2937')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        self.story.append(metadata_table)
        self.story.append(Spacer(1, 0.15*inch))
    
    def add_severity_section(self, severity: str, reason: str):
        self.story.append(Paragraph("Severity Assessment", self.styles['SectionHeader']))
        
        severity_colors = {
            'CRITICAL': colors.HexColor('#dc2626'),
            'HIGH': colors.HexColor('#ea580c'),
            'MEDIUM': colors.HexColor('#ca8a04'),
            'LOW': colors.HexColor('#16a34a')
        }
        
        severity_text = f"<b>Level:</b> <font color='{severity_colors.get(severity, colors.black)}'>{severity}</font>"
        self.story.append(Paragraph(severity_text, self.styles['Normal']))
        self.story.append(Paragraph(f"<b>Reason:</b> {reason}", self.styles['Normal']))
        self.story.append(Spacer(1, 0.15*inch))
    
    def add_images_section(self, original_path: str, annotated_path: str):
        self.story.append(Paragraph("Detection Results", self.styles['SectionHeader']))
        
        img_width = 2.75*inch
        img_height = 2.2*inch
        
        image_table_data = [[
            RLImage(original_path, width=img_width, height=img_height),
            RLImage(annotated_path, width=img_width, height=img_height)
        ]]
        
        image_table = Table(image_table_data, colWidths=[3*inch, 3*inch])
        image_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        self.story.append(image_table)
        
        labels_data = [[
            Paragraph("<b>Original Image</b>", self.styles['Metadata']),
            Paragraph("<b>Annotated Image</b>", self.styles['Metadata'])
        ]]
        labels_table = Table(labels_data, colWidths=[3*inch, 3*inch])
        labels_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        
        self.story.append(labels_table)
        self.story.append(Spacer(1, 0.2*inch))
    
    def add_detections_table(self, detections: List[Dict]):
        self.story.append(Paragraph("Detected Objects", self.styles['SectionHeader']))
        
        table_data = [["#", "Object", "Confidence", "Bounding Box"]]
        
        for idx, det in enumerate(detections, 1):
            bbox_str = f"[{det['bbox'][0]:.0f}, {det['bbox'][1]:.0f}, {det['bbox'][2]:.0f}, {det['bbox'][3]:.0f}]"
            table_data.append([
                str(idx),
                det['label'].title(),
                f"{det['confidence']:.1%}",
                bbox_str
            ])
        
        detections_table = Table(table_data, colWidths=[0.4*inch, 2*inch, 1.3*inch, 2.3*inch])
        detections_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 11),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONT', (0, 1), (-1, -1), 'Helvetica', 10),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),
            ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        self.story.append(detections_table)
        self.story.append(Spacer(1, 0.2*inch))
    
    def add_tags_section(self, tags: List[str]):
        if not tags:
            return
        
        self.story.append(Paragraph("Auto-Generated Tags", self.styles['SectionHeader']))
        tags_text = " ".join([f"<font color='#2563eb'>#{tag}</font>" for tag in tags])
        self.story.append(Paragraph(tags_text, self.styles['Normal']))
        self.story.append(Spacer(1, 0.2*inch))
    
    def add_summary_section(self, summary: str):
        self.story.append(Paragraph("Summary", self.styles['SectionHeader']))
        self.story.append(Paragraph(summary, self.styles['Normal']))
        self.story.append(Spacer(1, 0.2*inch))
    
    def generate(self):
        try:
            self.doc.build(self.story)
            return True
        except Exception as e:
            print(f"PDF generation error: {e}")
            return False


def generate_analysis_report(
    analysis_data: Dict,
    original_image_path: str,
    annotated_image_path: str,
    output_path: str
) -> bool:
    generator = PDFReportGenerator(output_path)
    
    generator.add_header()
    generator.add_metadata_section(analysis_data)
    
    if 'severity' in analysis_data:
        generator.add_severity_section(
            analysis_data['severity'],
            analysis_data.get('severity_reason', '')
        )
    
    generator.add_images_section(original_image_path, annotated_image_path)
    generator.add_detections_table(analysis_data['detections'])
    
    if 'tags' in analysis_data:
        generator.add_tags_section(analysis_data['tags'])
    
    generator.add_summary_section(analysis_data['summary'])
    
    return generator.generate()