# CSS Isolation Best Practices

**For 3rd-Party JavaScript Components**

This document outlines best practices for ensuring CSS isolation in JavaScript components that will be embedded in 3rd-party websites. These practices prevent parent page styles from bleeding into your components and ensure consistent rendering across all environments.

---

## Table of Contents
1. [Core Principles](#core-principles)
2. [Selector Scoping](#selector-scoping)
3. [Important Declarations](#important-declarations)
4. [Universal Resets](#universal-resets)
5. [CSS Custom Properties](#css-custom-properties)
6. [Common Pitfalls](#common-pitfalls)
7. [Testing Strategy](#testing-strategy)
8. [Maintenance Guidelines](#maintenance-guidelines)

---

## Core Principles

### 1. Defense in Depth
Use multiple layers of CSS isolation:
- Container scoping
- `!important` declarations
- Universal resets
- Namespaced variables

### 2. Assume Hostile Environment
Always assume the parent page will have:
- Aggressive global selectors (`*`, `div`, `span`)
- `!important` overrides everywhere
- CSS resets that conflict with yours
- Framework-specific styles (Bootstrap, Tailwind, etc.)
- Poor CSS practices

### 3. Never Trust Specificity Alone
Selector specificity is NOT enough. Always use `!important` for 3rd-party components.

---

## Selector Scoping

### ✅ DO: Always Scope with Container ID

```css
/* Good - All selectors scoped */
#my-component-root {
    margin: 0 !important;
}

#my-component-root .header {
    padding: 20px !important;
}

#my-component-root .button {
    background-color: blue !important;
}
```

### ❌ DON'T: Use Unscoped Selectors

```css
/* Bad - Will conflict with parent page */
.header {
    padding: 20px;
}

/* Bad - Global selectors forbidden */
html, body {
    margin: 0;
}

* {
    box-sizing: border-box;
}
```

### Container ID Guidelines
- Use descriptive, unique IDs
- Include product/company name prefix
- Example: `#pmt-store-locator-root`, `#acme-widget-container`

---

## Important Declarations

### ✅ DO: Use !important on ALL Properties

```css
/* Good - Everything protected */
#my-component h1 {
    font-size: 24px !important;
    font-weight: 700 !important;
    color: #333333 !important;
    margin: 0 0 16px 0 !important;
    padding: 0 !important;
    line-height: 1.2 !important;
    text-transform: none !important;
    letter-spacing: normal !important;
}
```

### ❌ DON'T: Skip !important

```css
/* Bad - Parent styles will override */
#my-component h1 {
    font-size: 24px;
    color: #333333;
}
```

### Critical Properties That MUST Have !important
- **Box Model:** `margin`, `padding`, `box-sizing`, `width`, `height`
- **Typography:** `font-family`, `font-size`, `font-weight`, `line-height`, `text-transform`, `letter-spacing`
- **Colors:** `color`, `background-color`, `border-color`
- **Layout:** `display`, `position`, `top`, `right`, `bottom`, `left`, `z-index`
- **Flexbox/Grid:** `flex`, `grid`, `justify-content`, `align-items`
- **All others:** Basically everything

---

## Universal Resets

### ✅ DO: Comprehensive Reset for All Children

```css
/* Excellent - Protect root and all descendants */
#my-component-root {
    /* Root element isolation */
    all: initial !important;
    box-sizing: border-box !important;
    margin: 0 !important;
    padding: 0 !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    font-size: 16px !important;
    line-height: 1.5 !important;
    color: #000000 !important;
    background-color: #ffffff !important;
    text-transform: none !important;
    letter-spacing: normal !important;
    text-decoration: none !important;
}

/* Universal reset for ALL children */
#my-component-root *,
#my-component-root *::before,
#my-component-root *::after {
    box-sizing: border-box !important;
    font-family: inherit !important;
    text-transform: none !important;
    letter-spacing: normal !important;
    text-decoration: inherit !important;
}
```

### Reset Checklist
Include resets for:
- ✅ Box-sizing (always `border-box`)
- ✅ Margins and padding (reset to 0)
- ✅ Font family (inherit from root)
- ✅ Text transformation (none)
- ✅ Letter spacing (normal)
- ✅ Text decoration (none or inherit)
- ✅ List styles (none for ul/ol)
- ✅ Border styles (none by default)

---

## CSS Custom Properties

### ✅ DO: Namespace All Variables

```css
/* Good - Namespaced variables */
:root {
    --my-component-primary-color: #0066cc !important;
    --my-component-spacing-unit: 8px !important;
    --my-component-border-radius: 4px !important;
}

#my-component .button {
    background-color: var(--my-component-primary-color) !important;
    padding: var(--my-component-spacing-unit) !important;
    border-radius: var(--my-component-border-radius) !important;
}
```

### ❌ DON'T: Use Generic Variable Names

```css
/* Bad - Will conflict with parent page variables */
:root {
    --primary-color: #0066cc;
    --spacing: 8px;
}
```

### Variable Naming Convention
- Format: `--{prefix}-{category}-{property}`
- Prefix: Product/company abbreviation (e.g., `pmt`, `acme`)
- Category: Component section (e.g., `button`, `header`, `map`)
- Property: CSS property name (e.g., `color`, `size`, `radius`)
- Example: `--pmt-button-bg-color`, `--pmt-header-height`

---

## Common Pitfalls

### 1. ❌ Global Selectors

```css
/* NEVER DO THIS in 3rd-party components */
html {
    font-size: 16px;
}

body {
    margin: 0;
    font-family: Arial, sans-serif;
}

* {
    box-sizing: border-box;
}
```

**Why:** These affect the entire parent page, not just your component.

**Fix:** Scope everything to your container:
```css
#my-component-root {
    font-size: 16px !important;
    margin: 0 !important;
    font-family: Arial, sans-serif !important;
}
```

### 2. ❌ Weak Specificity

```css
/* Weak - Parent .button will override */
#my-component .button {
    background: blue;
}
```

**Fix:** Use !important:
```css
#my-component .button {
    background: blue !important;
}
```

### 3. ❌ Unscoped Class Names

```css
/* Bad - Generic class name */
.container {
    width: 100%;
}
```

**Fix:** Prefix all classes and scope:
```css
#my-component-root .my-component-container {
    width: 100% !important;
}
```

### 4. ❌ Missing Pseudo-Elements

```css
/* Incomplete - Missing ::before and ::after */
#my-component * {
    box-sizing: border-box !important;
}
```

**Fix:** Include pseudo-elements:
```css
#my-component *,
#my-component *::before,
#my-component *::after {
    box-sizing: border-box !important;
}
```

### 5. ❌ Forgetting Form Elements

Form elements are particularly vulnerable to parent styles:

```css
/* Good - Explicit form element protection */
#my-component input,
#my-component textarea,
#my-component select,
#my-component button {
    font-family: inherit !important;
    font-size: 16px !important;
    line-height: 1.5 !important;
    border: 1px solid #cccccc !important;
    border-radius: 4px !important;
    padding: 8px 12px !important;
    margin: 0 !important;
    box-sizing: border-box !important;
    background-color: #ffffff !important;
    color: #000000 !important;
}
```

---

## Testing Strategy

### 1. Create Aggressive Test Page

Create a test HTML file with intentionally bad CSS:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>CSS Isolation Test</title>
    <style>
        /* Aggressive parent styles */
        * {
            font-family: "Comic Sans MS", cursive !important;
            letter-spacing: 5px !important;
            text-transform: uppercase !important;
            box-sizing: content-box !important;
            margin: 15px !important;
            padding: 10px !important;
            background-color: yellow !important;
            border: 3px dashed cyan !important;
            color: red !important;
        }

        div {
            background-color: yellow !important;
            border: 5px solid orange !important;
        }

        span {
            background-color: orange !important;
            color: purple !important;
        }

        img {
            transform: rotate(5deg) !important;
            border: 10px solid orange !important;
        }
    </style>
</head>
<body>
    <h1>CSS ISOLATION TEST PAGE</h1>
    <p>This page has aggressive parent styles. Your component should be unaffected.</p>

    <!-- Your component here -->
    <div id="my-component-root"></div>

    <p>Text after component should still be affected by parent CSS.</p>
</body>
</html>
```

### 2. Visual Testing Checklist

Before deployment, verify:
- ✅ Typography (font family, size, weight, spacing)
- ✅ Colors (text, background, borders)
- ✅ Spacing (margins, padding)
- ✅ Layout (box model, positioning)
- ✅ Forms (inputs, buttons, selects)
- ✅ Interactive states (hover, focus, active)
- ✅ Responsive behavior
- ✅ Browser DevTools shows your styles winning

### 3. Automated Testing

Use browser automation to capture screenshots:

```javascript
// Example using Playwright
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Normal page
    await page.goto('http://localhost:3000/normal-page.html');
    await page.screenshot({ path: 'normal.png', fullPage: true });

    // Aggressive CSS test page
    await page.goto('http://localhost:3000/css-test.html');
    await page.screenshot({ path: 'aggressive.png', fullPage: true });

    // Compare screenshots
    // Should look identical!

    await browser.close();
})();
```

### 4. Real-World Testing

Test on actual customer websites:
- WordPress sites with various themes
- Shopify stores
- Custom CMS platforms
- Sites with Bootstrap, Tailwind, Material UI
- Sites with poor CSS practices

---

## Maintenance Guidelines

### Adding New Styles

When adding new CSS, always:

1. **Scope with container ID**
   ```css
   #my-component-root .new-element { }
   ```

2. **Add !important to ALL properties**
   ```css
   color: blue !important;
   font-size: 16px !important;
   ```

3. **Use namespaced variables**
   ```css
   --my-component-new-color: blue;
   ```

4. **Test with aggressive parent CSS**
   - View in test page
   - Verify isolation maintained

### Code Review Checklist

Before merging CSS changes:
- ✅ All selectors scoped with container ID?
- ✅ All properties have !important?
- ✅ No global selectors (html, body, *)?
- ✅ All variables namespaced?
- ✅ Form elements protected?
- ✅ Pseudo-elements included in resets?
- ✅ Tested with aggressive parent CSS?
- ✅ Screenshots captured and compared?

### Refactoring Existing CSS

If you need to fix existing CSS:

1. **Audit current state**
   - Search for unscoped selectors
   - Find missing !important declarations
   - Identify global selectors

2. **Use scripts for bulk changes**
   ```javascript
   // Example: Add !important to all properties
   const css = fs.readFileSync('style.css', 'utf8');
   const fixed = css.replace(/:\s*([^;!]+);/g, ': $1 !important;');
   fs.writeFileSync('style-fixed.css', fixed);
   ```

3. **Test thoroughly**
   - Before/after screenshots
   - Multiple environments
   - Edge cases

---

## Tools and Resources

### Helpful Tools
- **PostCSS Plugins:**
  - `postcss-prefix-selector` - Auto-prefix selectors
  - `postcss-important` - Add !important automatically

- **Browser Extensions:**
  - CSS Specificity Visualizer
  - Specificity Calculator

- **Testing:**
  - Playwright for automated screenshots
  - Percy for visual regression testing

### Further Reading
- [CSS Specificity Calculator](https://specificity.keegan.st/)
- [CSS Cascade and Inheritance](https://developer.mozilla.org/en-US/docs/Web/CSS/Cascade)
- [Shadow DOM for True Isolation](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM)

---

## Summary

### The Golden Rules

1. **🔐 Always scope with container ID**
2. **‼️ Always use !important**
3. **🔄 Always add universal resets**
4. **🏷️ Always namespace variables**
5. **🚫 Never use global selectors**
6. **🧪 Always test with aggressive CSS**

### Quick Reference

```css
/* Perfect CSS isolation template */
#my-component-root {
    /* Reset everything */
    all: initial !important;
    box-sizing: border-box !important;
    margin: 0 !important;
    padding: 0 !important;
    font-family: system-ui, sans-serif !important;
    font-size: 16px !important;
    line-height: 1.5 !important;
    color: #000000 !important;
    background: #ffffff !important;
    text-transform: none !important;
    letter-spacing: normal !important;
}

/* Universal reset */
#my-component-root *,
#my-component-root *::before,
#my-component-root *::after {
    box-sizing: border-box !important;
    font-family: inherit !important;
    text-transform: none !important;
    letter-spacing: normal !important;
}

/* All component styles */
#my-component-root .element {
    property: value !important;
}
```

---

**Last Updated:** 2025-10-09
**Version:** 1.0
**Status:** Production Ready ✅
