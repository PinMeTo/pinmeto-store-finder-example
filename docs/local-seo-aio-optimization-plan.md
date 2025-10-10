# Local SEO & AIO Optimization Plan
## Landing Page Enhancement Strategy

**Date Created:** 2025-10-09
**Last Updated:** 2025-10-10
**Test URL:** http://localhost:3000/landingpage-path/CT?test=true
**Target File:** `public/js/simple-landing-page-google.js`

---

## 📋 Phase 1 Status (Updated 2025-10-10)

**Completed:** 5/7 tasks ✅
**Deferred:** 2/7 tasks ⏸️ (pending API updates)

### ✅ Working
- LocalBusiness @type
- additionalType (business classification)
- postalCode (fixed)
- hasMap (Google Maps link)
- description
- areaServed

### ⏸️ Pending API Data
- **aggregateRating**: Requires `store.reviews[]` array in API response
- **parentOrganization**: Requires `store.brandUrl`, `store.brandLogo`, `store.brandSocialMedia[]`

**Schema Validation:** ✅ PASSED (Schema.org Validator: 0 errors, 0 warnings)

---

## Executive Summary

This document outlines a comprehensive plan to optimize the PinMeTo landing page for Local SEO and AI Overviews (AIO). The current implementation has basic structured data but is missing critical properties that would significantly improve visibility in local search results and AI-generated summaries.

---

## Current State Analysis

### ✅ What's Working Well

- Basic Schema.org Store structured data present
- Open Graph and Twitter Card meta tags implemented
- Canonical URL set
- BreadcrumbList structured data
- Opening hours in structured data
- Geographic coordinates (lat/long) included
- Social media links in `sameAs` property
- Reviews displayed on page

### ❌ Critical Issues Found

#### 1. Schema.org Issues (High Priority)

**Problem:** Using wrong @type
- Currently: `"@type": "Store"`
- Should be: `"@type": "LocalBusiness"` for better local SEO
- Rationale: LocalBusiness is more specific and preferred by Google for local search

**Missing Critical LocalBusiness Properties:**
- `priceRange` - Helps AI understand affordability (e.g., "$$", "$$$")
- `areaServed` - Defines service area (city, region, country)
- `aggregateRating` - Reviews exist but not aggregated in structured data
- `hasMap` - Direct link to Google Maps location
- `paymentAccepted` - Important for local search (e.g., "Cash, Credit Card, Debit Card")
- `currenciesAccepted` - Currency information (e.g., "PLN", "EUR")
- `additionalType` - More specific business classification
- `about` - Concise business description for AI summaries

**Data Quality Issues:**
- Postal code empty in structured data (shows "" instead of "72-600")
- No parent Organization/brand structure
- Reviews not marked up with Review schema

**Location:** `simple-landing-page-google.js:649-669`

---

#### 2. NAP (Name, Address, Phone) Consistency

**Phone Formatting Issue:**
- Display: "85 585 58 55"
- Tel link: `tel:855855855` (all spaces removed)
- Problem: Inconsistent formatting may confuse search engines
- Solution: Standardize to international format with proper tel: link

**Postal Code Missing:**
- UI displays: "72-600"
- Structured data: `postalCode: ""`
- Impact: Critical NAP signal missing from schema

**Location:** Check data mapping from API response to structured data

---

#### 3. AIO (AI Overviews) Optimization Issues

**Missing FAQ Schema:**
- No Q&A structured data
- Impact: AI Overviews often pull from FAQPage schema
- Opportunity: Add common questions (hours, location, services, parking, etc.)

**No Category/Business Type:**
- Missing detailed business classification
- Should include: industry, business type, specializations
- Example: Electronics store, appliances, home entertainment

**Weak Description:**
- Current: Generic corporate description
- Needed: Location-specific description with local keywords
- Should include: Neighborhood, landmarks, unique offerings, local context

**Missing Service/Product Schema:**
- No detailed offerings in structured data
- Opportunity: List main product categories or services
- Helps AI understand what business offers

**No "speakable" Markup:**
- Missing voice search optimization
- WebPage schema with speakable sections helps voice assistants

---

#### 4. Meta Tags & SEO

**Language Mismatch:**
- HTML: `<html lang="sv">` (Swedish)
- Content: Polish (store in Poland, Polish description)
- Impact: Confuses search engines and may affect rankings
- Fix: Detect language from store location or API data

**Missing hreflang Tags:**
- No multi-language support markup
- If same store has pages in multiple languages, need hreflang
- Important for international businesses

