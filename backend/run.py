#!/usr/bin/env python3
import sys
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app

if __name__ == '__main__':
    app = create_app('development')
    print("Starting Phoenix Council Elections server...")
    print("Server will be available at: http://localhost:5001")
    app.run(debug=True, port=5001, host='0.0.0.0')
