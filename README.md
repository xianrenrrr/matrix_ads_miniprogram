# Matrix Ads Mini Program

WeChat Mini Program for content creators to record and submit videos.

## Structure

```
pages/
├── index/              # Home page with template selection
├── camera/             # Camera page for recording scenes
├── scene-selection/    # Scene selection and preview
├── video-preview/      # Preview recorded video
├── upload-success/     # Upload confirmation
├── my-videos/          # User's submitted videos
├── profile/            # User profile and settings
└── login/              # Login page

components/             # Reusable components
utils/                  # Utility functions
assets/                 # Images and static assets
```

## Key Features

- **Scene-by-Scene Recording** - Guide users through recording each scene
- **Real-time Preview** - Preview recorded scenes before submission
- **AI Scoring** - Get AI similarity scores for submissions
- **Template Selection** - Browse and select templates to record

## Development

1. Install WeChat DevTools
2. Open this folder in WeChat DevTools
3. Configure `app.json` with your AppID
4. Start development

## Configuration

Update `app.js` with your backend URL:
```javascript
const API_BASE_URL = 'https://your-backend.onrender.com';
```

## Tech Stack

- **Platform:** WeChat Mini Program
- **Language:** JavaScript + WXML/WXSS
- **Features:** Camera API, Video Recording, File Upload

## File Structure

Each page has 3 files:
- `.js` - Page logic
- `.wxml` - Page template (HTML-like)
- `.wxss` - Page styles (CSS-like)

## Known Issues

- No major issues found
- Well-structured and organized
- Could benefit from more comments

See `docs/FILE_INVENTORY.md` for complete file listing.