**Generic Image Fallback:**
- Using: `http://localhost:3000/images/store-default.jpg`
- Should use: Actual store photo from API data
- Impact: Rich snippets less appealing without real images

**Title Optimization:**
- Current: "RTV EURO AGD – Świnoujście | Opening Hours, Address & Contact"
- Good: Includes city and store name
- Could improve: Add unique selling proposition or category
- Example: "RTV EURO AGD – Electronics & Appliances in Świnoujście | Opening Hours"

**Location:** `simple-landing-page-google.js:634-645`

---

#### 5. Content & UX for AIO

**Business Hours Statement:**
- Current: Just list format
- Better: Add natural language statement
- Example: "Open Monday-Saturday 9am-8pm, Sunday 10am-6pm"
- Helps AI extract and summarize hours

**Missing Accessibility:**
- Review star ratings lack aria-labels
- Important for screen readers and semantic understanding

**No "About" Section:**
- AI crawlers prefer clear, dedicated sections
- Should have: Business description, history, specializations
- Currently: Only description in meta tags, not visible content

**Review Schema Missing:**
- Reviews displayed but not in structured data
- Should use: Individual Review schema with itemReviewed
- Helps: Star ratings appear in search results

---

## 🎯 Implementation Plan

### Phase 1: Critical Schema.org Fixes ⭐⭐⭐

**Priority:** Highest - Foundation for all local SEO
**Estimated Impact:** 30-40% improvement in local search visibility
**Time Estimate:** 2-3 hours

#### Tasks:

- [x] **1. Change @type from "Store" to "LocalBusiness"** ✅ COMPLETED (2025-10-09)
  - File: `simple-landing-page-google.js:666`
  - Change: `"@type": "Store"` → `"@type": "LocalBusiness"`
  - Test: Validate with Google's Rich Results Test

- [x] **2. Add detailed business type using additionalType** ✅ COMPLETED (2025-10-09)
  - Add property: `"additionalType": "http://www.productontology.org/id/Electronics_store"`
  - Or use categories from API data if available
  - Example: "Electronics Store", "Appliance Store", "Home Entertainment"
  - **Implementation:** Extracts from `store.network.google.categories.primaryCategory.name` with fallbacks

- [x] **3. Fix postal code in structured data** ✅ COMPLETED (2025-10-09)
  - Current: `postalCode: ""`
  - Fix: Ensure postal code from API is properly mapped
  - Expected: `postalCode: "72-600"`
  - Check API response structure for zip_code/postal_code field
  - **Implementation:** Now uses `store.address.zip` (primary field in PinMeTo API)

- [ ] **4. Add aggregateRating from reviews data** ⏸️ DEFERRED - Pending API Update (2025-10-10)
  - Calculate from reviews array
  - Add to schema:
    ```json
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.5",
      "reviewCount": "127",
      "bestRating": "5",
      "worstRating": "1"
    }
    ```
  - Use actual review data from API or test data
  - **Implementation Status:** Code exists (`calculateAggregateRating()` helper at lines 580-594) but not executing because:
    - `REVIEWS_DATA` is defined inside `initializeApp()` function (line 1339)
    - Schema is generated before reviews data is available
  - **TODO**: Once API provides `store.reviews` array, this will work automatically
  - **Alternative**: Move `REVIEWS_DATA` to global scope for testing with demo data

- [x] **5. Add hasMap property with Google Maps URL** ✅ COMPLETED (2025-10-09)
  - Add property: `"hasMap": "https://maps.google.com/maps?cid=1884650547752002378"`
  - Or use: `"hasMap": "https://www.google.com/maps/dir/?api=1&destination=LAT,LONG"`
  - Already have coordinates, just need to add property
  - **Implementation:** Prefers `store.network.google.link` from API, fallback to generated URL

- [ ] **6. Add parent Organization schema for brand** ⏸️ DEFERRED - Pending API Update (2025-10-10)
  - Create separate script tag or nested structure
  - Schema:
    ```json
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "RTV EURO AGD",
      "url": "https://www.euro.com.pl",
      "logo": "https://www.euro.com.pl/logo.png",
      "sameAs": [
        "https://www.facebook.com/rtveuroagd",
        "https://www.instagram.com/rtveuroagd"
      ]
    }
    ```
  - Link LocalBusiness to Organization with `"parentOrganization"` property
  - **Implementation Status:** Code exists (lines 758-794) but not executing because:
    - Logic requires: `brandName !== storeName` OR `store.brandUrl` OR `store.brandLogo`
    - Current: "RTV EURO AGD" has brandName === storeName, no brandUrl/brandLogo in API
  - **TODO**: API should provide `store.brandUrl`, `store.brandLogo`, and `store.brandSocialMedia[]`
  - **Alternative**: Adjust logic to always create Organization for known brands

