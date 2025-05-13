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

#### Configuring via Data Attributes (Recommended)

You can set all major configuration options for the store locator via data attributes on the root element:

| Data Attribute                | Purpose                                 | Example Value                                  |
|-------------------------------|-----------------------------------------|------------------------------------------------|
| `data-api-url`                | PinMeTo API endpoint                    | `https://public-api.test.pinmeto.com/pinmeto/abc123/locations.json` |
| `data-fallback-user-lat`      | Fallback latitude if geolocation fails  | `55.60498`                                     |
| `data-fallback-user-lon`      | Fallback longitude if geolocation fails | `13.00382`                                     |
| `data-landing-page-url`       | Store landing page URL                  | `landingpage.html`                             |

**Example:**
```html
<div
  id="pmt-store-locator-root"
  data-api-url="https://public-api.test.pinmeto.com/pinmeto/abc123/locations.json"
  data-fallback-user-lat="55.60498"
  data-fallback-user-lon="13.00382"
  data-landing-page-url="landingpage.html"
></div>
```

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

Or, set the data attribute on the root element:
```html
<div id="pmt-store-landing-page-container" data-use-path-parameter="true"></div>
```

> If using path parameters, your static host must rewrite all `/landingpage/*` URLs to serve `landingpage.html`.
> The script will fallback to query string if the path parameter is missing.

#### Path Parameter vs. Query String: Pros & Cons

| Approach         | Pros                                                                 | Cons                                                      |
|------------------|----------------------------------------------------------------------|-----------------------------------------------------------|
| Query String     | - Easiest to implement<br>- Works everywhere<br>- No host config    | - Less pretty URLs<br>- Not as SEO-friendly for locations |
| Path Parameter   | - Clean, user-friendly URLs<br>- More SEO-friendly<br>- Shareable   | - Requires host rewrite rules<br>- More setup required    |

---

#### Configuring via Data Attributes (Recommended)

You can set all major configuration options for the landing page via data attributes on the root element:

| Data Attribute                | Purpose                                 | Example Value                                  |
|-------------------------------|-----------------------------------------|------------------------------------------------|
| `data-api-url`                | PinMeTo API endpoint                    | `https://public-api.test.pinmeto.com/pinmeto/abc123/locations.json` |
| `data-default-image-url`      | Default store image URL                 | `https://yourdomain.com/images/store-default.jpg` |
| `data-store-locator-url`      | Store locator page URL                  | `https://yourdomain.com/store-locator`         |
| `data-home-url`               | Home page URL for breadcrumbs           | `https://yourdomain.com/`                      |
| `data-use-path-parameter`     | Use path parameter for deep linking     | `true` or `false`                              |

**Example:**
```html
<div
  id="pmt-store-landing-page-container"
  data-api-url="https://public-api.test.pinmeto.com/pinmeto/abc123/locations.json"
  data-default-image-url="https://yourdomain.com/images/store-default.jpg"
  data-store-locator-url="https://yourdomain.com/store-locator"
  data-home-url="https://yourdomain.com/"
  data-use-path-parameter="true"
></div>
```

---

#### Configuration

- **Default Store Image:**  
  Set `PMT_LANDING_PAGE_DEFAULT_IMAGE_URL` in the JS file or via `data-default-image-url`.
- **Breadcrumb URLs:**  
  Set `PMT_STORE_LOCATOR_URL` and `PMT_HOME_URL` in the JS file or via `data-store-locator-url`