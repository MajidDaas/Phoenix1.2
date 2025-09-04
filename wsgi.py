#!/usr/bin/env python3
"""
WSGI configuration for Phoenix Council Elections
This file is used by PythonAnywhere to serve the Flask application
"""

import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Import the Flask app
from app import create_app

# Create the application instance
application = create_app('production')

# For debugging
if __name__ == "__main__":
    application.run()