- [x] **7. Added enhanced LocalBusiness properties** ✅ COMPLETED (2025-10-09)
  - description (from store.longDescription)
  - areaServed (City schema with store city)
  - priceRange, paymentAccepted, currenciesAccepted (configurable via data attributes)

**Validation:**
- [ ] Test with: https://search.google.com/test/rich-results (requires public URL)
- [x] Test with: https://validator.schema.org/ ✅ **PASSED: 0 ERRORS, 0 WARNINGS** (2025-10-10)
- [x] Check: All required LocalBusiness properties present ✅
- [x] Check: No errors or warnings in validation ✅

---

### Phase 2: Enhanced Local SEO Properties ⭐⭐

**Priority:** High - Improves ranking signals
**Estimated Impact:** 20-30% improvement in local pack inclusion
**Time Estimate:** 2-3 hours
**Status:** ⏸️ DEFERRED - Pending API Updates (2025-10-10)

#### Tasks:

- [ ] **7. Add priceRange property** ⏸️ PENDING API
  - Determine price range: "$", "$$", "$$$", "$$$$"
  - Add: `"priceRange": "$$"`
  - Base on: Average product prices or store positioning
  - Important for: Local search filtering and AI summaries

- [x] **8. Add areaServed (city/region)** ✅ COMPLETED in Phase 1 (2025-10-09)
  - Add property:
    ```json
    "areaServed": {
      "@type": "City",
      "name": "Świnoujście"
    }
    ```
  - Or array if serving multiple areas
  - Helps: Define service radius for local search
  - **Implementation:** Already added in Phase 1

- [ ] **9. Add paymentAccepted and currenciesAccepted** ⏸️ PENDING API
  - Add properties:
    ```json
    "paymentAccepted": "Cash, Credit Card, Debit Card, Mobile Payment",
    "currenciesAccepted": "PLN"
    ```
  - Source from: API data or default values
  - Important for: Customer decision-making and search filters
  - **TODO**: API should provide `store.paymentMethods[]` and `store.currency`

- [ ] **10. Add image array with multiple store photos** ⏸️ PENDING API
  - Current: Single image from Facebook
  - Change to: Array of store photos from API
  - Schema:
    ```json
    "image": [
      "https://example.com/store-front.jpg",
      "https://example.com/store-interior.jpg",
      "https://example.com/store-products.jpg"
    ]
    ```
  - Source from: `store.images[]` array in API response
  - Fallback: Use default if no images available
  - **TODO**: API should provide `store.images[]` with multiple high-quality store photos

- [ ] **11. Fix phone number consistency** ⏸️ PENDING API
  - Standardize format: "+48 85 585 58 55" (international format)
  - Structured data: `"telephone": "+48855855855"`
  - Display: "+48 85 585 58 55" (with spaces for readability)
  - Tel link: `tel:+48855855855` (no spaces, with country code)
  - Ensure: All three match the same phone number
  - **TODO**: API should provide phone with country code (e.g., `store.phoneInternational`)

**Validation:**
- [ ] Check: Phone number clickable and dials correctly on mobile
- [ ] Check: Images load properly in rich results preview
- [ ] Test: Local search results show enhanced information

---

### Phase 3: AIO-Specific Enhancements ⭐⭐

**Priority:** Medium-High - Optimizes for AI-generated summaries
**Estimated Impact:** 60-70% better chance of being featured in AI Overviews
**Time Estimate:** 3-4 hours
**Status:** 🚧 IN PROGRESS - Task 13 Complete (2025-10-10)

**Completed:** 1/6 tasks ✅

#### Tasks:

- [ ] **12. Add individual Review schema for each review**
  - For each review in reviews array, add:
    ```json
    {
      "@type": "Review",
      "@id": "review-{id}",
      "author": {
        "@type": "Person",
        "name": "Anna Olszewska"
      },
      "datePublished": "2024-12-17",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "5",
        "bestRating": "5"
      },
      "reviewBody": "I recommend",
      "publisher": {
        "@type": "Organization",
        "name": "Google"
      }
    }
    ```
  - Add as separate schema or within LocalBusiness `review` property
  - Include response if available

