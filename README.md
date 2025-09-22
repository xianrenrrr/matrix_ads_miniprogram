# Teki AI WeChat Mini Program

## Project Overview
This is a WeChat Mini Program for video recording functionality within the Teki AI platform. Users can record guided videos using templates created by content managers.

## Architecture
```
matrix_ads_miniprogram/
├── app.js                    # Mini program entry point
├── app.json                  # Global configuration
├── app.wxss                  # Global styles
├── pages/                    # Page components
│   ├── index/               # Home page
│   ├── templates/           # Template selection
│   ├── camera/              # Camera/recording page
│   └── profile/             # User profile
├── components/              # Reusable components
├── utils/                   # Utility functions
└── assets/                  # Static resources
```

## Development Status
🚧 **Under Development** - Coming September 2024

## Integration
- **Backend API**: Connects to `matrix_ads_backend` for template data
- **Storage**: Uses Firebase Storage for video uploads
- **Authentication**: Syncs with main platform user accounts

## WeChat Mini Program Specific Features
- **WeChat Camera API**: For video recording
- **WeChat Storage API**: For local video caching
- **WeChat Network API**: For backend communication
- **WeChat User Info**: For authentication integration

## Getting Started
1. Install WeChat Developer Tools
2. Import this project
3. Configure API endpoints to match backend
4. Test in WeChat Developer Tools simulator

## API Endpoints
- `GET /api/templates` - Fetch available templates
- `POST /api/videos/upload` - Upload recorded video
- `GET /api/user/profile` - User authentication data

## Configuration
Update `utils/config.js` with:
- Backend API base URL
- Firebase Storage configuration
- WeChat Mini Program App ID
