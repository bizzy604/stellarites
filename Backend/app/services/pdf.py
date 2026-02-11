"""PDF generation for review certificates."""
import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.colors import HexColor

# Custom style for QR code text
qr_style = ParagraphStyle(
    'QRCodeText',
    parent=getSampleStyleSheet()['Normal'],
    alignment=TA_CENTER,
    fontSize=8,
    textColor=HexColor('#333333'),
    leading=10
)

def generate_review_pdf(review_data: dict) -> bytes:
    """
    Generates a PDF certificate for a review.
    Input:
      worker_name, worker_code, role, start_date, end_date,
      rating, comment, reviewer_type, stellar_tx_id, explorer_url
    Output: PDF bytes (in-memory).
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                            rightMargin=inch/2, leftMargin=inch/2,
                            topMargin=inch/2, bottomMargin=inch/2)
    styles = getSampleStyleSheet()
    story = []

    # Title
    story.append(Paragraph("<font size='18'><b>🔷 NannyChain</b></font>", styles['h1']))
    story.append(Paragraph("<font size='16'><b>Verified Work Review</b></font>", styles['h2']))
    story.append(Spacer(1, 0.2 * inch))

    # Worker and Employer Details
    story.append(Paragraph(f"<b>Worker:</b> {review_data['worker_name']} ({review_data['worker_code']})", styles['Normal']))
    story.append(Paragraph(f"<b>Employer Type:</b> {review_data['reviewer_type'].capitalize()}", styles['Normal']))
    story.append(Paragraph(f"<b>Role:</b> {review_data['role']}", styles['Normal']))
    story.append(Paragraph(f"<b>Duration:</b> {review_data['start_date']} – {review_data['end_date']} ({review_data['duration_months']}mo)", styles['Normal']))
    stars = "★" * review_data['rating'] + "☆" * (5 - review_data['rating'])
    story.append(Paragraph(f"<b>Rating:</b> <font color='#FFD700'>{stars}</font> ({review_data['rating']}/5)", styles['Normal']))
    story.append(Spacer(1, 0.2 * inch))

    # Comment
    story.append(Paragraph("<b>Comment:</b>", styles['Normal']))
    story.append(Paragraph(review_data['comment'], styles['Normal']))
    story.append(Spacer(1, 0.3 * inch))

    # Review Date and QR Code (Placeholder for now)
    story.append(Paragraph(f"<b>Reviewed:</b> {review_data['review_date']}", styles['Normal']))
    story.append(Spacer(1, 0.1 * inch))

    # Placeholder for QR Code image
    # In a real implementation, you'd generate a QR code image from explorer_url
    # For now, we'll just put the URL as text.
    story.append(Paragraph("<b>Verify on Stellar:</b>", qr_style))
    story.append(Paragraph(f"<font size='8'>{review_data['explorer_url']}</font>", qr_style))
    story.append(Spacer(1, 0.1 * inch))

    story.append(Paragraph(f"TX: {review_data['stellar_tx_id']}", qr_style))
    story.append(Spacer(1, 0.3 * inch))

    # Footer
    story.append(Paragraph("<font size='10' color='#555555'><i>Verified by NannyChain</i></font>", styles['Normal']))
    story.append(Paragraph("<font size='8' color='#777777'><i>This is a secure, blockchain-verified document.</i></font>", styles['Normal']))


    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