- [x] **13. Add FAQPage schema (common questions)** ✅ COMPLETED (2025-10-10)
  - Create new structured data for common FAQs:
    ```json
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What are the opening hours?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "We are open Monday-Saturday 9:00-20:00 and Sunday 10:00-18:00"
          }
        },
        {
          "@type": "Question",
          "name": "Where is the store located?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "We are located at ul.Tadeusza Kościuszki 15, Świnoujście, 72-600, Poland"
          }
        },
        {
          "@type": "Question",
          "name": "What payment methods do you accept?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "We accept cash, credit cards, debit cards, and mobile payments"
          }
        }
      ]
    }
    ```
  - Add 5-10 common questions
  - Make configurable via data attribute or API
  - **Implementation Details:**
    - Feature toggle: `data-enable-faq="true"` on root element (line 39)
    - FAQ generation: `generateFAQQuestions()` function (lines 820-926)
    - Dynamically generates up to 7 questions based on available store data:
      1. Opening hours (with support for multiple time spans per day)
      2. Store location (address)
      3. Contact information (phone)
      4. Directions (Google Maps link)
      5. Payment methods (from data attribute)
      6. Special hours (if available)
      7. Services/Products (from business type)
    - Natural language formatter: `formatOpeningHoursNaturally()` (lines 928-979)
    - Handles variable opening hours with multiple time spans (e.g., "9:00-12:00 and 14:00-18:00")
    - Schema injected as separate `<script type="application/ld+json">` tag with `data-pmt-faq` attribute
    - **Validation:** ✅ PASSED Schema.org Validator (0 errors, 0 warnings) - 2025-10-10
    - **Test Result:** Successfully generated 5 dynamic FAQ questions on test page

- [ ] **14. Add about property with concise business description**
  - Add to LocalBusiness schema:
    ```json
    "about": "RTV EURO AGD is Poland's leading electronics and home appliance retailer, offering a wide selection of TVs, audio equipment, home appliances, and consumer electronics with expert advice and comprehensive after-sales support."
    ```
  - Keep concise: 1-2 sentences
  - Include: Key offerings, unique value proposition
  - Optimize for: AI summary generation

- [ ] **15. Add structured Service or Product offerings**
  - Option A: Add `makesOffer` property with offers/services
  - Option B: Use `hasOfferCatalog` for product categories
  - Example:
    ```json
    "makesOffer": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Electronics Sales",
          "category": "Consumer Electronics"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Home Appliances",
          "category": "Appliances"
        }
      }
    ]
    ```
  - Source from: API categories or default set

- [ ] **16. Enhance meta description with local keywords**
  - Current: Generic corporate description
  - Improve: Add location-specific context
  - Example: "Visit RTV EURO AGD in Świnoujście city center for the best selection of electronics and home appliances. Located at ul. Kościuszki 15, near the town square. Expert advice and competitive prices."
  - Include: Neighborhood, landmarks, nearby areas
  - Length: 150-160 characters optimal

**Validation:**
- [ ] Test: Google Rich Results Test for all schema types
- [ ] Check: FAQ schema appears in search console
- [ ] Monitor: Featured snippet and AI Overview appearances
- [ ] Verify: Descriptions read naturally and are accurate

---

### Phase 4: Technical SEO ⭐

**Priority:** Medium - Fixes technical issues
**Estimated Impact:** 10-15% improvement in overall SEO health
**Time Estimate:** 2 hours

#### Tasks:

- [ ] **17. Fix language attribute to match content language**
  - Current issue: `<html lang="sv">` but content is Polish
  - Solution: Detect language from:
    1. Store country/location (Poland → "pl")
    2. API data language field
    3. URL parameter or data attribute
  - Implementation:
    ```javascript
    // Detect language based on store country
    const countryToLang = {
      'Poland': 'pl',
      'Sweden': 'sv',
      'France': 'fr',
      'United Kingdom': 'en'
    };
    const detectedLang = countryToLang[store.address.country] || 'en';
    document.documentElement.lang = detectedLang;
    ```
  - Fallback: Use existing data-language attribute or default to 'en'

- [ ] **18. Add hreflang tags for multi-language support**
  - If same store has multiple language versions, add:
    ```html
    <link rel="alternate" hreflang="pl" href="https://example.com/store/123?lang=pl" />
    <link rel="alternate" hreflang="en" href="https://example.com/store/123?lang=en" />
    <link rel="alternate" hreflang="x-default" href="https://example.com/store/123" />
    ```
  - Only add if: Multi-language support is enabled
  - Configuration: Via data attribute `data-enable-hreflang="true"`

