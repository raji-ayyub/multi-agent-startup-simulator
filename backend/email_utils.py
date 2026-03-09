import os
import logging
import smtplib
from email.message import EmailMessage

logger = logging.getLogger(__name__)

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
EMAIL_SENDER = os.getenv("EMAIL_SENDER")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """Send a password reset link using SendGrid SMTP."""
    
    # 1. Validation
    if not SENDGRID_API_KEY:
        logger.warning("SENDGRID_API_KEY not configured, skipping send.")
        return False

    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"

    # 2. Construct the Message
    message = EmailMessage()
    message['Subject'] = "PetraAI Password Reset"
    message['From'] = EMAIL_SENDER
    message['To'] = to_email
    
    message.set_content(f"""
      <p>Hello,</p>
      <p>You requested a password reset. Please click the link below to choose a new password:</p>
      <p><a href="{reset_link}">{reset_link}</a></p>
      <p>If you did not request this, you can safely ignore this message.</p>
      <p>– PetraAI Team</p>
    """, subtype='html')

    try:
        with smtplib.SMTP("smtp.sendgrid.net", 587) as server:
            server.starttls() 
            server.login("apikey", SENDGRID_API_KEY)
            server.send_message(message)
        
        print(f"Email sent successfully to {to_email}!")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send password reset email to {to_email}: {e}")
        return False