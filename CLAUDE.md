# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PinMeTo Store Locator & Landing Page Scripts is a lightweight, framework-free solution for adding store locator and landing page functionality to any website. The project uses vanilla JavaScript (ES6+) with Google Maps integration to provide searchable store locations and detailed store landing pages.

## Architecture

### Two Main Components

1. **Store Locator** (`public/js/simple-store-locator-google.js`, ~1367 lines)
   - Interactive map-based store finder
   - Real-time distance calculations from user location
   - Search functionality by store name, city, or zip code
   - List and map view of stores
   - Deep linking support (query string or path parameter)

2. **Landing Page** (`public/js/simple-landing-page-google.js`, ~1654 lines)
   - Individual store detail pages
   - Opening hours with special hours support
   - Photo gallery (configurable via `data-show-images`)
   - Customer reviews (configurable via `data-show-reviews`)
   - SEO optimization with structured data and meta tags
   - Breadcrumb navigation

### Data Flow

Both components follow this pattern:
1. Load translations based on `<html lang>` or `data-language` attribute
2. Fetch Google Maps API key (from data attribute, window variable, or `/api/google-maps-key` endpoint)
3. Load Google Maps SDK dynamically
4. Fetch store data from PinMeTo API endpoint
5. Render UI with translations and store data
6. Initialize interactive map

### Configuration System

All configuration is done via **data attributes** on the root element for easy integration:
- Store Locator root: `#pmt-store-locator-root`
- Landing Page root: `#pmt-store-landing-page-container`

Priority order for configuration:
1. Data attributes on root element (highest priority)
2. Window variables
3. Hardcoded defaults or backend endpoints

### Translation System

- Translation files in `public/locales/` (JSON format)
- Languages: English (en), Swedish (sv), Polish (pl), French (fr)
- Auto-detection from HTML lang attribute or data attribute
- Helper function: `t(key, replacements)` supports dot notation and placeholder replacement

### Inline SVG Icons

All icons are embedded as inline SVGs in the JavaScript code. No external icon libraries (like Font Awesome) are required, despite what older documentation may suggest.

## Development Commands

### Server Management
```bash
npm start         # Start production server (port 3000)
npm run dev       # Start development server with nodemon (auto-reload)
```

### Environment Setup
1. Copy `.env.example` to `.env` (if it exists)
2. Set `GOOGLE_MAPS_API_KEY` in `.env`
3. Alternatively, pass API key via data attributes on root elements

### Testing
The project currently has no automated tests (`npm test` will exit with error).

## Key Implementation Details

### IIFE Pattern
Both main JavaScript files use async IIFE pattern for module encapsulation:
```javascript
(async function() {
    // Module code
})();
```

### Deep Linking
Two modes for landing page URLs:
- **Query String** (default): `/landingpage.html?storeId=123`
- **Path Parameter**: `/landingpage-path/123`

Configure via `data-use-path-parameter="true"` on root element. Path parameter mode requires server rewrites (see `server.js` for Express example).

### Distance Calculation
Store Locator uses Haversine formula to calculate distances from user location. Fallback location (default: Malmö, Sweden) is used if geolocation is denied or unavailable.

### Opening Hours Handling
- Supports regular and special opening hours
- Day ordering configurable via `data-first-day-of-week` (0=Sunday, 1=Monday)
- Multiple time slots per day supported
- "Closed" state explicitly handled

### API Response Structure
Expects PinMeTo API format with locations array containing:
- `store_id`, `name`, `street_address`, `city`, `country`, `zip_code`
- `coordinates`: `{lat, long}`
- `opening_hours`: array of `{day, from_hour, to_hour}`
- `special_opening_hours`: array with `{date, day, from_hour, to_hour}`
- `categories`, `contact_information`, `social_links`
- `images`, `reviews` (optional, controlled by feature toggles)

## Code Style Guidelines

### JavaScript Standards (from `.cursor/rules/javascript-standards.mdc`)
- Use vanilla JavaScript (ES6+) features only
- Avoid framework-specific code
- Use async/await for asynchronous operations
- Use const/let instead of var
- Cache DOM references when reused
- Implement proper error handling with try/catch
- Use template literals for string interpolation
- Sanitize user input and never expose API keys in client-side code

