#!/usr/bin/env python3
"""
Google OAuth2 Setup Script for Phoenix Council Elections

This script helps you set up Google OAuth2 credentials for the application.
"""

import os
import sys

def main():
    print("🔐 Google OAuth2 Setup for Phoenix Council Elections")
    print("=" * 60)
    print()
    
    print("📋 Prerequisites:")
    print("1. A Google account")
    print("2. Access to Google Cloud Console")
    print()
    
    print("🚀 Step-by-step setup:")
    print()
    print("1️⃣  Go to Google Cloud Console:")
    print("   https://console.cloud.google.com/")
    print()
    
    print("2️⃣  Create a new project or select existing one:")
    print("   - Click on the project dropdown at the top")
    print("   - Create a new project or select an existing one")
    print()
    
    print("3️⃣  Enable required APIs:")
    print("   - Go to 'APIs & Services' > 'Library'")
    print("   - Search for and enable 'Google+ API'")
    print("   - Also enable 'Google Identity and Access Management (IAM) API'")
    print()
    
    print("4️⃣  Create OAuth2 credentials:")
    print("   - Go to 'APIs & Services' > 'Credentials'")
    print("   - Click 'Create Credentials' > 'OAuth 2.0 Client IDs'")
    print("   - Choose 'Web application'")
    print("   - Set the following:")
    print("     • Name: Phoenix Council Elections")
    print("     • Authorized JavaScript origins: https://majiddaas2.pythonanywhere.com")
    print("     • Authorized redirect URIs: https://majiddaas2.pythonanywhere.com/auth/google/callback")
    print()
    
    print("5️⃣  Get your credentials:")
    print("   - After creating, you'll get a Client ID and Client Secret")
    print("   - Copy these values")
    print()
    
    print("6️⃣  Set environment variables:")
    print("   Run these commands in your terminal:")
    print()
    
    client_id = input("Enter your Google Client ID: ").strip()
    client_secret = input("Enter your Google Client Secret: ").strip()
    
    if client_id and client_secret:
        print()
        print("✅ Setting up environment variables...")
        
        # Create a .env file
        env_content = f"""# Google OAuth2 Configuration
GOOGLE_CLIENT_ID={client_id}
GOOGLE_CLIENT_SECRET={client_secret}
GOOGLE_REDIRECT_URI=https://majiddaas2.pythonanywhere.com/auth/google/callback

# Other configuration
SECRET_KEY=dev-secret-key-change-in-production
ADMIN_PASSWORD=admin2024
"""
        
        with open('.env', 'w') as f:
            f.write(env_content)
        
        print("✅ Created .env file with your credentials")
        print()
        print("🔧 To load these environment variables, run:")
        print("   source .env")
        print()
        print("🚀 Then start the server:")
        print("   python3 run.py")
        print()
        print("📝 Note: Keep your .env file secure and never commit it to version control!")
        
    else:
        print("❌ Please provide both Client ID and Client Secret")
        sys.exit(1)

if __name__ == "__main__":
    main()