- [ ] **19. Ensure breadcrumb nav matches structured data**
  - Currently: BreadcrumbList schema exists
  - Check: Visual breadcrumb navigation on page matches schema
  - Add if missing: Visible breadcrumb UI component
  - Styling: Should match design system

- [ ] **20. Ensure all images have descriptive alt text**
  - Store photos: "RTV EURO AGD store front in Świnoujście"
  - Map: "Map showing location of RTV EURO AGD"
  - Social icons: "Visit us on Facebook", "Find us on Google Maps"
  - Check: Current implementation in code

- [ ] **21. Add JSON-LD for WebPage with speakable sections**
  - Add WebPage schema:
    ```json
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "RTV EURO AGD - Świnoujście Store Page",
      "description": "Store information for RTV EURO AGD in Świnoujście",
      "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": [".pmt-store-name", ".pmt-address", ".pmt-opening-hours"]
      }
    }
    ```
  - Marks: Sections optimized for voice search
  - Helps: Voice assistants like Google Assistant read key info

**Validation:**
- [ ] Check: Language attribute matches content
- [ ] Verify: All hreflang tags point to valid URLs
- [ ] Test: Voice search reads correct information
- [ ] Validate: All schema types pass Google's validator

---

### Phase 5: Content Enhancements for AI

**Priority:** Medium - Improves content quality
**Estimated Impact:** 15-20% improvement in user engagement and AI understanding
**Time Estimate:** 2-3 hours

#### Tasks:

- [ ] **22. Add explicit business hours in natural language**
  - Add above or below hours list:
    ```html
    <p class="pmt-hours-summary">
      Open Monday through Saturday from 9:00 AM to 8:00 PM,
      and Sunday from 10:00 AM to 6:00 PM.
    </p>
    ```
  - Generate dynamically from opening hours data
  - Helps: AI extract and summarize hours in natural language
  - Consider: Special hours messaging ("Open late on Fridays!")

- [ ] **23. Add "About this location" section**
  - New section with unique store description:
    ```html
    <section class="pmt-about-section">
      <h2>About This Location</h2>
      <p>
        Our Świnoujście store is conveniently located in the city center
        at ul. Kościuszki 15, just steps from the town square. We offer
        a wide selection of electronics and home appliances with expert
        staff ready to help you find the perfect product.
      </p>
    </section>
    ```
  - Source from: API description field or generate from location data
  - Include: Neighborhood context, unique features, parking info

- [ ] **24. Add accessibility labels for star ratings**
  - Add aria-labels to review ratings:
    ```html
    <div class="pmt-review-rating" aria-label="Rated 5 out of 5 stars">
      <span class="pmt-star">★</span>
      <span class="pmt-star">★</span>
      <span class="pmt-star">★</span>
      <span class="pmt-star">★</span>
      <span class="pmt-star">★</span>
    </div>
    ```
  - Helps: Screen readers and semantic understanding
  - Important for: Accessibility compliance and SEO

- [ ] **25. Add "Services" or "Products" section**
  - If available in API data, add section:
    ```html
    <section class="pmt-services-section">
      <h2>Products & Services</h2>
      <ul>
        <li>Televisions & Home Theater</li>
        <li>Computers & Tablets</li>
        <li>Home Appliances</li>
        <li>Small Electronics</li>
        <li>Expert Installation Services</li>
        <li>Extended Warranty Options</li>
      </ul>
    </section>
    ```
  - Source from: API categories or default list
  - Configurable: Via data attribute `data-show-services="true"`

- [ ] **26. Optimize H1 and H2 hierarchy for semantic clarity**
  - Ensure proper heading structure:
    - H1: Store name only (already correct)
    - H2: Main sections (Address, Hours, Reviews, About, Services)
    - H3: Subsections if needed
  - Check: No skipped levels (H1 → H3 without H2)
  - Audit: Current heading structure in code

**Validation:**
- [ ] Test: Screen reader compatibility
- [ ] Check: Content reads naturally and is accurate
- [ ] Verify: All sections have proper heading hierarchy
- [ ] Validate: WCAG 2.1 AA compliance for accessibility

---

## 📊 Expected Impact Summary