### Performance Considerations
- Minimize DOM operations
- Use debouncing for frequent events (search input)
- Lazy load Google Maps SDK
- Cache API responses when appropriate

## File Structure

```
.
├── server.js                          # Express server with CORS and static file serving
├── public/
│   ├── index.html                     # Main demo page
│   ├── landingpage.html               # Landing page (query string mode)
│   ├── landingpage-path.html          # Landing page (path parameter mode)
│   ├── js/
│   │   ├── simple-store-locator-google.js    # Store locator component
│   │   └── simple-landing-page-google.js     # Landing page component
│   ├── css/
│   │   ├── simple-store-locator.css          # Store locator styles
│   │   ├── simple-landing-page.css           # Landing page styles
│   │   └── style.css                          # Demo page styles
│   ├── locales/
│   │   ├── en.json                    # English translations
│   │   ├── sv.json                    # Swedish translations
│   │   ├── pl.json                    # Polish translations
│   │   └── fr.json                    # French translations
│   └── data-example/
│       └── locations.json              # Sample data for testing
└── docs/
    ├── store-locator.md                # Store locator integration guide
    └── landing-page.md                 # Landing page integration guide
```

## Common Development Tasks

### Adding a New Translation Language
1. Copy `public/locales/en.json` to `public/locales/{language-code}.json`
2. Translate all keys (maintain JSON structure)
3. Set `<html lang="{language-code}">` or `data-language="{language-code}"` on root element
4. Test with: `http://localhost:3000/?storeId=123`

### Modifying Store Data API
Edit the `API_URL` constant in both JavaScript files, or use `data-api-url` attribute on root elements.

### Customizing Styles
CSS files are auto-loaded by the JavaScript modules. Override via:
- Modify files in `public/css/`
- Or set custom path via `data-css-path` attribute
- Or add additional styles in page-specific stylesheets

### Adding New Configuration Options
1. Add getter in the `getConfigFromDataAttr()` helper section
2. Document in `data-*` attributes table
3. Update relevant integration guide in `docs/`

## Visual Development

### Design Principles
- Comprehensive design checklist in `/context/design-principles.md`
- Brand style guide in `/context/style-guide.md`
- When making visual (front-end, UI/UX) changes, always refer to these files for guidance

### Quick Visual Check
IMMEDIATELY after implementing any front-end change:
1. **Identify what changed** - Review the modified components/pages
2. **Navigate to affected pages** - Use `mcp__playwright__browser_navigate` to visit each changed view
3. **Verify design compliance** - Compare against `/context/design-principles.md` and `/context/style-guide.md`
4. **Validate feature implementation** - Ensure the change fulfills the user's specific request
5. **Check acceptance criteria** - Review any provided context files or requirements
6. **Capture evidence** - Take full page screenshot at desktop viewport (1440px) of each changed view
7. **Check for errors** - Run `mcp__playwright__browser_console_messages`

This verification ensures changes meet design standards and user requirements.

### Comprehensive Design Review
Invoke the design review agent for thorough design validation when:
- Completing significant UI/UX features
- Before finalizing PRs with visual changes
- Needing comprehensive accessibility and responsiveness testing

## Important Notes

- **No Build Step**: This is a plain HTML/CSS/JS project. No bundler or transpiler required.
- **Google Maps Dependency**: Both components require a valid Google Maps API key with Maps JavaScript API and Places API enabled.
- **PinMeTo API**: Designed to work with PinMeTo's public API format. Custom API endpoints must return compatible JSON structure.
- **Browser Compatibility**: Uses modern JavaScript (ES6+). Requires support for async/await, fetch API, and modern DOM APIs.
- **Security**: API keys can be stored server-side (recommended) and served via `/api/google-maps-key` endpoint to avoid client-side exposure.

## Git Commit Guidelines

When creating commits, include all changes made from the last commit in the session (as specified in `.cursor/rules/git-commit.mdc`).
