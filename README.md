# PinMeTo Store Finder & Landing Page – Integration Guide

This guide explains how to embed the PinMeTo Store Locator and Store Landing Page JavaScript files on your own website (www). No build tools or local development setup is required.

---

## 1. Store Locator

Embed a searchable map of your stores on any page.

### How to Use

1. **Add a container to your HTML:**
   ```html
   <div id="pmt-store-locator-root"></div>
   ```

2. **Include the Store Locator JS file:**
   ```html
   <script src="/js/simple-store-locator-google.js"></script>
   ```
   *(Adjust the path if you host the file elsewhere.)*

3. **Include the CSS:**
   The script will automatically load `/css/simple-store-locator.css`. Ensure this file is available at that path, or edit the JS to point to your CSS location.

4. **Google Maps API Key:**
   - The script expects a backend endpoint at `/api/google-maps-key` that returns `{ "key": "YOUR_GOOGLE_MAPS_API_KEY" }`.
   - Alternatively, you can modify the JS to hardcode your API key if you do not have a backend endpoint.

5. **PinMeTo API Endpoint:**
   - The script is preconfigured to use the PinMeTo public API. If you need to change the API URL, edit the `API_URL` constant at the top of `simple-store-locator-google.js`.

### Customization
- **Translations:**
  - The locator auto-detects language from `<html lang="xx">` or a `data-language` attribute on the root container.
  - To add a new language, copy an existing file in `public/locales/` (e.g., `en.json`), translate it, and name it with the appropriate language code (e.g., `de.json`).
- **Styling:**
  - Edit `public/css/simple-store-locator.css` to change the appearance.
- **Icons:**
  - The locator uses Font Awesome icons. Include Font Awesome in your `<head>`:
    ```html
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    ```

---

## 2. Store Landing Page

Display detailed information about a single store, including address, hours, map, and more.

### How to Use

1. **Add a container to your HTML:**
   ```html
   <div id="pmt-store-landing-page-container"></div>
   ```

2. **Include the Landing Page JS file:**
   ```html
   <script src="/js/simple-landing-page-google.js"></script>
   ```
   *(Adjust the path if you host the file elsewhere.)*

3. **Include the CSS:**
   The script will automatically load `/css/simple-landing-page.css`. Ensure this file is available at that path, or edit the JS to point to your CSS location.

4. **Google Maps API Key:**
   - The script expects a backend endpoint at `/api/google-maps-key` that returns `{ "key": "YOUR_GOOGLE_MAPS_API_KEY" }`.
   - Alternatively, you can modify the JS to hardcode your API key if you do not have a backend endpoint.

5. **PinMeTo API Endpoint:**
   - The script is preconfigured to use the PinMeTo public API. If you need to change the API URL, edit the `API_URL` constant at the top of `simple-landing-page-google.js`.

6. **Show a Specific Store:**
   - Link to the landing page with a store ID in the URL:
     ```
     yourdomain.com/landingpage.html?storeId=123
     ```

### Configuration
- **Default Store Image:**
  - Set the `PMT_LANDING_PAGE_DEFAULT_IMAGE_URL` constant in the JS file to your preferred fallback image.
- **Breadcrumb URLs:**
  - Set `PMT_STORE_LOCATOR_URL` and `PMT_HOME_URL` constants in the JS file for correct breadcrumb and SEO links.

### Customization
- **Translations:**
  - The landing page auto-detects language from `<html lang="xx">` or a `data-language` attribute on the root container.
  - To add a new language, copy an existing file in `public/locales/` (e.g., `en.json`), translate it, and name it with the appropriate language code (e.g., `de.json`).
- **Styling:**
  - Edit `public/css/simple-landing-page.css` to change the appearance.
- **Icons:**
  - The landing page uses Font Awesome icons. Include Font Awesome in your `<head>`:
    ```html
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    ```

---

## 3. Notes & Requirements

- **Font Awesome:** Required for icons. Add the CDN link above to your `<head>`.
- **Google Maps:** Requires a valid API key and the `/api/google-maps-key` endpoint or a hardcoded key in the JS.
- **Locales:** Place translation files in `public/locales/` and ensure the correct language code is set in your HTML or container.
- **No build or npm setup is required.**

---

## 4. License

This project is licensed under the MIT License. See the LICENSE file for details.