| Optimization Area | Expected Impact | Metrics Affected |
|------------------|----------------|------------------|
| **Local Search Visibility** | 🔼 30-40% | Local pack rankings, "near me" queries |
| **AI Overviews Inclusion** | 🔼 60-70% | Featured in AI-generated summaries |
| **Voice Search** | 🔼 50% | "near me" queries, hours, directions |
| **Click-Through Rate** | 🔼 20-25% | Rich snippets with ratings, hours, images |
| **Structured Data Coverage** | 🔼 100% | 6+ schema types vs. 2 currently |
| **Mobile Search** | 🔼 35% | Better local results on mobile devices |
| **Conversion Rate** | 🔼 15-20% | More qualified traffic from local search |

---

## Testing & Validation Checklist

### Before Implementation
- [ ] Backup current code
- [ ] Document current performance metrics (rankings, traffic)
- [ ] Export current structured data for comparison

### During Implementation
- [ ] Test each phase in development environment
- [ ] Validate structured data with Google Rich Results Test
- [ ] Validate with Schema.org validator
- [ ] Check mobile responsiveness
- [ ] Test with screen readers (accessibility)

### After Implementation
- [ ] Full validation of all structured data
- [ ] Test on multiple devices (desktop, mobile, tablet)
- [ ] Check Google Search Console for structured data errors
- [ ] Request indexing in Google Search Console
- [ ] Monitor rankings and traffic for 2-4 weeks
- [ ] A/B test if possible (50% old, 50% new)

### Tools & Resources
- **Google Rich Results Test**: https://search.google.com/test/rich-results
- **Schema.org Validator**: https://validator.schema.org/
- **Google Search Console**: Monitor structured data health
- **Mobile-Friendly Test**: https://search.google.com/test/mobile-friendly
- **PageSpeed Insights**: Check performance impact
- **Screaming Frog**: Crawl and audit structured data at scale

---

## Implementation Notes

### Configuration Strategy
Make new features configurable via data attributes:
```html
<div id="pmt-store-landing-page-container"
     data-enable-faq="true"
     data-enable-reviews-schema="true"
     data-enable-services-section="true"
     data-show-about-section="true"
     data-price-range="$$"
     data-currencies-accepted="PLN"
     data-payment-methods="Cash, Credit Card, Debit Card">
</div>
```

### API Data Requirements
Ensure API provides (or add defaults):
- Postal code (currently missing)
- Multiple store images
- Review data with ratings
- Business categories
- Payment methods
- Service area information

### Backward Compatibility
- Keep existing functionality intact
- Add new features as optional enhancements
- Maintain existing data attribute support
- Default to current behavior if new attributes not set

### Performance Considerations
- Minimize additional JavaScript execution
- Load structured data asynchronously if large
- Don't block page rendering with schema generation
- Consider splitting FAQ schema into separate file if large

---

## Success Metrics

### Week 1-2 (Immediate)
- Structured data validates without errors
- Google Search Console recognizes new schema types
- No performance degradation (page load time)

### Week 3-4 (Short-term)
- Appearance in local pack increases by 10-15%
- Rich results (ratings, hours) appear in search
- Mobile "near me" queries show improvements

### Month 2-3 (Medium-term)
- Local search rankings improve by 20-30%
- AI Overview features business in summaries
- Voice search visibility increases by 40-50%
- Click-through rate from search improves by 15-20%

### Month 4-6 (Long-term)
- Consistent top 3 local pack rankings
- Featured in AI Overviews for 50%+ of relevant queries
- Organic traffic from local search up 30-40%
- Conversion rate from local search up 15-25%

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize phases** based on business needs
3. **Assign development resources** (estimated 12-15 hours total)
4. **Set up testing environment** with test data
5. **Create tracking dashboard** to monitor impact
6. **Begin Phase 1 implementation** (critical fixes first)
7. **Roll out incrementally** and monitor results
8. **Document learnings** and adjust plan as needed

---

## References & Resources

### Schema.org Documentation
- LocalBusiness: https://schema.org/LocalBusiness
- BreadcrumbList: https://schema.org/BreadcrumbList
- Review: https://schema.org/Review
- FAQPage: https://schema.org/FAQPage
- Organization: https://schema.org/Organization

### Google Guidelines
- Local Business Structured Data: https://developers.google.com/search/docs/appearance/structured-data/local-business
- Review Snippets: https://developers.google.com/search/docs/appearance/structured-data/review-snippet
- FAQ Structured Data: https://developers.google.com/search/docs/appearance/structured-data/faqpage

### Best Practices
- Local SEO Guide: Moz Local SEO Guide
- AI Overviews Optimization: Google AI Overviews documentation
- Voice Search Optimization: Schema.org Speakable specification

---

**Document Version:** 1.0
**Last Updated:** 2025-10-09
**Author:** Claude Code
**Status:** Ready for Review
