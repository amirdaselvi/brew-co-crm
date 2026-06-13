"""Flask application configuration."""
import os

class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'xeno-crm-dev-key-change-in-prod')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///xeno_crm.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Channel service URL
    CHANNEL_SERVICE_URL = os.environ.get('CHANNEL_SERVICE_URL', 'http://localhost:5001')
    
    # Claude API
    ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
    
    # CRM callback URL (for channel service to call back)
    CRM_CALLBACK_URL = os.environ.get('CRM_CALLBACK_URL', 'http://localhost:5000')
    
    # CORS
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',')
