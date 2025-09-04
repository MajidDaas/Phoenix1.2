# Phoenix Council Elections

A secure voting system for Phoenix Council elections with Google OAuth2 authentication.

## Features

- 🔐 **Secure Authentication**: Google OAuth2 integration for voter verification
- 🗳️ **Voting System**: Select 15 council members with 7 executive officers
- 📊 **Real-time Results**: View election results and statistics
- 👨‍💼 **Admin Panel**: Manage election status and export data
- 🎨 **Modern UI**: Beautiful, responsive interface

## Quick Start

### Option 1: Demo Mode (No Google OAuth2 Setup Required)

1. **Install dependencies:**
   ```bash
   cd backend
   python3 -m pip install -r requirements.txt
   ```

2. **Start the server:**
   ```bash
   python3 run.py
   ```

3. **Open in browser:**
   - Go to https://majiddaas2.pythonanywhere.com
   - Click "Demo Mode" to test without Google authentication

### Option 2: Full Google OAuth2 Setup

1. **Set up Google OAuth2:**
   ```bash
   cd backend
   python3 setup_google_oauth.py
   ```
   Follow the interactive setup guide to configure Google OAuth2 credentials.

2. **Install dependencies:**
   ```bash
   python3 -m pip install -r requirements.txt
   ```

3. **Start the server:**
   ```bash
   python3 run.py
   ```

4. **Open in browser:**
   - Go to https://majiddaas2.pythonanywhere.com
   - Click "Sign in with Google" to authenticate

## Google OAuth2 Setup (Manual)

If you prefer to set up Google OAuth2 manually:

1. **Go to Google Cloud Console:**
   - Visit https://console.cloud.google.com/
   - Create a new project or select existing one

2. **Enable APIs:**
   - Go to "APIs & Services" > "Library"
   - Enable "Google+ API"
   - Enable "Google Identity and Access Management (IAM) API"

3. **Create OAuth2 credentials:**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Set:
     - **Name:** Phoenix Council Elections
     - **Authorized JavaScript origins:** `https://majiddaas2.pythonanywhere.com`
     - **Authorized redirect URIs:** `https://majiddaas2.pythonanywhere.com/auth/google/callback`

4. **Set environment variables:**
   ```bash
   export GOOGLE_CLIENT_ID="your-client-id-here"
   export GOOGLE_CLIENT_SECRET="your-client-secret-here"
   ```

## Project Structure

```
Phoenix/
├── backend/
│   ├── app.py              # Main Flask application
│   ├── config.py           # Configuration settings
│   ├── models.py           # Data models
│   ├── requirements.txt    # Python dependencies
│   ├── run.py             # Application launcher
│   ├── setup_google_oauth.py # OAuth2 setup script
│   ├── data/              # JSON data files
│   └── utils/             # Utility modules
│       ├── auth.py        # Google OAuth2 authentication
│       └── data_handler.py # Data management
└── frontend/
    ├── index.html         # Main HTML page
    ├── css/
    │   └── styles.css     # Styling
    └── js/
        ├── main.js        # Main JavaScript logic
        └── api.js         # API communication
```

## Voting Process

1. **Authentication:** Sign in with Google account
2. **Selection:** Click on candidates to select them for council (15 total)
3. **Executive Officers:** Click again on selected candidates to mark as Executive Officers (7 total)
4. **Submission:** Submit your vote when you've selected 15 candidates (7 as EOs)

## Admin Features

- **Election Control:** Open/close elections
- **Results Viewing:** View real-time results
- **Data Export:** Export vote data
- **Statistics:** View voter turnout and statistics

## Security Features

- ✅ Google OAuth2 authentication
- ✅ One vote per user
- ✅ Anonymous voting
- ✅ Secure session management
- ✅ Input validation

## Development

### Running in Development Mode

The application runs in debug mode by default. For production:

1. Set `FLASK_ENV=production`
2. Use a production WSGI server
3. Configure proper SSL certificates
4. Set secure environment variables

### API Endpoints

- `GET /` - Main application page
- `GET /auth/google/login` - Initiate Google OAuth2
- `GET /auth/google/callback` - OAuth2 callback
- `GET /api/auth/session` - Get current session
- `POST /api/auth/logout` - Logout
- `POST /api/votes/submit` - Submit vote
- `GET /api/results` - Get election results
- `GET /api/admin/status` - Get election status
- `POST /api/admin/toggle` - Toggle election status

## Troubleshooting

### OAuth2 Errors

If you get "OAuth client was not found" error:

1. Check that your Google OAuth2 credentials are correct
2. Verify the redirect URI matches exactly: `https://majiddaas2.pythonanywhere.com/auth/google/callback`
3. Ensure the Google+ API is enabled in your Google Cloud project

### Port Issues

If port 5001 is in use, change the port in `backend/run.py`:

```python
app.run(debug=True, port=5002, host='0.0.0.0')
```

### Demo Mode

If you can't set up Google OAuth2, use Demo Mode to test the application functionality.

## License

This project is for educational and demonstration purposes.

