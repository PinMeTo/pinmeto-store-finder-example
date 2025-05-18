# PinMeTo Store Landing Page – Integration Guide

> **Configuration is done via data attributes on the root element.**
> This makes integration flexible and easy—just set the options you need as HTML attributes.

## 📄 Usage Example

**Example with all options:**
```html
<!-- Basic Example -->
<div id="pmt-store-landing-page-container"></div>

<!-- Full Configuration Example -->
<div
  id="pmt-store-landing-page-container"
  data-api-url="https://public-api.test.pinmeto.com/pinmeto/abc123/locations.json"
  data-default-image-url="https://yourdomain.com/images/store-default.jpg"
  data-store-locator-url="https://yourdomain.com/store-locator"
  data-home-url="https://yourdomain.com/"
  data-use-path-parameter="true"
  data-locales-path="/custom/locales/"
  data-css-path="/custom/path/to/your.css"
  data-google-maps-api-key="YOUR_API_KEY"
  data-language="sv"
></div>

<!-- Required Scripts -->
<script src="/js/simple-landing-page-google.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
```

**Minimal Working Example:**
```html
<!-- Just the container and required scripts -->
<div id="pmt-store-landing-page-container"></div>
<script src="/js/simple-landing-page-google.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
```

**Example with Path Parameter Configuration:**
```html
<div
  id="pmt-store-landing-page-container"
  data-use-path-parameter="true"
  data-api-url="https://public-api.test.pinmeto.com/pinmeto/abc123/locations.json"
></div>
```

**Example with Custom Language:**
```html
<div
  id="pmt-store-landing-page-container"
  data-language="fr"
  data-locales-path="/custom/locales/"
></div>
```

**Example with Google Maps:**
```html
<div
  id="pmt-store-landing-page-container"
  data-google-maps-api-key="YOUR_API_KEY"
></div>
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

| Data Attribute                | Purpose                                 | Default Value | Example Value |
|-------------------------------|-----------------------------------------|---------------|---------------|
| `data-api-url`                | PinMeTo API endpoint                    | `https://public-api.test.pinmeto.com/pinmeto/abc123/locations.json` | `https://public-api.test.pinmeto.com/pinmeto/abc123/locations.json` |
| `data-default-image-url`      | Default store image URL                 | `{origin}/images/store-default.jpg` | `https://yourdomain.com/images/store-default.jpg` |
| `data-store-locator-url`      | Store locator page URL                  | `{origin}/store-locator` | `https://yourdomain.com/store-locator` |
| `data-home-url`               | Home page URL for breadcrumbs           | `{origin}/` | `https://yourdomain.com/` |
| `data-use-path-parameter`     | Use path parameter for deep linking     | `false` | `true` |
| `data-locales-path`           | Path to language files                  | `locales/` | `/custom/locales/` |
| `data-google-maps-api-key`    | Google Maps API key                     | `null` | `YOUR_API_KEY` |
| `data-css-path`               | Path to the CSS file                    | `/css/simple-landing-page.css` | `/custom/path/to/your.css` |
| `data-language`               | Default language for the page           | `en` | `sv` |

**Notes:**
- `{origin}` refers to `window.location.origin`
- All paths are relative to the root of your website unless specified as absolute URLs
- The Google Maps API key can also be set via `window.USE_GOOGLE_MAPS_API_KEY` or fetched from `/api/google-maps-key`

**Example with all options:**
```html
<div
  id="pmt-store-landing-page-container"
  data-api-url="path to your public PinMeTo api endpoint"
  data-default-image-url="https://yourdomain.com/images/store-default.jpg"
  data-store-locator-url="https://yourdomain.com/store-locator"
  data-home-url="https://yourdomain.com/"
  data-use-path-parameter="true"
  data-locales-path="/custom/locales/"
  data-css-path="/custom/path/to/your.css"
  data-google-maps-api-key="YOUR_API_KEY"
  data-language="sv"
></div>
```

### Language Support

The landing page supports multiple languages through locale files. The default language is English (`en`), but you can change it using the `data-language` attribute. Available languages:

- English (`en`)
- Swedish (`sv`)
- French (`fr`)
- Polish (`pl`)

The script will automatically detect the language from:
1. `data-language` attribute
2. `lang` attribute on the HTML element
3. Browser's language settings
4. Fallback to English

### Google Maps Integration

The Google Maps API key can be provided in three ways (in order of priority):
1. `data-google-maps-api-key` attribute
2. `window.USE_GOOGLE_MAPS_API_KEY` global variable
3. Backend endpoint `/api/google-maps-key`

The map will be disabled if no API key is available.

--- 