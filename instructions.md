# PinMeTo Store Finder – Quick Integration Guide

## 📄 Usage Examples

### Store Locator

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

#### Configuration

- **Google Maps API Key:**  
  Backend endpoint `/api/google-maps-key` should return:
  ```json
  { "key": "YOUR_GOOGLE_MAPS_API_KEY" }
  ```
  Or, hardcode the key in the JS (see comments in the script).

- **PinMeTo API Endpoint:**  
  Edit the `API_URL` constant in `simple-store-locator-google.js` if you need a different endpoint.

- **Translations:**  
  - Auto-detects from `<html lang="xx">` or `data-language` on the root container.
  - Add new: copy `public/locales/en.json` → `public/locales/xx.json` and translate.

---

### Store Landing Page

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

#### Show a Specific Store

```text
yourdomain.com/landingpage.html?storeId=123
```

#### Configurable Deep Linking: Query String or Path Parameter

You can choose how the landing page script extracts the store ID for deep linking:

- **Query String (default):**
  - Example: `/landingpage.html?storeId=123`
- **Path Parameter:**
  - Example: `/landingpage/123`

**How to configure:**

At the top of `simple-landing-page-google.js`, set:
```js
const USE_PATH_PARAMETER = false; // false = query string (default), true = path parameter
```
- `false`: Use query string (`?storeId=123`)
- `true`: Use path parameter (`/landingpage/123`)

> If using path parameters, your static host must rewrite all `/landingpage/*` URLs to serve `landingpage.html`.
> The script will fallback to query string if the path parameter is missing.

#### Path Parameter vs. Query String: Pros & Cons

| Approach         | Pros                                                                 | Cons                                                      |
|------------------|----------------------------------------------------------------------|-----------------------------------------------------------|
| Query String     | - Easiest to implement<br>- Works everywhere<br>- No host config    | - Less pretty URLs<br>- Not as SEO-friendly for locations |
| Path Parameter   | - Clean, user-friendly URLs<br>- More SEO-friendly<br>- Shareable   | - Requires host rewrite rules<br>- More setup required    |

---

#### Configuration

- **Default Store Image:**  
  Set `PMT_LANDING_PAGE_DEFAULT_IMAGE_URL` in the JS file.
- **Breadcrumb URLs:**  
  Set `PMT_STORE_LOCATOR_URL` and `PMT_HOME_URL` in the JS file.

- **Translations:**  
  - Auto-detects from `<html lang="xx">` or `data-language` on the root container.
  - Add new: copy `public/locales/en.json` → `public/locales/xx.json` and translate.

---

### Complete Example (Both Components)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Store Finder Example</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="stylesheet" href="/css/simple-store-locator.css">
  <link rel="stylesheet" href="/css/simple-landing-page.css">
</head>
<body>
  <!-- Store Locator -->
  <div id="pmt-store-locator-root"></div>
  <script src="/js/simple-store-locator-google.js"></script>

  <!-- Store Landing Page -->
  <div id="pmt-store-landing-page-container"></div>
  <script src="/js/simple-landing-page-google.js"></script>
</body>
</html>
```

---

### Backend Example for Google Maps API Key (Node.js/Express)

```js
app.get('/api/google-maps-key', (req, res) => {
  res.json({ key: process.env.GOOGLE_MAPS_API_KEY });
});
```

---

### Requirements

- **Font Awesome:** Required for icons.
- **Google Maps:** Valid API key and `/api/google-maps-key` endpoint or hardcoded key.
- **Locales:** Place translation files in `public/locales/`.
- **No build/npm setup required.**

---

### License

MIT License. See `LICENSE` file. 