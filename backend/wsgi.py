#!/usr/bin/env python3
"""
WSGI configuration for Phoenix Council Elections.
This file is used by PythonAnywhere to serve the Flask application.
"""

import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

secret_key = os.getenv('SECRET_KEY')
client_id = os.getenv('GOOGLE_CLIENT_ID')

# Import the Flask app
from app import create_app

# Create the application instance
application = create_app('production')

# For debugging
if __name__ == "__main__":
    application.run()
