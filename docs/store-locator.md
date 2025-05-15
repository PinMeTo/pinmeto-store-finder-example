# PinMeTo Store Locator – Integration Guide

> **Configuration is done via data attributes on the root element.**
> This makes integration flexible and easy—just set the options you need as HTML attributes.

## 📄 Usage Example

```html
<!-- 1. Add container -->
<div id="pmt-store-locator-root"></div>

<!-- 2. Include the Store Locator JS -->
<script src="/js/simple-store-locator-google.js"></script>

<!-- 3. (Required) Font Awesome for icons -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
```

- The script auto-loads `/css/simple-store-locator.css`.  
  *(Edit the path in the JS if needed.)*

### Configuration

- **Google Maps API Key:**  
  You can set the API key via the `data-google-maps-api-key` attribute on the root element (recommended), via `window.USE_GOOGLE_MAPS_API_KEY`, or by providing a backend endpoint `/api/google-maps-key`.
  Priority: 1) data attribute, 2) window variable, 3) backend endpoint.
  ```html
  <div id="pmt-store-locator-root" data-google-maps-api-key="YOUR_API_KEY"></div>
  ```

- **Deep Linking to Store Detail:**
  Use `data-use-path-parameter="true"` to generate links as `/landingpage-url/storeId` (path parameter). Default is query string (`/landingpage-url?storeId=storeId`).
  ```html
  <div id="pmt-store-locator-root" data-use-path-parameter="true"></div>
  ```

- **PinMeTo API Endpoint:**  
  Edit the `API_URL` constant in `simple-store-locator-google.js` if you need a different endpoint.

- **Translations:**  
  - Auto-detects from `<html lang="xx">` or `data-language` on the root container.
  - Add new: copy `public/locales/en.json` → `public/locales/xx.json` and translate.

---

### Configuring via Data Attributes (Recommended)

You can set all major configuration options for the store locator via data attributes on the root element:

| Data Attribute                | Purpose                                 | Example Value                                  |
|-------------------------------|-----------------------------------------|------------------------------------------------|
| `data-api-url`                | PinMeTo API endpoint                    | `https://public-api.test.pinmeto.com/pinmeto/abc123/locations.json` |
| `data-fallback-user-lat`      | Fallback latitude if geolocation fails  | `55.60498`                                     |
| `data-fallback-user-lon`      | Fallback longitude if geolocation fails | `13.00382`                                     |
| `data-landing-page-url`       | Store landing page URL                  | `landingpage.html`                             |
| `data-locales-path`           | Path to language files (default: `locales/`) | `/custom/locales/`                        |
| `data-google-maps-api-key`    | Google Maps API key (highest priority)  | `YOUR_API_KEY`                                 |
| `data-use-path-parameter`     | Use path parameter for store detail deep linking | `true` or `false`                      |
| `data-css-path`               | Path to the CSS file for the store locator         | `/css/simple-store-locator.css`                  |
| `data-first-day-of-week`      | First day of week for opening hours display (0=Sunday, 1=Monday, etc.) | `1` |

**Example:**
```html
<div
  id="pmt-store-locator-root"
  data-api-url="https://public-api.test.pinmeto.com/pinmeto/abc123/locations.json"
  data-fallback-user-lat="55.60498"
  data-fallback-user-lon="13.00382"
  data-landing-page-url="landingpage.html"
  data-locales-path="/custom/locales/"
  data-css-path="/custom/path/to/your.css"
  data-google-maps-api-key="YOUR_API_KEY"
  data-use-path-parameter="true"
  data-first-day-of-week="1"
></div>
```

### First Day of Week Configuration

The `data-first-day-of-week` attribute controls how the opening hours are displayed in the expanded view:

- `0`: Week starts on Sunday (US format)
- `1`: Week starts on Monday (European format, default)
- `2`: Week starts on Tuesday
- etc.

This setting affects:
- The order of days in the expanded opening hours view
- The display of the full week's hours when clicking on today's hours

Example with different configurations:
```html
<!-- European format (Monday first) -->
<div id="pmt-store-locator-root" data-first-day-of-week="1"></div>

<!-- US format (Sunday first) -->
<div id="pmt-store-locator-root" data-first-day-of-week="0"></div>
```

--- 