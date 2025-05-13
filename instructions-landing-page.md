# PinMeTo Store Landing Page – Integration Guide

> **Configuration is done via data attributes on the root element.**
> This makes integration flexible and easy—just set the options you need as HTML attributes.

## 📄 Usage Example

```html
<!-- 1. Add container -->
<div id="pmt-store-landing-page-container"></div>

<!-- 2. Include the Landing Page JS -->
<script src="/js/simple-landing-page-google.js"></script>

<!-- 3. (Required) Font Awesome for icons -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
```

- The script auto-loads `/css/simple-landing-page.css`.  
  *(Edit the path in the JS if needed.)*

### Show a Specific Store

```text
yourdomain.com/landingpage.html?storeId=123
```

### Configurable Deep Linking: Query String or Path Parameter

You can choose how the landing page script extracts the store ID for deep linking:

- **Query String (default):**
  - Example: `/landingpage.html?storeId=123`
- **Path Parameter:**
  - Example: `/landingpage/123`

**How to configure:**

Set the data attribute on the root element:
  ```html
  <div id="pmt-store-landing-page-container" data-use-path-parameter="true"></div>
  ```


> If using path parameters, your static host must rewrite all `/landingpage/*` URLs to serve `landingpage.html`.
> The script will fallback to query string if the path parameter is missing.

### Path Parameter vs. Query String: Pros & Cons

| Approach         | Pros                                                                 | Cons                                                      |
|------------------|----------------------------------------------------------------------|-----------------------------------------------------------|
| Query String     | - Easiest to implement<br>- Works everywhere<br>- No host config    | - Less pretty URLs<br>- Not as SEO-friendly for locations |
| Path Parameter   | - Clean, user-friendly URLs<br>- More SEO-friendly<br>- Shareable   | - Requires host rewrite rules<br>- More setup required    |

---

### Configuring via Data Attributes (Recommended)

You can set all major configuration options for the landing page via data attributes on the root element:

| Data Attribute                | Purpose                                 | Example Value                                  |
|-------------------------------|-----------------------------------------|------------------------------------------------|
| `data-api-url`                | PinMeTo API endpoint                    | `https://public-api.test.pinmeto.com/pinmeto/abc123/locations.json` |
| `data-default-image-url`      | Default store image URL                 | `https://yourdomain.com/images/store-default.jpg` |
| `data-store-locator-url`      | Store locator page URL                  | `https://yourdomain.com/store-locator`         |
| `data-home-url`               | Home page URL for breadcrumbs           | `https://yourdomain.com/`                      |
| `data-use-path-parameter`     | Use path parameter for deep linking     | `true` or `false`                              |
| `data-locales-path`           | Path to language files (default: `locales/`) | `/custom/locales/`                        |
| `data-google-maps-api-key`    | Google Maps API key (highest priority)  | `YOUR_API_KEY`                                 |

**Google Maps API Key Priority:**
1. `data-google-maps-api-key` attribute (recommended)
2. `window.USE_GOOGLE_MAPS_API_KEY` (global variable)
3. Backend endpoint `/api/google-maps-key`

**Example:**
```html
<div
  id="pmt-store-landing-page-container"
  data-api-url="https://public-api.test.pinmeto.com/pinmeto/abc123/locations.json"
  data-default-image-url="https://yourdomain.com/images/store-default.jpg"
  data-store-locator-url="https://yourdomain.com/store-locator"
  data-home-url="https://yourdomain.com/"
  data-use-path-parameter="true"
  data-locales-path="/custom/locales/"
  data-google-maps-api-key="YOUR_API_KEY"
></div>
```

--- 