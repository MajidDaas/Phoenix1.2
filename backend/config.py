import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    FRONTEND_URL = os.environ.get('FRONTEND_URL') or 'https://majiddaas2.pythonanywhere.com'
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD') or 'admin2024'
    # Adjust the path logic here if your data folder is located differently relative to config.py
    DATA_FOLDER = os.path.join(os.path.dirname(__file__), 'data') # e.g., /path/to/config.py/data

    # Google OAuth2 Configuration
    # To set up Google OAuth2:
    # 1. Go to https://console.cloud.google.com/
    # 2. Create a project and enable Google+ API (or relevant Google Identity API)
    # 3. Create OAuth 2.0 credentials (Client ID for Web application)
    # 4. Set authorized redirect URI to exactly: https://<yourusername>.pythonanywhere.com/auth/google/callback
    # 5. (Recommended) Set these environment variables in PythonAnywhere/your environment:
    #    GOOGLE_CLIENT_ID="your-client-id-here"
    #    GOOGLE_CLIENT_SECRET="your-client-secret-here"
    #    GOOGLE_REDIRECT_URI="https://<yourusername>.pythonanywhere.com/auth/google/callback"
    # --- FIX: Removed trailing spaces from GOOGLE_REDIRECT_URI ---
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID') or ''
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET') or ''
    # --- FIX: Removed trailing spaces ---
    GOOGLE_REDIRECT_URI = os.environ.get('GOOGLE_REDIRECT_URI') or 'https://majiddaas2.pythonanywhere.com/auth/google/callback' # <-- No trailing spaces

    @staticmethod
    def init_app(app):
        pass

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

