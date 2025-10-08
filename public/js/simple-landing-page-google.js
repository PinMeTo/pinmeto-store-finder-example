(async function() { // Changed to async IIFE
    // --- Configuration ---

    // Helper to get config from data attribute or fallback
    function getConfigFromDataAttr(rootEl, attr, fallback) {
        if (rootEl && rootEl.hasAttribute(attr)) {
            return rootEl.getAttribute(attr);
        }
        return fallback;
    }

    const rootElementId = window.PMT_LANDING_PAGE_ROOT_ID || 'pmt-store-landing-page-container';
    const rootEl = document.getElementById(rootElementId);

    // API URL
    const API_URL = getConfigFromDataAttr(rootEl, 'data-api-url', 'https://public-api.test.pinmeto.com/pinmeto/abc123/locations.json');

    let GOOGLE_MAPS_API_KEY = null; // Initialize as null
    const DAY_KEYS_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const DEFAULT_STORE_CODE = '1337';

    // Default image URL
    const PMT_LANDING_PAGE_DEFAULT_IMAGE_URL = getConfigFromDataAttr(rootEl, 'data-default-image-url', window.location.origin +'/images/store-default.jpg');
    // Store locator URL
    const PMT_STORE_LOCATOR_URL = getConfigFromDataAttr(rootEl, 'data-store-locator-url', window.location.origin +'/store-locator');
    // Home URL
    const PMT_HOME_URL = getConfigFromDataAttr(rootEl, 'data-home-url', window.location.origin + '/');

    // Add to config section:
    const LOCALES_PATH = getConfigFromDataAttr(rootEl, 'data-locales-path', 'locales/');
    const GOOGLE_MAPS_API_KEY_FROM_DATA = getConfigFromDataAttr(rootEl, 'data-google-maps-api-key', null);
    const CSS_PATH = getConfigFromDataAttr(rootEl, 'data-css-path', '/css/simple-landing-page.css');
    
    // Feature toggles
    const SHOW_IMAGES = getConfigFromDataAttr(rootEl, 'data-show-images', 'true') !== 'false' && 
                       (typeof window.SHOW_IMAGES === 'undefined' || window.SHOW_IMAGES);
    const SHOW_REVIEWS = getConfigFromDataAttr(rootEl, 'data-show-reviews', 'true') !== 'false' && 
                        (typeof window.SHOW_REVIEWS === 'undefined' || window.SHOW_REVIEWS);

    // --- DOM Elements Reference ---

    let domElements = {};

    // --- Map Instance Variable ---

    let mapInstance = null; // Will hold the Google Map instance

    // --- Translation Helper ---
    let translations = {};
    let currentLanguage = 'en';

    function t(key, replacements = {}) {
        // Support dot notation for nested keys
        let text = key.split('.').reduce((o, i) => (o ? o[i] : undefined), translations) || key;
        for (const placeholder in replacements) {
            text = text.replace(`{${placeholder}}`, replacements[placeholder]);
        }
        return text;
    }

    async function fetchTranslations(localeFilePath) {
        try {
            const response = await fetch(localeFilePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, path: ${localeFilePath}`);
            }
            translations = await response.json();
            console.log(`PMT Landing Page: Translations loaded for ${currentLanguage}.`);
        } catch (e) {
            console.error(`PMT Landing Page Error: Failed to load locale file: ${localeFilePath}. Falling back to English defaults.`, e);
            currentLanguage = 'en';
            translations = {
                storeTitle: "Store Information",
                loading: "Loading store information...",
                fetchingData: "Fetching store data...",
                errorLoading: "Error Loading Store",
                addressAndLocation: "Address & Location",
                phone: "Phone",
                openingHours: "Opening Hours",
                specialOpeningHours: "Special Opening Hours",
                noSpecialHours: "No special opening hours",
                concepts: "Concepts",
                getDirections: "Get Directions",
                storeDetails: "Store Details",
                fallbackStoreName: "Store name missing",
                fallbackAddress: "Address details missing.",
                fallbackHours: "No regular opening hours specified.",
                closed: "Closed",
                notSpecified: "Not specified",
                errorFetching: "An error occurred while fetching store data.",
                checkStoreCode: "Check the store code in the URL or try again later.",
                mapLoadError: "Could not load map SDK.",
                mapDisplayError: "Could not display map.",
                displayingInfo: "Displaying information for {storeName}",
                loadingMap: "Loading...",
                storeNotFound: "Store not found",
                goToStoreLocator: "Go to Store Locator",
                storeNotFoundMessage: "The store you're looking for could not be found. Would you like to browse all our stores?",
                backToStoreLocator: "Back to Store Locator",
                services: "Services",
                fuelPrices: "Fuel Prices",
                weekdays: {
                    "sunday": "Sunday",
                    "monday": "Monday",
                    "tuesday": "Tuesday",
                    "wednesday": "Wednesday",
                    "thursday": "Thursday",
                    "friday": "Friday",
                    "saturday": "Saturday"
                }
            };
        }
    }

    // --- Language Detection ---
    function detectLanguage() {
        let lang = document.getElementById(rootElementId)?.dataset.language || document.documentElement.lang || 'en';
        if (lang.includes('-')) lang = lang.split('-')[0];
        return lang.toLowerCase();
    }

    // --- Helper Functions ---

    // Function to create the initial DOM structure
    function createInitialDOMStructure(container) {
        // Clear container first
        container.innerHTML = '';

        const elements = {};

        // Create main article for store information
        const mainArticle = document.createElement('article');
        mainArticle.id = 'pmt-store-article';
        mainArticle.setAttribute('role', 'article');
        container.appendChild(mainArticle);

        // Create H1 for store name
        elements.storeNameEl = document.createElement('h1');
        elements.storeNameEl.id = 'pmt-store-name';
        elements.storeNameEl.textContent = 'Loading store information...';
        mainArticle.appendChild(elements.storeNameEl);

        // Create Message Box (fixed position, initially hidden)
        elements.messageBoxEl = document.createElement('aside');
        elements.messageBoxEl.id = 'pmt-message-box';
        elements.messageBoxEl.style.display = 'none';
        elements.messageBoxEl.setAttribute('role', 'status');
        elements.messageBoxEl.setAttribute('aria-live', 'polite');
        mainArticle.appendChild(elements.messageBoxEl);

        // Create Store Details container (initially hidden)
        elements.storeDetailsEl = document.createElement('main');
        elements.storeDetailsEl.id = 'pmt-store-details';
        elements.storeDetailsEl.className = 'pmt-hidden';
        mainArticle.appendChild(elements.storeDetailsEl);

        // Add back to store locator link
        elements.backToStoreLocatorEl = document.createElement('nav');
        elements.backToStoreLocatorEl.className = 'pmt-back-to-store-locator';
        elements.backToStoreLocatorEl.setAttribute('aria-label', t('backToStoreLocator'));
        
        const backLink = document.createElement('a');
        backLink.href = PMT_STORE_LOCATOR_URL;
        backLink.className = 'pmt-back-link';
        backLink.innerHTML = ICONS.arrowLeft + ' ' + t('backToStoreLocator');
        elements.backToStoreLocatorEl.appendChild(backLink);
        elements.storeDetailsEl.appendChild(elements.backToStoreLocatorEl);

        // --- Address & Map Section ---
        const addressMapSection = document.createElement('section');
        addressMapSection.id = 'pmt-address-map-section';
        addressMapSection.setAttribute('aria-label', t('addressAndLocation'));
        elements.storeDetailsEl.appendChild(addressMapSection);

        const addressMapContainer = document.createElement('div');
        addressMapContainer.className = 'pmt-address-map-container';
        addressMapSection.appendChild(addressMapContainer);

        // --- Create all info elements first ---
        elements.storeAddressContainerEl = document.createElement('section');
        elements.storeAddressContainerEl.id = 'pmt-store-address-container';
        elements.storeAddressContainerEl.setAttribute('aria-label', t('addressAndLocation'));

        const addressH2 = document.createElement('h2');
        addressH2.innerHTML = ICONS.location + ' ' + t('addressAndLocation');
        elements.storeAddressContainerEl.appendChild(addressH2);

        elements.storeAddressEl = document.createElement('address');
        elements.storeAddressEl.id = 'pmt-store-address';
        elements.storeAddressEl.className = 'pmt-address-lines';
        elements.storeAddressContainerEl.appendChild(elements.storeAddressEl);

        elements.directionsParagraphEl = document.createElement('nav');
        elements.directionsParagraphEl.id = 'pmt-directions-paragraph';
        elements.directionsParagraphEl.className = 'pmt-hidden';
        elements.directionsParagraphEl.setAttribute('aria-label', 'Directions');
        elements.storeAddressContainerEl.appendChild(elements.directionsParagraphEl);

        elements.storeDirectionsLinkEl = document.createElement('a');
        elements.storeDirectionsLinkEl.id = 'pmt-store-directions-link';
        elements.storeDirectionsLinkEl.href = '#';
        elements.storeDirectionsLinkEl.target = '_blank';
        elements.storeDirectionsLinkEl.rel = 'noopener noreferrer';
        elements.storeDirectionsLinkEl.innerHTML = ICONS.locationArrow + ' ' + t('getDirections');
        elements.directionsParagraphEl.appendChild(elements.storeDirectionsLinkEl);

        elements.phoneSectionEl = document.createElement('section');
        elements.phoneSectionEl.id = 'pmt-phone-section';
        elements.phoneSectionEl.className = 'pmt-hidden';
        elements.phoneSectionEl.setAttribute('aria-label', t('phone'));

        const phoneH2 = document.createElement('h2');
        phoneH2.innerHTML = ICONS.phone + ' ' + t('phone');
        elements.phoneSectionEl.appendChild(phoneH2);

        elements.storePhoneEl = document.createElement('p');
        elements.storePhoneEl.id = 'pmt-store-phone';
        elements.phoneSectionEl.appendChild(elements.storePhoneEl);

        const openingHoursSection = document.createElement('section');
        openingHoursSection.setAttribute('aria-label', t('openingHours'));

        const openingHoursH2 = document.createElement('h2');
        openingHoursH2.innerHTML = ICONS.clock + ' ' + t('openingHours');
        openingHoursSection.appendChild(openingHoursH2);

        elements.storeOpeningHoursEl = document.createElement('ul');
        elements.storeOpeningHoursEl.id = 'pmt-store-opening-hours';
        openingHoursSection.appendChild(elements.storeOpeningHoursEl);

        elements.exceptionsSectionEl = document.createElement('section');
        elements.exceptionsSectionEl.id = 'pmt-exceptions-section';
        elements.exceptionsSectionEl.setAttribute('aria-label', t('specialOpeningHours'));

        const exceptionsH2 = document.createElement('h2');
        exceptionsH2.innerHTML = ICONS.calendar + ' ' + t('specialOpeningHours');
        elements.exceptionsSectionEl.appendChild(exceptionsH2);

        elements.storeExceptionsEl = document.createElement('ul');
        elements.storeExceptionsEl.id = 'pmt-store-exceptions';
        elements.exceptionsSectionEl.appendChild(elements.storeExceptionsEl);

        elements.conceptsSectionEl = document.createElement('section');
        elements.conceptsSectionEl.id = 'pmt-concepts-section';
        elements.conceptsSectionEl.className = 'pmt-hidden';
        elements.conceptsSectionEl.setAttribute('aria-label', t('concepts'));

        const conceptsH2 = document.createElement('h2');
        conceptsH2.id = 'pmt-concepts-heading';
        conceptsH2.textContent = t('concepts');
        elements.conceptsSectionEl.appendChild(conceptsH2);

        elements.storeConceptsEl = document.createElement('ul');
        elements.storeConceptsEl.id = 'pmt-store-concepts';
        elements.storeConceptsEl.className = 'pmt-concepts-container';
        elements.conceptsSectionEl.appendChild(elements.storeConceptsEl);

        elements.socialMediaSectionEl = document.createElement('section');
        elements.socialMediaSectionEl.id = 'pmt-social-media-section';
        elements.socialMediaSectionEl.className = 'pmt-hidden';
        elements.socialMediaSectionEl.setAttribute('aria-label', 'Social Media');

        const socialMediaH2 = document.createElement('h2');
        socialMediaH2.innerHTML = ICONS.share + ' ' + t('socialMedia');
        elements.socialMediaSectionEl.appendChild(socialMediaH2);

        elements.socialMediaLinksEl = document.createElement('nav');
        elements.socialMediaLinksEl.id = 'pmt-social-media-links';
        elements.socialMediaLinksEl.className = 'pmt-social-links';
        elements.socialMediaLinksEl.setAttribute('aria-label', 'Social Media Links');
        elements.socialMediaSectionEl.appendChild(elements.socialMediaLinksEl);

        // Add Services Section
        elements.servicesSectionEl = document.createElement('section');
        elements.servicesSectionEl.id = 'pmt-services-section';
        elements.servicesSectionEl.className = 'pmt-hidden';
        elements.servicesSectionEl.setAttribute('aria-label', t('services'));

        const servicesH2 = document.createElement('h2');
        servicesH2.innerHTML = ICONS.services + ' ' + t('services');
        elements.servicesSectionEl.appendChild(servicesH2);

        elements.storeServicesEl = document.createElement('ul');
        elements.storeServicesEl.id = 'pmt-store-services';
        elements.storeServicesEl.className = 'pmt-services-container';
        elements.servicesSectionEl.appendChild(elements.storeServicesEl);

        // Add Fuel Prices Section
        elements.fuelPricesSectionEl = document.createElement('section');
        elements.fuelPricesSectionEl.id = 'pmt-fuel-prices-section';
        elements.fuelPricesSectionEl.className = 'pmt-hidden';
        elements.fuelPricesSectionEl.setAttribute('aria-label', t('fuelPrices'));

        const fuelPricesH2 = document.createElement('h2');
        fuelPricesH2.innerHTML = ICONS.fuel + ' ' + t('fuelPrices');
        elements.fuelPricesSectionEl.appendChild(fuelPricesH2);

        elements.storeFuelPricesEl = document.createElement('div');
        elements.storeFuelPricesEl.id = 'pmt-store-fuel-prices';
        elements.storeFuelPricesEl.className = 'pmt-fuel-prices-container';
        elements.fuelPricesSectionEl.appendChild(elements.storeFuelPricesEl);

        // --- Now create the info card and append all info elements ---
        const infoCard = document.createElement('div');
        infoCard.className = 'pmt-info-card';
        addressMapContainer.appendChild(infoCard);

        // Append all info elements
        infoCard.appendChild(elements.storeAddressContainerEl);
        infoCard.appendChild(elements.phoneSectionEl);
        infoCard.appendChild(openingHoursSection);
        infoCard.appendChild(elements.exceptionsSectionEl);
        infoCard.appendChild(elements.servicesSectionEl);
        infoCard.appendChild(elements.fuelPricesSectionEl);
        infoCard.appendChild(elements.conceptsSectionEl);
        infoCard.appendChild(elements.socialMediaSectionEl);

        // Map stays outside the card
        elements.storeMapWrapperEl = document.createElement('section');
        elements.storeMapWrapperEl.id = 'pmt-store-map-wrapper';
        elements.storeMapWrapperEl.className = 'pmt-hidden';
        elements.storeMapWrapperEl.setAttribute('aria-label', t('interactiveMap'));
        addressMapContainer.appendChild(elements.storeMapWrapperEl);

        elements.storeMapEl = document.createElement('div');
        elements.storeMapEl.id = 'pmt-store-map';
        elements.storeMapEl.setAttribute('role', 'application');
        elements.storeMapEl.setAttribute('aria-label', 'Interactive Map');
        elements.storeMapWrapperEl.appendChild(elements.storeMapEl);

        // --- Right Column: Map + Photo Album ---
        elements.mapAndAlbumColumnEl = document.createElement('aside');
        elements.mapAndAlbumColumnEl.className = 'pmt-map-album-column';
        elements.mapAndAlbumColumnEl.setAttribute('aria-label', 'Map and Photo Gallery');
        addressMapContainer.appendChild(elements.mapAndAlbumColumnEl);

        // Add map wrapper to right column
        elements.mapAndAlbumColumnEl.appendChild(elements.storeMapWrapperEl);

        // --- Photo Album Placeholder ---
        if (SHOW_IMAGES) {
            elements.photoAlbumSectionEl = document.createElement('section');
            elements.photoAlbumSectionEl.id = 'pmt-photo-album-section';
            elements.photoAlbumSectionEl.className = 'pmt-photo-album-section';
            elements.photoAlbumSectionEl.setAttribute('aria-label', 'Photo Album');

            const photoAlbumGallery = document.createElement('figure');
            photoAlbumGallery.className = 'pmt-photo-album-gallery';
            // Add 4 dummy images from Unsplash
            const unsplashImages = [
                'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
                'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80',
                'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80',
                'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=400&q=80'
            ];
            for (let i = 0; i < unsplashImages.length; i++) {
                const img = document.createElement('img');
                img.src = unsplashImages[i];
                img.alt = `Store Photo ${i + 1}`;
                img.className = 'pmt-photo-album-img';
                img.setAttribute('data-full-image', unsplashImages[i]);
                photoAlbumGallery.appendChild(img);
            }
            elements.photoAlbumSectionEl.appendChild(photoAlbumGallery);
            elements.mapAndAlbumColumnEl.appendChild(elements.photoAlbumSectionEl);
            
            // Create image popup modal
            createImagePopup();
            
            // Add click event listeners to all images
            const images = photoAlbumGallery.querySelectorAll('.pmt-photo-album-img');
            images.forEach(img => {
                img.addEventListener('click', () => showImagePopup(img));
            });
        }

        // --- Loading State ---
        elements.loadingStateEl = document.createElement('aside');
        elements.loadingStateEl.id = 'pmt-loading-state';
        elements.loadingStateEl.setAttribute('role', 'status');
        elements.loadingStateEl.setAttribute('aria-live', 'polite');
        mainArticle.appendChild(elements.loadingStateEl);

        elements.loadingMessageEl = document.createElement('p');
        elements.loadingMessageEl.id = 'pmt-loading-message';
        elements.loadingMessageEl.textContent = 'Fetching store data...';
        elements.loadingStateEl.appendChild(elements.loadingMessageEl);

        const loadingIndicator = document.createElement('p');
        loadingIndicator.textContent = 'Loading...';
        loadingIndicator.setAttribute('aria-label', t('loading'));
        elements.loadingStateEl.appendChild(loadingIndicator);

        // --- Error State (initially hidden) ---
        elements.errorStateEl = document.createElement('aside');
        elements.errorStateEl.id = 'pmt-error-state';
        elements.errorStateEl.className = 'pmt-hidden';
        elements.errorStateEl.setAttribute('role', 'alert');
        elements.errorStateEl.setAttribute('aria-live', 'assertive');
        mainArticle.appendChild(elements.errorStateEl);

        elements.errorMessageEl = document.createElement('p');
        elements.errorMessageEl.id = 'pmt-error-message';
        elements.errorStateEl.appendChild(elements.errorMessageEl);

        const errorHint = document.createElement('p');
        errorHint.textContent = 'Check the store code in the URL or try again later.';
        elements.errorStateEl.appendChild(errorHint);

        return elements;
    }

    function showMessage(message, type = 'info', duration = 3000) {
        if (!domElements.messageBoxEl) return;
        domElements.messageBoxEl.textContent = message;
        domElements.messageBoxEl.className = `pmt-message-box pmt-${type}`;
        domElements.messageBoxEl.style.display = 'block';
        setTimeout(() => { domElements.messageBoxEl.style.display = 'none'; }, duration);
    }

    function formatTimeRange(timeInput) {
        try {
            if (!timeInput) return "[No time data]";
            if (typeof timeInput.open === 'string' && typeof timeInput.close === 'string') {
                if (timeInput.open === '' || timeInput.close === '') return "Closed";
                return `${timeInput.open.slice(0,2)}:${timeInput.open.slice(2)} - ${timeInput.close.slice(0,2)}:${timeInput.close.slice(2)}`;
            }
            if (timeInput.closedAllDay === true || timeInput.isClosed === true) return "Closed";
            const opens = timeInput.opens || timeInput.openTime;
            const closes = timeInput.closes || timeInput.closeTime;
            if (typeof opens !== 'string' || typeof closes !== 'string' || opens === '' || closes === '') {
                console.warn("Missing or invalid time properties in input object:", timeInput);
                return "Closed";
            }
            return `${opens.slice(0,2)}:${opens.slice(2)} - ${closes.slice(0,2)}:${closes.slice(2)}`;
        } catch(e) {
            console.error("!!! Error inside formatTimeRange:", e.message, "| Input:", timeInput);
            return "[Time Error]";
        }
    }

    function formatDate(dateString) {
        try {
            if (!dateString || typeof dateString !== 'string') throw new Error("Input date string is missing or not a string");
            const date = new Date(dateString);
            if (isNaN(date.getTime())) throw new Error(`Invalid date parsed from string: "${dateString}"`);
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        } catch (e) {
            console.error("!!! Error inside formatDate:", e.message, "| Input:", dateString);
            return `[Date Error: ${dateString}]`;
        }
    }

    async function fetchGoogleMapsApiKey() {
        // 1. Data attribute
        if (GOOGLE_MAPS_API_KEY_FROM_DATA) {
            GOOGLE_MAPS_API_KEY = GOOGLE_MAPS_API_KEY_FROM_DATA;
            console.log('PMT Landing Page: Google Maps API key loaded from data attribute.');
            return;
        }
        // 2. window.USE_GOOGLE_MAPS_API_KEY
        if (typeof window !== 'undefined' && typeof window.USE_GOOGLE_MAPS_API_KEY === 'string') {
            GOOGLE_MAPS_API_KEY = window.USE_GOOGLE_MAPS_API_KEY;
            console.log('PMT Landing Page: Google Maps API key loaded from window.USE_GOOGLE_MAPS_API_KEY.');
            return;
        }
        // 3. Fetch from backend
        try {
            const response = await fetch('/api/google-maps-key');
            if (!response.ok) {
                throw new Error('Failed to fetch Google Maps API key');
            }
            const data = await response.json();
            GOOGLE_MAPS_API_KEY = data.key;
            console.log('PMT Landing Page: Google Maps API key fetched successfully');
        } catch (error) {
            console.error('PMT Landing Page Error: Failed to fetch Google Maps API key', error);
            throw error;
        }
    }

    function generateStaticMapUrl(lat, lon, storeName, width = 456, height = 254) {
        if (!GOOGLE_MAPS_API_KEY) {
            console.warn('PMT Landing Page: No Google Maps API key available for static map');
            return null;
        }
        
        const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
        const params = new URLSearchParams({
            center: `${lat},${lon}`,
            zoom: '14',
            size: `${width}x${height}`,
            maptype: 'roadmap',
            markers: `color:red|${lat},${lon}`,
            style: 'feature:poi|visibility:off',
            key: GOOGLE_MAPS_API_KEY
        });
        
        return `${baseUrl}?${params.toString()}`;
    }

    async function loadGoogleMapsApiKey() {
        return new Promise(async (resolve, reject) => {
            try {
                await fetchGoogleMapsApiKey();
                console.log('PMT Landing Page: Google Maps API key ready for static maps.');
                resolve();
            } catch (error) {
                console.error('PMT Landing Page Error: Failed to fetch Google Maps API key', error);
                reject(new Error('Failed to load Google Maps API key'));
            }
        });
    }

    // Add this function near the top-level helpers
    function updateMetaTags(store) {
        // Helper to set or update a meta tag
        function setMetaTag(attr, value, content) {
            let tag = document.querySelector(`${attr}[${value}]`);
            if (!tag) {
                tag = document.createElement('meta');
                tag.setAttribute(value.split('=')[0], value.split('=')[1].replace(/['"]/g, ''));
                document.head.appendChild(tag);
            }
            tag.setAttribute('content', content);
        }
        // Helper to set or update a <link rel="canonical">
        function setCanonical(url) {
            let link = document.querySelector('link[rel="canonical"]');
            if (!link) {
                link = document.createElement('link');
                link.setAttribute('rel', 'canonical');
                document.head.appendChild(link);
            }
            link.setAttribute('href', url);
        }
        // Helper to set or update <title>
        function setTitle(title) {
            document.title = title;
        }
        // Helper to set or update JSON-LD
        function setJSONLD(json) {
            let script = document.querySelector('script[type="application/ld+json"]');
            if (!script) {
                script = document.createElement('script');
                script.type = 'application/ld+json';
                document.head.appendChild(script);
            }
            script.textContent = JSON.stringify(json, null, 2);
        }

        // --- Dynamic values ---
        const storeName = store.name || 'Store';
        const city = store.address?.city || '';
        const street = store.address?.street || '';
        const postal = store.address?.postalCode || '';
        const country = store.address?.country || '';
        const phone = store.contact?.phone || '';
        const lat = store.location?.lat;
        const lon = store.location?.lon;
        const image = store.imageUrl || PMT_LANDING_PAGE_DEFAULT_IMAGE_URL;
        const url = window.location.href;
        const canonicalUrl = url.split(/[?#]/)[0] + window.location.search;
        const description = store.longDescription && typeof store.longDescription === 'string' && store.longDescription.trim().length > 0
            ? store.longDescription.trim()
            : `Visit ${storeName}${city ? ' in ' + city : ''}. Find opening hours, address, phone number, and services. Get directions and more information about our store.`;
        const title = `${storeName}${city ? ' – ' + city : ''} | Opening Hours, Address & Contact`;

        // --- Social Media Links for sameAs ---
        let sameAs = [];
        if (store.network && typeof store.network === 'object') {
            for (const key in store.network) {
                if (store.network[key]?.link) {
                    sameAs.push(store.network[key].link);
                }
            }
        }

        // --- BreadcrumbList JSON-LD ---
        const breadcrumbJson = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": PMT_HOME_URL
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Store Locator",
                    "item": PMT_STORE_LOCATOR_URL
                },
                {
                    "@type": "ListItem",
                    "position": 3,
                    "name": storeName,
                    "item": url
                }
            ]
        };
        // Add or update BreadcrumbList JSON-LD
        let breadcrumbScript = document.querySelector('script[data-pmt-breadcrumb]');
        if (!breadcrumbScript) {
            breadcrumbScript = document.createElement('script');
            breadcrumbScript.type = 'application/ld+json';
            breadcrumbScript.setAttribute('data-pmt-breadcrumb', 'true');
            document.head.appendChild(breadcrumbScript);
        }
        breadcrumbScript.textContent = JSON.stringify(breadcrumbJson, null, 2);

        // --- Opening hours for JSON-LD ---
        let openingHoursArr = [];
        if (store.openHours) {
            for (const [day, data] of Object.entries(store.openHours)) {
                if (data.state && data.state.toLowerCase() === 'open' && Array.isArray(data.span)) {
                    data.span.forEach(span => {
                        if (span.open && span.close) {
                            // Convert '0900' to '09:00'
                            const open = span.open.length === 4 ? span.open.slice(0,2)+":"+span.open.slice(2) : span.open;
                            const close = span.close.length === 4 ? span.close.slice(0,2)+":"+span.close.slice(2) : span.close;
                            const dayShort = day.charAt(0).toUpperCase() + day.slice(1,3);
                            openingHoursArr.push(`${dayShort} ${open}-${close}`);
                        }
                    });
                }
            }
        }

        // --- Set tags ---
        setTitle(title);
        setMetaTag('meta', 'name="description"', description);
        setCanonical(canonicalUrl);
        setMetaTag('meta', 'property="og:title"', title);
        setMetaTag('meta', 'property="og:description"', description);
        setMetaTag('meta', 'property="og:url"', url);
        setMetaTag('meta', 'property="og:type"', 'business.business');
        setMetaTag('meta', 'property="og:image"', image);
        setMetaTag('meta', 'name="twitter:card"', 'summary_large_image');
        setMetaTag('meta', 'name="twitter:title"', title);
        setMetaTag('meta', 'name="twitter:description"', description);
        setMetaTag('meta', 'name="twitter:image"', image);

        // --- JSON-LD ---
        setJSONLD({
            "@context": "https://schema.org",
            "@type": "Store",
            "name": storeName,
            "image": image,
            "address": {
                "@type": "PostalAddress",
                "streetAddress": street,
                "addressLocality": city,
                "postalCode": postal,
                "addressCountry": country
            },
            "geo": lat && lon ? {
                "@type": "GeoCoordinates",
                "latitude": lat,
                "longitude": lon
            } : undefined,
            "telephone": phone,
            "openingHours": openingHoursArr,
            "url": url,
            ...(sameAs.length > 0 ? { sameAs } : {})
        });
    }

    // Add sanitization function near the top with other helper functions
    function sanitizeHTML(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Add social media link formatting function
    function formatSocialMediaLinks(network) {
        if (!network) return '';
        
        const links = [];
        const icons = {
            facebook: {
                svg: `<svg viewBox="0 0 1365.3333 1365.3333" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1.3333333,0,0,-1.3333333,0,1365.3333)"><g transform="scale(0.1)"><path style="fill:#1877f2;fill-opacity:1;fill-rule:nonzero;stroke:none" d="m 10240,5120 c 0,2827.7 -2292.3,5120 -5120,5120 C 2292.3,10240 0,7947.7 0,5120 0,2564.46 1872.31,446.301 4320,62.1992 V 3640 H 3020 v 1480 h 1300 v 1128 c 0,1283.2 764.38,1992 1933.9,1992 560.17,0 1146.1,-100 1146.1,-100 V 6880 H 6754.38 C 6118.35,6880 5920,6485.33 5920,6080.43 V 5120 H 7340 L 7113,3640 H 5920 V 62.1992 C 8367.69,446.301 10240,2564.46 10240,5120"></path><path style="fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none" d="m 7113,3640 227,1480 H 5920 v 960.43 c 0,404.9 198.35,799.57 834.38,799.57 H 7400 v 1260 c 0,0 -585.93,100 -1146.1,100 C 5084.38,8240 4320,7531.2 4320,6248 V 5120 H 3020 V 3640 H 4320 V 62.1992 C 4580.67,21.3008 4847.84,0 5120,0 c 272.16,0 539.33,21.3008 800,62.1992 V 3640 h 1193"></path></g></g></svg>`
            },
            google: {
                svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48" xmlns:xlink="http://www.w3.org/1999/xlink"><path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"></path><path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"></path><path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34A21.991 21.991 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"></path><path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"></path><path fill="none" d="M2 2h44v44H2z"></path></svg>`
            },
            bing: {
                svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" preserveAspectRatio="xMidYMid" viewBox="0 0 256 388"><defs><radialGradient id="bing-a" cx="93.717%" cy="77.818%" r="143.121%" fx="93.717%" fy="77.818%" gradientTransform="matrix(-.65486 -.54387 .75575 -.4712 .963 1.654)"><stop offset="0%" stop-color="#00CACC"/><stop offset="100%" stop-color="#048FCE"/></radialGradient><radialGradient id="bing-b" cx="13.893%" cy="71.448%" r="150.086%" fx="13.893%" fy="71.448%" gradientTransform="matrix(.55155 -.39387 .23634 .91917 -.107 .112)"><stop offset="0%" stop-color="#00BBEC"/><stop offset="100%" stop-color="#2756A9"/></radialGradient><linearGradient id="bing-c" x1="50%" x2="50%" y1="0%" y2="100%"><stop offset="0%" stop-color="#00BBEC"/><stop offset="100%" stop-color="#2756A9"/></linearGradient></defs><path fill="url(#bing-a)" d="M129.424 122.047c-7.133.829-12.573 6.622-13.079 13.928-.218 3.147-.15 3.36 6.986 21.722 16.233 41.774 20.166 51.828 20.827 53.243 1.603 3.427 3.856 6.65 6.672 9.544 2.16 2.22 3.585 3.414 5.994 5.024 4.236 2.829 6.337 3.61 22.818 8.49 16.053 4.754 24.824 7.913 32.381 11.664 9.791 4.86 16.623 10.387 20.944 16.946 3.1 4.706 5.846 13.145 7.04 21.64.468 3.321.47 10.661.006 13.663-1.008 6.516-3.021 11.976-6.101 16.545-1.638 2.43-1.068 2.023 1.313-.939 6.74-8.379 13.605-22.7 17.108-35.687 4.24-15.718 4.817-32.596 1.66-48.57-6.147-31.108-25.786-57.955-53.444-73.06-1.738-.95-8.357-4.42-17.331-9.085a1633 1633 0 0 1-4.127-2.154c-.907-.477-2.764-1.447-4.126-2.154-1.362-.708-5.282-2.75-8.711-4.539l-8.528-4.446a6021 6021 0 0 1-8.344-4.357c-8.893-4.655-12.657-6.537-13.73-6.863-1.125-.343-3.984-.782-4.701-.723-.152.012-.838.088-1.527.168"/><path fill="url(#bing-b)" d="M148.81 277.994c-.493.292-1.184.714-1.537.938-.354.225-1.137.712-1.743 1.083a8315 8315 0 0 0-13.204 8.137 2848 2848 0 0 0-8.07 4.997 388 388 0 0 1-3.576 2.198c-.454.271-2.393 1.465-4.31 2.654a2652 2652 0 0 1-7.427 4.586 3958 3958 0 0 0-8.62 5.316 3011 3011 0 0 1-7.518 4.637c-1.564.959-3.008 1.885-3.21 2.058-.3.257-14.205 8.87-21.182 13.121-5.3 3.228-11.43 5.387-17.705 6.235-2.921.395-8.45.396-11.363.003-7.9-1.067-15.176-4.013-21.409-8.666-2.444-1.826-7.047-6.425-8.806-8.8-4.147-5.598-6.829-11.602-8.218-18.396-.32-1.564-.622-2.884-.672-2.935-.13-.13.105 2.231.528 5.319.44 3.211 1.377 7.856 2.387 11.829 7.814 30.743 30.05 55.749 60.15 67.646 8.668 3.424 17.415 5.582 26.932 6.64 3.576.4 13.699.56 17.43.276 17.117-1.296 32.02-6.334 47.308-15.996 1.362-.86 3.92-2.474 5.685-3.585a877 877 0 0 0 4.952-3.14c.958-.615 2.114-1.341 2.567-1.614a91 91 0 0 0 2.018-1.268c.656-.424 3.461-2.2 6.235-3.944l11.092-7.006 3.809-2.406.137-.086.42-.265.199-.126 2.804-1.771 9.69-6.121c12.348-7.759 16.03-10.483 21.766-16.102 2.392-2.342 5.997-6.34 6.176-6.848.037-.104.678-1.092 1.424-2.197 3.036-4.492 5.06-9.995 6.064-16.484.465-3.002.462-10.342-.005-13.663-.903-6.42-2.955-13.702-5.167-18.339-3.627-7.603-11.353-14.512-22.453-20.076-3.065-1.537-6.23-2.943-6.583-2.924-.168.009-10.497 6.322-22.954 14.03-12.457 7.71-23.268 14.4-24.025 14.87a290 290 0 0 1-2.888 1.764z"/><path fill="url(#bing-c)" d="m.053 241.013.054 53.689.695 3.118c2.172 9.747 5.937 16.775 12.482 23.302 3.078 3.07 5.432 4.922 8.768 6.896 7.06 4.177 14.657 6.238 22.978 6.235 8.716-.005 16.256-2.179 24.025-6.928 1.311-.801 6.449-3.964 11.416-7.029l9.032-5.572v-127.4l-.002-58.273c-.002-37.177-.07-59.256-.188-60.988-.74-10.885-5.293-20.892-12.948-28.461-2.349-2.323-4.356-3.875-10.336-7.99a25160 25160 0 0 1-12.104-8.336L28.617 5.835C22.838 1.85 22.386 1.574 20.639.949 18.367.136 15.959-.163 13.67.084 6.998.804 1.657 5.622.269 12.171.053 13.191.013 26.751.01 100.35l-.003 86.975H0z"/></svg>`
            },
            apple: {
                svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 496.255 608.728"><path d="M273.81 52.973C313.806.257 369.41 0 369.41 0s8.271 49.562-31.463 97.306c-42.426 50.98-90.649 42.638-90.649 42.638s-9.055-40.094 26.512-86.971zM252.385 174.662c20.576 0 58.764-28.284 108.471-28.284 85.562 0 119.222 60.883 119.222 60.883s-65.833 33.659-65.833 115.331c0 92.133 82.01 123.885 82.01 123.885s-57.328 161.357-134.762 161.357c-35.565 0-63.215-23.967-100.688-23.967-38.188 0-76.084 24.861-100.766 24.861C89.33 608.73 0 455.666 0 332.628c0-121.052 75.612-184.554 146.533-184.554 46.105 0 81.883 26.588 105.852 26.588z" fill="#999"/></svg>`
            },
            instagram: {
                svg: `<svg role="img" viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><title>Instagram</title><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.974.974 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.974.974-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.974-.974-1.246-2.242-1.308-3.608C2.175 15.647 2.163 15.267 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.974-.974 2.242-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.332.013 7.052.072 5.775.13 4.602.402 3.635 1.37c-.967.967-1.24 2.14-1.298 3.417C2.013 8.332 2 8.741 2 12c0 3.259.013 3.668.072 4.948.058 1.277.331 2.45 1.298 3.417.967.967 2.14 1.24 3.417 1.298C8.332 23.987 8.741 24 12 24s3.668-.013 4.948-.072c1.277-.058 2.45-.331 3.417-1.298.967-.967 1.24-2.14 1.298-3.417.059-1.28.072-1.689.072-4.948s-.013-3.668-.072-4.948c-.058-1.277-.331-2.45-1.298-3.417-.967-.967-2.14-1.24-3.417-1.298C15.668.013 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998zm6.406-11.845a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z" fill="#E4405F"/></svg>`
            }
        };

        for (const [platform, data] of Object.entries(network)) {
            if (data && data.link) {
                const icon = icons[platform]?.svg || ICONS.link;
                links.push(`<a href="${sanitizeHTML(data.link)}" target="_blank" rel="noopener noreferrer" class="pmt-social-link" aria-label="${sanitizeHTML(platform)}">${icon}</a>`);
            }
        }

        return links.join('');
    }

    // --- Display Logic ---

    async function displayStoreDetails(store, currentDomElements) { // Changed to async
        const {
            storeNameEl, storeDetailsEl, storeAddressEl,
            directionsParagraphEl, storeDirectionsLinkEl, phoneSectionEl, storePhoneEl,
            storeOpeningHoursEl, exceptionsSectionEl, storeExceptionsEl, conceptsSectionEl,
            storeConceptsEl, loadingStateEl, errorStateEl, storeMapWrapperEl, storeMapEl,
            socialMediaSectionEl, socialMediaLinksEl, servicesSectionEl, storeServicesEl,
            fuelPricesSectionEl, storeFuelPricesEl
        } = currentDomElements;

        console.log("Store data received:", store);

        // Show store name with location descriptor if available
        if (storeNameEl) {
            let nameText = store.name || t('fallbackStoreName');
            if (store.locationDescriptor && String(store.locationDescriptor).trim() !== '') {
                nameText += ` (${store.locationDescriptor.trim()})`;
            }
            storeNameEl.textContent = nameText;
        }

        if (storeAddressEl) {
            let addressParts = [];
            if (store.address?.street) addressParts.push(sanitizeHTML(store.address.street));
            if (store.address?.city) {
                let cityLine = sanitizeHTML(store.address.city);
                if (store.address?.zip) {
                    cityLine += `, ${sanitizeHTML(store.address.zip)}`;
                }
                addressParts.push(cityLine);
            } else if (store.address?.zip) {
                addressParts.push(sanitizeHTML(store.address.zip));
            }
            if (store.address?.country) addressParts.push(sanitizeHTML(store.address.country));
            storeAddressEl.innerHTML = addressParts.length > 0 ? addressParts.join('<br>') : t('fallbackAddress');
            console.log('Address parts:', addressParts);
        }

        const lat = parseFloat(store.location?.lat);
        const lon = parseFloat(store.location?.lon);
        console.log("Store coordinates:", { lat, lon });

        // --- Google Static Map & Directions ---
        if (directionsParagraphEl) directionsParagraphEl.classList.add('pmt-hidden');

        if (!isNaN(lat) && !isNaN(lon) && storeMapWrapperEl && storeMapEl && directionsParagraphEl && storeDirectionsLinkEl) {
            storeMapWrapperEl.classList.remove('pmt-hidden');
            try {
                console.log("PMT Landing Page: Creating static map.");
                
                // Clear any existing content
                storeMapEl.innerHTML = '';
                
                // Create static map image
                const staticMapUrl = generateStaticMapUrl(lat, lon, store.name);
                if (staticMapUrl) {
                    const mapContainer = document.createElement('div');
                    mapContainer.style.position = 'relative';
                    mapContainer.style.width = '100%';
                    mapContainer.style.height = '254px';
                    mapContainer.style.borderRadius = '8px';
                    mapContainer.style.overflow = 'hidden';
                    mapContainer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    mapContainer.style.cursor = 'pointer';
                    mapContainer.style.transition = 'transform 0.2s ease';
                    
                    const mapImg = document.createElement('img');
                    mapImg.src = staticMapUrl;
                    mapImg.alt = `Map showing location of ${store.name || 'store'}`;
                    mapImg.style.width = '100%';
                    mapImg.style.height = '100%';
                    mapImg.style.display = 'block';
                    
                    // Add loading and error handling
                    mapImg.addEventListener('load', () => {
                        console.log('PMT Landing Page: Static map loaded successfully');
                    });
                    
                    mapImg.addEventListener('error', () => {
                        console.error('PMT Landing Page: Failed to load static map image');
                        mapContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; color: #666; font-size: 14px;">Map unavailable</div>';
                    });
                    
                    // Add hover effect
                    mapContainer.addEventListener('mouseenter', () => {
                        mapContainer.style.transform = 'scale(1.02)';
                    });
                    mapContainer.addEventListener('mouseleave', () => {
                        mapContainer.style.transform = 'scale(1)';
                    });
                    
                    // Make the container clickable to open Google Maps
                    mapContainer.addEventListener('click', () => {
                        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
                        window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
                    });
                    
                    mapContainer.appendChild(mapImg);
                    storeMapEl.appendChild(mapContainer);
                    console.log("PMT Landing Page: Static map created successfully.");
                } else {
                    console.warn("PMT Landing Page: Could not generate static map URL.");
                    storeMapWrapperEl.classList.add('pmt-hidden');
                }
                
                // Set up directions link
                const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
                storeDirectionsLinkEl.href = googleMapsUrl;
                directionsParagraphEl.classList.remove('pmt-hidden');

            } catch (mapError) {
                console.error("!!! Error creating static map:", mapError);
                if (storeMapWrapperEl) storeMapWrapperEl.classList.add('pmt-hidden');
                showMessage(t('mapDisplayError'), 'error');
            }
        } else {
            if (storeMapWrapperEl) storeMapWrapperEl.classList.add('pmt-hidden');
            console.warn("Latitude/Longitude missing/invalid, or map/directions elements not found. Hiding map and directions.");
        }

        if (phoneSectionEl && storePhoneEl) {
            if (store.contact?.phone) {
                const cleanedPhone = store.contact.phone.replace(/[\s\-()]/g, '');
                const phoneLink = document.createElement('a');
                phoneLink.href = `tel:${cleanedPhone}`;
                phoneLink.textContent = store.contact.phone;
                storePhoneEl.innerHTML = '';
                storePhoneEl.appendChild(phoneLink);
                phoneSectionEl.classList.remove('pmt-hidden');
            } else {
                storePhoneEl.innerHTML = '';
                phoneSectionEl.classList.add('pmt-hidden');
            }
        }

        if (storeOpeningHoursEl) {
            storeOpeningHoursEl.innerHTML = '';
            if (store.openHours && typeof store.openHours === 'object' && Object.keys(store.openHours).length > 0) {
                DAY_KEYS_ORDER.forEach((dayKey, index) => {
                    // Map translation keys to data structure keys
                    const dataKeyMap = {
                        'monday': 'mon',
                        'tuesday': 'tue',
                        'wednesday': 'wed',
                        'thursday': 'thu',
                        'friday': 'fri',
                        'saturday': 'sat',
                        'sunday': 'sun'
                    };
                    const dataKey = dataKeyMap[dayKey];
                    const dayData = store.openHours[dataKey];
                    const dayName = t(`weekdays.${dayKey}`);
                    const li = document.createElement('li');
                    if (dayData) {
                        let timeStr = 'Closed';
                        if (dayData.state === 'Open' && dayData.span && dayData.span.length > 0) {
                            timeStr = dayData.span.map(slot => formatTimeRange(slot)).join(', ');
                        }
                        li.innerHTML = `<span class="pmt-label pmt-day-name-label">${dayName}:</span> ${timeStr}`;
                    } else {
                        li.innerHTML = `<span class="pmt-label pmt-day-name-label">${dayName}:</span> Not specified`;
                    }
                    storeOpeningHoursEl.appendChild(li);
                });
            } else {
                storeOpeningHoursEl.innerHTML = '<li>' + t('fallbackHours') + '</li>';
            }
        }

        if (storeExceptionsEl) {
            storeExceptionsEl.innerHTML = ''; 
            let hasRelevantExceptions = false;
            if (store.specialOpenHours && Array.isArray(store.specialOpenHours) && store.specialOpenHours.length > 0) {
                const sortedExceptions = store.specialOpenHours.slice().sort((a, b) => {
                    if (!a.start) return 1; if (!b.start) return -1;
                    try { return new Date(a.start) - new Date(b.start); } catch (e) { return 0; }
                });
                const currentDate = new Date();
                currentDate.setHours(0, 0, 0, 0);
                const futureExceptions = sortedExceptions.filter(ex => {
                    if (!ex.start) return true; 
                    try {
                        const d = new Date(ex.start);
                        return !isNaN(d.getTime()) && d >= currentDate;
                    } catch (e) { return false; }
                });
                if (futureExceptions.length > 0) {
                    hasRelevantExceptions = true;
                    futureExceptions.forEach((ex, index) => {
                        try {
                            const li = document.createElement('li');
                            const dateStr = ex.start ? formatDate(ex.start) : (ex.label || 'Unknown date');
                            const timeStr = formatTimeRange(ex); 
                            const exceptionLabelText = (ex.label && ex.label !== dateStr) ? ` (${ex.label})` : '';
                            li.innerHTML = `<span class="pmt-label date-label">${dateStr}:</span> ${timeStr}${exceptionLabelText}`;
                            storeExceptionsEl.appendChild(li);
                        } catch (loopError) {
                            console.error(`Error processing exception item ${index + 1}:`, ex, loopError);
                            const errorLi = document.createElement('li');
                            errorLi.innerHTML = `<strong style="color: red;">Error:</strong> Could not display exception for ${ex.start || ex.label || 'unknown date'}. See console.`;
                            storeExceptionsEl.appendChild(errorLi);
                        }
                    });
                }
            }
            if (!hasRelevantExceptions) {
                const li = document.createElement('li');
                li.textContent = t('noSpecialHours');
                li.className = 'pmt-no-exceptions-message';
                storeExceptionsEl.appendChild(li);
            }
        }

        if (conceptsSectionEl && storeConceptsEl) {
            storeConceptsEl.innerHTML = ''; 
            conceptsSectionEl.classList.add('pmt-hidden'); 
            let conceptsSource = [];
            if (store.customData?.services_list && Array.isArray(store.customData.services_list) && store.customData.services_list.length > 0) {
                conceptsSource = store.customData.services_list;
            } else if (store.departmentsWithConcepts && Array.isArray(store.departmentsWithConcepts) && store.departmentsWithConcepts.length > 0) {
                conceptsSource = store.departmentsWithConcepts;
            } else if (store.departments && Array.isArray(store.departments) && store.departments.length > 0) {
                conceptsSource = store.departments;
            } else if (store.concepts && Array.isArray(store.concepts) && store.concepts.length > 0) {
                conceptsSource = store.concepts;
            }
            if (conceptsSource.length > 0) {
                conceptsSectionEl.classList.remove('pmt-hidden');
                conceptsSource.forEach(concept => {
                    const badge = document.createElement('span');
                    badge.className = 'pmt-concept-badge';
                    let conceptName = 'Unknown concept';
                    if (typeof concept === 'object' && concept !== null && concept.name) {
                        conceptName = concept.name;
                    } else if (typeof concept === 'string' && concept.trim() !== '') {
                        conceptName = concept;
                    }
                    badge.textContent = conceptName;
                    storeConceptsEl.appendChild(badge);
                });
            }
        }

        // In the displayStoreDetails function, add this after the concepts section:
        if (servicesSectionEl && storeServicesEl) {
            storeServicesEl.innerHTML = '';
            servicesSectionEl.classList.add('pmt-hidden');
            
            if (store.customData?.services && Array.isArray(store.customData.services) && store.customData.services.length > 0) {
                servicesSectionEl.classList.remove('pmt-hidden');
                store.customData.services.forEach(service => {
                    const li = document.createElement('li');
                    li.className = 'pmt-service-item';
                    li.textContent = service;
                    storeServicesEl.appendChild(li);
                });
            }
        }

        // In the displayStoreDetails function, add this after the services section:
        if (fuelPricesSectionEl && storeFuelPricesEl) {
            storeFuelPricesEl.innerHTML = '';
            fuelPricesSectionEl.classList.add('pmt-hidden');
            
            if (store.customData?.fuel_prices && typeof store.customData.fuel_prices === 'object') {
                fuelPricesSectionEl.classList.remove('pmt-hidden');
                const priceDiv = document.createElement('div');
                priceDiv.className = 'pmt-fuel-price-item';
                
                const typeSpan = document.createElement('span');
                typeSpan.className = 'pmt-fuel-type';
                typeSpan.textContent = store.customData.fuel_prices.type || 'Fuel';
                
                const priceSpan = document.createElement('span');
                priceSpan.className = 'pmt-fuel-price';
                priceSpan.textContent = store.customData.fuel_prices.price || 'N/A';
                
                priceDiv.appendChild(typeSpan);
                priceDiv.appendChild(priceSpan);
                storeFuelPricesEl.appendChild(priceDiv);
            }
        }

        // Update social media links
        if (store.network && Object.keys(store.network).length > 0) {
            currentDomElements.socialMediaSectionEl.classList.remove('pmt-hidden');
            currentDomElements.socialMediaLinksEl.innerHTML = formatSocialMediaLinks(store.network);
        } else {
            currentDomElements.socialMediaSectionEl.classList.add('pmt-hidden');
        }

        if (storeDetailsEl) storeDetailsEl.classList.remove('pmt-hidden');
        if (loadingStateEl) loadingStateEl.classList.add('pmt-hidden');
        if (errorStateEl) errorStateEl.classList.add('pmt-hidden');
        showMessage(t('displayingInfo', { storeName: store.name || 'Store' }), 'success', 2000);

        // In displayStoreDetails, at the very start, add:
        updateMetaTags(store);
    }

    // --- Data Fetching Logic ---

    async function loadStoreData(storeCode, currentDomElements) {
         const {
            storeNameEl, storeDetailsEl, loadingStateEl, loadingMessageEl,
            errorStateEl, errorMessageEl, storeMapWrapperEl, directionsParagraphEl
        } = currentDomElements;

        const storeIdFromConfig = getStoreIdFromConfig();

        if (loadingMessageEl) loadingMessageEl.textContent = `Fetching data for store ${storeIdFromConfig}...`;
        if (loadingStateEl) loadingStateEl.classList.remove('pmt-hidden');
        if (errorStateEl) errorStateEl.classList.add('pmt-hidden');
        if (storeDetailsEl) storeDetailsEl.classList.add('pmt-hidden');
        if (storeMapWrapperEl) storeMapWrapperEl.classList.add('pmt-hidden');
        if (directionsParagraphEl) directionsParagraphEl.classList.add('pmt-hidden');

        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                let errorText = response.statusText;
                try { const errorData = await response.json(); errorText = errorData.message || errorText; } catch(e) {}
                throw new Error(`API call failed: ${response.status} ${errorText}`);
            }
            const data = await response.json();

            // Handle new API format where data is under 'locations' property
            let stores;
            if (data && data.locations && Array.isArray(data.locations)) {
                stores = data.locations;
                console.log("PMT Landing Page: Found locations array in API response");
            } else if (data && Array.isArray(data)) {
                stores = data;
                console.log("PMT Landing Page: Using direct array from API response");
            } else {
                console.error("API response structure error - expected an array of stores:", data);
                throw new Error("API response has unexpected format (expected an array of stores).");
            }

            const selectedStore = stores.find(store => store.storeId?.toLowerCase() === storeIdFromConfig.toLowerCase());

            if (selectedStore) {
                // displayStoreDetails is now async but we don't necessarily need to await it here
                // if we don't have follow-up actions dependent on its completion within this function.
                displayStoreDetails(selectedStore, currentDomElements);
            } else {
                const errorMsg = t('storeNotFound');
                throw new Error(errorMsg);
            }

        } catch (error) {
            console.error('Error loading store data:', error);
            if (storeNameEl) storeNameEl.textContent = t('errorLoading');
            if (loadingStateEl) loadingStateEl.classList.add('pmt-hidden');
            if (errorStateEl) {
                errorStateEl.classList.remove('pmt-hidden');
                if (errorMessageEl) {
                    errorMessageEl.innerHTML = `${t('storeNotFoundMessage')}<br><br>
                        <a href="${PMT_STORE_LOCATOR_URL}" class="pmt-store-locator-link" style="
                            display: inline-block;
                            padding: 10px 20px;
                            background-color: #3399FF;
                            color: white;
                            text-decoration: none;
                            border-radius: 6px;
                            margin-top: 10px;
                            font-weight: 500;
                            transition: background-color 0.2s;
                        ">${t('goToStoreLocator')}</a>`;
                }
                const errorDetailEl = errorStateEl.querySelector('p:last-child');
                if (errorDetailEl) {
                    errorDetailEl.textContent = t('checkStoreCode');
                }
            }
            showMessage(t('errorFetching'), 'error');
        }
    }

    // --- Image Popup Functions ---
    
    function createImagePopup() {
        // Create popup modal if it doesn't exist
        if (document.getElementById('pmt-image-popup')) return;
        
        const popup = document.createElement('div');
        popup.id = 'pmt-image-popup';
        popup.className = 'pmt-image-popup';
        popup.innerHTML = `
            <div class="pmt-image-popup-content">
                <button class="pmt-image-popup-close" aria-label="Close image popup">
                    <span aria-hidden="true">×</span>
                </button>
                <img class="pmt-image-popup-img" src="" alt="">
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Add event listeners
        const closeBtn = popup.querySelector('.pmt-image-popup-close');
        closeBtn.addEventListener('click', hideImagePopup);
        popup.addEventListener('click', (e) => {
            if (e.target === popup) hideImagePopup();
        });
        
        // Add keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && popup.classList.contains('show')) {
                hideImagePopup();
            }
        });
    }
    
    function showImagePopup(imgElement) {
        const popup = document.getElementById('pmt-image-popup');
        const popupImg = popup.querySelector('.pmt-image-popup-img');
        const fullImageSrc = imgElement.getAttribute('data-full-image') || imgElement.src;
        
        popupImg.src = fullImageSrc;
        popupImg.alt = imgElement.alt;
        
        popup.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // Focus management for accessibility
        const closeBtn = popup.querySelector('.pmt-image-popup-close');
        closeBtn.focus();
    }
    
    function hideImagePopup() {
        const popup = document.getElementById('pmt-image-popup');
        if (popup) {
            popup.classList.remove('show');
            document.body.style.overflow = ''; // Restore scrolling
            
            // Return focus to the clicked image
            const clickedImg = document.querySelector('.pmt-photo-album-img:focus');
            if (clickedImg) {
                clickedImg.focus();
            }
        }
    }

    // --- Initialization ---

    async function initializeApp() { // Changed to async
        currentLanguage = detectLanguage();
        await fetchTranslations(`${LOCALES_PATH}${currentLanguage}.json`);
        console.log('Loaded translations:', translations);
        const container = document.getElementById(rootElementId);
        if (!container) {
            console.error(`Main container '#${rootElementId}' not found!`);
            const errorDiv = document.createElement('div');
            errorDiv.textContent = 'Initialization Error: Root container not found.';
            errorDiv.style.color = 'red'; errorDiv.style.padding = '20px'; errorDiv.style.textAlign = 'center';
            document.body.prepend(errorDiv);
            return;
        }
        domElements = createInitialDOMStructure(container);
        // Debug log for translation value
        console.log("t('backToStoreLocator'):", t('backToStoreLocator'));

        try {
            await loadGoogleMapsApiKey(); // Wait for API key to load
            console.log("PMT Landing Page: Google Maps API key ready for static maps.");
        } catch (apiKeyError) {
            console.error("PMT Landing Page: Failed to initialize Google Maps API key. Static map functionality will be disabled.", apiKeyError);
            showMessage(t('mapLoadError'), 'error', 5000);
            // Optionally, you could hide map-related elements here or set a flag
            if (domElements.storeMapWrapperEl) domElements.storeMapWrapperEl.style.display = 'none';
        }

        const storeIdFromConfig = getStoreIdFromConfig();
        loadStoreData(storeIdFromConfig, domElements);

        // Add Powered by PinMeTo footer
        const poweredByFooter = document.createElement('footer');
        poweredByFooter.id = 'pmt-powered-by';
        poweredByFooter.className = 'pmt-powered-by';
        poweredByFooter.innerHTML = `
            <span class="pmt-powered-by-text">Powered by</span>
            <a href="https://www.pinmeto.com" target="_blank" rel="noopener" class="pmt-powered-by-link" style="display: flex; align-items: center; gap: 0.2em; text-decoration: none;">
                <svg width="24" height="40" viewBox="0 0 24 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.9416 40L11.2697 36.913C10.6072 33.8681 9.44772 31.0355 7.6201 28.0016C6.86722 26.7455 6.01082 25.5224 5.18453 24.3396C4.70833 23.6567 4.2152 22.9481 3.74088 22.2377C3.46231 21.8202 3.20822 21.3863 2.96165 20.967C2.81295 20.7161 2.66426 20.4635 2.50992 20.2144C1.75704 18.9987 0.908162 17.2995 0.957099 14.9394C0.979598 13.0879 1.55008 11.2819 2.60027 9.73758C3.45185 8.4843 4.56971 7.42315 5.8785 6.62564C7.18729 5.82813 8.6566 5.31279 10.1874 5.11436C12.7148 4.76462 15.2907 5.22208 17.528 6.41802C18.995 7.21879 20.2443 8.3487 21.172 9.71378C22.2311 11.2489 22.8085 13.0505 22.8339 14.8991C22.859 15.9053 22.7166 16.9088 22.4123 17.8708C22.1964 18.49 21.923 19.0887 21.5955 19.6597C21.5089 19.8208 21.4223 19.9819 21.3376 20.1449C20.5979 21.5858 19.6756 22.8913 18.7816 24.1639C16.1333 27.9174 13.6676 31.7167 12.5929 36.902L11.9416 40ZM11.8438 6.30999C11.3537 6.30925 10.8643 6.34352 10.3794 6.41253C9.03607 6.58533 7.74642 7.03626 6.59737 7.73491C5.44832 8.43356 4.46657 9.3637 3.71829 10.4627C2.8039 11.8002 2.31008 13.3679 2.29723 14.9742C2.25582 17.0011 3.00305 18.4842 3.65994 19.5516C3.81993 19.8098 3.97239 20.0698 4.12485 20.328C4.3733 20.7509 4.60857 21.1501 4.86644 21.5382C5.33322 22.2377 5.82071 22.9389 6.29503 23.6164C7.13261 24.8175 7.98901 26.0589 8.77577 27.3516C10.0923 29.4919 11.1467 31.7748 11.9172 34.1537C13.2159 29.9754 15.3767 26.6906 17.6673 23.4425C18.5331 22.212 19.4309 20.9395 20.1292 19.5791C20.2177 19.407 20.308 19.2404 20.3965 19.0719C20.6872 18.5702 20.9304 18.0437 21.123 17.4991C21.39 16.67 21.5171 15.8044 21.4995 14.9357C21.4848 13.3327 20.9839 11.7697 20.0596 10.4425C19.2494 9.24715 18.1576 8.25722 16.8749 7.55506C15.3343 6.72871 13.603 6.29711 11.8438 6.30083V6.30999Z" fill="#3399FF"/>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M7.76112 22.0906C8.11444 22.5249 8.50106 22.6498 9.17626 22.2863C11.2851 21.1847 13.233 20.1073 15.364 19.0337C15.9745 18.7261 15.9689 18.426 15.4676 18.0495C12.5153 15.8389 9.56719 13.6238 6.62345 11.4045C5.9686 10.9087 5.65968 11.1193 5.30081 11.6617C3.60079 14.2135 4.48502 18.0178 7.76112 22.0906" fill="#FF8854"/>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M19.2268 14.5223C18.2687 10.1303 14.4069 7.39631 8.78186 8.92985C7.77219 9.27023 7.70954 9.47885 8.47232 10.048C11.3871 12.2037 14.3049 14.3582 17.2259 16.5116C19.8403 18.7076 19.3263 15.3898 19.2268 14.5223Z" fill="#3399FF"/>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M15.5627 20.7655L10.0814 23.8518C9.67498 24.0798 9.6122 24.3771 9.82365 24.7438C10.3193 25.6175 10.8149 26.4949 11.322 27.3649C11.5384 27.7297 11.8457 27.9705 12.148 27.4488C13.3903 25.2928 15.827 21.1066 15.8319 20.9607C15.8313 20.9259 15.823 20.8918 15.8077 20.8613C15.7925 20.8308 15.7708 20.8048 15.7445 20.7856C15.7182 20.7664 15.688 20.7546 15.6567 20.7511C15.6253 20.7476 15.5936 20.7526 15.5643 20.7655" fill="#FF8854"/>
                </svg>
                <span class="pmt-powered-by-brand">PinMeTo</span>
            </a>
        `;
        container.appendChild(poweredByFooter);

        // --- Review Widget Spinner ---
        // Add this after the initializeApp function, before the closing IIFE
        const REVIEWS_DATA = [
          {
            "reviewId": "review_001",
            "reviewer": {
              "name": "Anna Olszewska",
              "profileUrl": "https://maps.google.com/maps/contrib/123456789012345678901/reviews"
            },
            "network":"google",
            "rating": 5,
            "reviewText": "I recommend",
            "date": "2024-12-17",
            "isVerified": true,
            "response": null
          },
          {
            "reviewId": "review_002",
            "reviewer": {
              "name": "Olivia Mrocyka",
              "profileUrl": "https://maps.google.com/maps/contrib/098765432109876543210/reviews"
            },
            "network":"google",
            "rating": 5,
            "reviewText": "I highly recommend this place. Full professionalism, commitment and approach to the patient 10/10. I...",
            "date": "2024-07-12",
            "isVerified": true,
            "response": {
              "responseText": "Thank you for your kind words, Olivia! We're glad you had a great experience.",
              "responseDate": "2024-07-13"
            }
          },
          {
            "reviewId": "review_003",
            "reviewer": {
              "name": "John Doe",
              "profileUrl": "https://maps.google.com/maps/contrib/112233445566778899001/reviews"
            },
            "network":"trustpilote",
            "rating": 3,
            "reviewText": "It was an okay experience. The service was a bit slow.",
            "date": "2025-01-05",
            "isVerified": false,
            "response": null
          },
          {
            "reviewId": "review_004",
            "reviewer": {
              "name": "Sarah Johnson",
              "profileUrl": "https://maps.google.com/maps/contrib/223344556677889900112/reviews"
            },
            "network": "google",
            "rating": 4,
            "reviewText": "Great service and friendly staff. The location is convenient and the facilities are clean. Would definitely visit again!",
            "date": "2024-11-28",
            "isVerified": true,
            "response": {
              "responseText": "Thank you for your feedback, Sarah! We're happy to hear you enjoyed your visit.",
              "responseDate": "2024-11-29"
            }
          },
          {
            "reviewId": "review_005",
            "reviewer": {
              "name": "Michael Chen",
              "profileUrl": "https://maps.google.com/maps/contrib/334455667788990011223/reviews"
            },
            "network": "google",
            "rating": 5,
            "reviewText": "Outstanding experience! The team went above and beyond to help me. Very professional and knowledgeable staff.",
            "date": "2024-10-15",
            "isVerified": true,
            "response": null
          },
          {
            "reviewId": "review_006",
            "reviewer": {
              "name": "Emma Wilson",
              "profileUrl": "https://maps.google.com/maps/contrib/445566778899001122334/reviews"
            },
            "network": "trustpilote",
            "rating": 2,
            "reviewText": "Disappointed with the service. Had to wait longer than expected and the staff seemed disorganized.",
            "date": "2024-09-03",
            "isVerified": true,
            "response": {
              "responseText": "We apologize for your experience, Emma. We're working on improving our service efficiency.",
              "responseDate": "2024-09-04"
            }
          },
          {
            "reviewId": "review_007",
            "reviewer": {
              "name": "David Brown",
              "profileUrl": "https://maps.google.com/maps/contrib/556677889900112233445/reviews"
            },
            "network": "google",
            "rating": 5,
            "reviewText": "Excellent service! The staff was very attentive and professional. The facilities are modern and well-maintained.",
            "date": "2024-08-20",
            "isVerified": true,
            "response": null
          },
          {
            "reviewId": "review_008",
            "reviewer": {
              "name": "Lisa Martinez",
              "profileUrl": "https://maps.google.com/maps/contrib/667788990011223344556/reviews"
            },
            "network": "trustpilote",
            "rating": 4,
            "reviewText": "Very good experience overall. The staff was friendly and helpful. Would recommend to others.",
            "date": "2024-07-25",
            "isVerified": false,
            "response": null
          }
        ];

        function getNetworkIcon(network) {
          if (network === 'google') {
            return `<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"></path><path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"></path><path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34A21.991 21.991 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"></path><path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"></path><path fill="none" d="M2 2h44v44H2z"></path></svg>`;
          } else if (network === 'trustpilote') {
            return `<svg width="20" height="20" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#00b67a"/><polygon points="16,6 19.09,13.26 27,14.27 21,19.14 22.18,27.02 16,23.77 9.82,27.02 11,19.14 5,14.27 12.91,13.26" fill="#fff"/></svg>`;
          }
          return '';
        }

        function renderStars(rating) {
          let stars = '';
          for (let i = 1; i <= 5; i++) {
            stars += `<span style="color:${i <= rating ? '#FFC107' : '#E0E0E0'};font-size:1.2em;">&#9733;</span>`;
          }
          return stars;
        }

        function renderReview(review) {
          return `
            <div class="pmt-review-card">
                <div class="pmt-review-top">
                    <div class="pmt-review-header">
                        <div class="pmt-review-header-left">
                            <a href="${sanitizeHTML(review.reviewer.profileUrl)}" target="_blank" rel="noopener" class="pmt-reviewer-name">${sanitizeHTML(review.reviewer.name)}</a>
                            <div class="pmt-review-date-row">
                                <span class="pmt-review-date">${sanitizeHTML(formatDate(review.date))}</span>
                            </div>
                        </div>
                        <span class="pmt-review-network">${getNetworkIcon(review.network)}</span>
                    </div>
                    <div class="pmt-review-rating">
                        ${renderStars(review.rating)}
                        ${review.isVerified ? '<span class="pmt-verified-badge" title="Verified">&#10004;</span>' : ''}
                    </div>
                </div>
                <div class="pmt-review-text">${sanitizeHTML(review.reviewText)}</div>
                ${review.response ? `<div class="pmt-review-response"><strong>Response:</strong> ${sanitizeHTML(review.response.responseText)}</div>` : ''}
            </div>
          `;
        }

        function createReviewWidget() {
          const widget = document.createElement('div');
          widget.id = 'pmt-review-widget';
          widget.innerHTML = `
            <div class="pmt-review-spinner">
              <button class="pmt-review-arrow pmt-review-arrow-left" aria-label="Previous review">&lt;</button>
              <div class="pmt-review-content"></div>
              <button class="pmt-review-arrow pmt-review-arrow-right" aria-label="Next review">&gt;</button>
            </div>
          `;
          // Inline minimal CSS for now
          const style = document.createElement('style');
          style.textContent = `
            #pmt-review-widget { max-width: none; width: 100%; margin: 2em 0 1em 0; padding: 1em; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.07); box-sizing: border-box; height: 340px; }
            .pmt-review-spinner { display: flex; align-items: center; justify-content: center; gap: 1em; height: 100%; }
            .pmt-review-arrow { background: #f3f3f3; border: none; border-radius: 50%; width: 2.5em; height: 2.5em; font-size: 1.5em; cursor: pointer; transition: background 0.2s; }
            .pmt-review-arrow:hover { background: #e0e0e0; }
            .pmt-review-content { flex: 1; min-width: 0; display: flex; gap: 1.5em; justify-content: center; align-items: stretch; height: 100%; width: 100%; max-width: 800px; box-sizing: border-box; }
            .pmt-review-card { flex: 1 1 0; min-width: 0; width: 260px; padding: 1em; border-radius: 8px; background: #fafbfc; box-shadow: 0 1px 4px rgba(0,0,0,0.04); margin: 0; display: flex; flex-direction: column; height: 100%; overflow: hidden; box-sizing: border-box; }
            .pmt-review-top { display: flex; flex-direction: column; gap: 0.2em; margin-bottom: 0.7em; }
            .pmt-review-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.7em; margin-bottom: 0; }
            .pmt-review-header-left { display: flex; flex-direction: column; align-items: flex-start; }
            .pmt-reviewer-name { font-weight: bold; color: #222; text-decoration: none; line-height: 1.2; }
            .pmt-review-date-row { margin-top: 0.1em; }
            .pmt-review-date { color: #888; font-size: 0.95em; }
            .pmt-review-network { margin-left: 0.5em; display: flex; align-items: center; }
            .pmt-review-rating { margin: 0.2em 0 0.2em 0; min-height: 1.6em; display: flex; align-items: center; }
            .pmt-verified-badge { color: #3399FF; margin-left: 0.5em; font-size: 1.1em; vertical-align: middle; }
            .pmt-review-text { font-size: 1.08em; margin-bottom: 0.5em; flex: 1 1 auto; overflow: auto; min-height: 0; }
            .pmt-review-response { background: #f0f7ff; border-left: 3px solid #3399FF; padding: 0.5em 1em; border-radius: 12px; font-size: 0.98em; color: #225; margin-top: 0.7em; box-shadow: none; position: static; z-index: auto; flex: 0 0 auto; }
            @media (max-width: 1020px) {
              #pmt-review-widget { width: 100%; max-width: none; height: 260px; margin: 2em 0 1em 0; }
              .pmt-review-content { width: 100%; max-width: none; height: 100%; }
            }
            @media (max-width: 899px) {
              #pmt-review-widget { 
                width: 100%; 
                max-width: none; 
                height: auto; 
                min-height: 280px;
                padding: 0.4em;
                margin: 1em 0;
                border-radius: 8px;
                position: relative;
              }
              .pmt-review-spinner {
                gap: 0.2em;
                padding: 0 0.3em;
                position: relative;
                min-height: 280px;
                display: flex;
                align-items: center;
              }
              .pmt-review-arrow {
                width: 1.8em;
                height: 1.8em;
                font-size: 1.1em;
                border-radius: 3px;
                background: #f0f0f0;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                min-width: 1.8em;
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                z-index: 2;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                margin: 0;
              }
              .pmt-review-arrow-left {
                left: 0.3em;
              }
              .pmt-review-arrow-right {
                right: 0.3em;
              }
              .pmt-review-content { 
                width: 100%; 
                max-width: 100%; 
                height: auto;
                gap: 0;
                padding: 0 2.2em;
                position: relative;
                z-index: 1;
              }
              .pmt-review-card {
                width: 100%;
                max-width: 100%;
                height: auto;
                min-height: unset;
                padding: 0.7em;
                margin: 0;
                border-radius: 6px;
                background: #fafbfc;
                position: relative;
              }
              .pmt-review-top { 
                margin-bottom: 0.5em;
                gap: 0.1em;
              }
              .pmt-review-header {
                gap: 0.4em;
              }
              .pmt-reviewer-name {
                font-size: 0.95em;
              }
              .pmt-review-date {
                font-size: 0.85em;
              }
              .pmt-review-rating {
                margin: 0.1em 0;
                min-height: 1.4em;
              }
              .pmt-review-text {
                font-size: 0.95em;
                margin-bottom: 0.3em;
                line-height: 1.4;
              }
              .pmt-review-response {
                font-size: 0.9em;
                margin-top: 0.4em;
                padding: 0.3em 0.7em;
                border-radius: 6px;
              }
              .pmt-verified-badge {
                font-size: 1em;
                margin-left: 0.3em;
              }
            }
          `;
          widget.appendChild(style);
          return widget;
        }

        function mountReviewWidget() {
          if (!domElements || !domElements.storeDetailsEl) return;
          const widget = createReviewWidget();
          domElements.storeDetailsEl.appendChild(widget);
          const content = widget.querySelector('.pmt-review-content');
          const leftBtn = widget.querySelector('.pmt-review-arrow-left');
          const rightBtn = widget.querySelector('.pmt-review-arrow-right');
          let idx = 0;
          let touchStartX = 0;
          let touchEndX = 0;
          const SWIPE_THRESHOLD = 50; // Minimum distance for a swipe

          function getReviewsPerPage() {
            return 2;
          }

          function show(idxToShow) {
            const perPage = getReviewsPerPage();
            idx = (idxToShow + REVIEWS_DATA.length) % REVIEWS_DATA.length;
            let html = '';
            for (let i = 0; i < perPage; i++) {
              const reviewIdx = (idx + i) % REVIEWS_DATA.length;
              html += renderReview(REVIEWS_DATA[reviewIdx]);
            }
            content.innerHTML = html;
          }

          // Touch event handlers
          function handleTouchStart(e) {
            touchStartX = e.touches[0].clientX;
          }

          function handleTouchMove(e) {
            touchEndX = e.touches[0].clientX;
          }

          function handleTouchEnd() {
            const swipeDistance = touchEndX - touchStartX;
            const perPage = getReviewsPerPage();

            if (Math.abs(swipeDistance) > SWIPE_THRESHOLD) {
              if (swipeDistance > 0) {
                // Swipe right - show previous
                show(idx - perPage);
              } else {
                // Swipe left - show next
                show(idx + perPage);
              }
            }
          }

          // Add touch event listeners
          content.addEventListener('touchstart', handleTouchStart, { passive: true });
          content.addEventListener('touchmove', handleTouchMove, { passive: true });
          content.addEventListener('touchend', handleTouchEnd);

          leftBtn.addEventListener('click', () => {
            const perPage = getReviewsPerPage();
            show(idx - perPage);
          });
          rightBtn.addEventListener('click', () => {
            const perPage = getReviewsPerPage();
            show(idx + perPage);
          });
          show(0);
          // Optional: auto-advance every 8s
          let autoAdvance = setInterval(() => {
            const perPage = getReviewsPerPage();
            show(idx + perPage);
          }, 8000);
          widget.addEventListener('mouseenter', () => clearInterval(autoAdvance));
          widget.addEventListener('mouseleave', () => {
            autoAdvance = setInterval(() => {
              const perPage = getReviewsPerPage();
              show(idx + perPage);
            }, 8000);
          });
          // Responsive: update on resize
          window.addEventListener('resize', () => show(idx));
        }

        // At the end of initializeApp, after adding the footer:
        // ... existing code ...
        if (SHOW_REVIEWS) {
            mountReviewWidget();
        }
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS_PATH; // Use the configurable path
    document.head.appendChild(link);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }

    // Add this helper function near the top-level helpers:
    function getUsePathParameter() {
        // 1. Check data attribute on root element
        if (rootEl && rootEl.hasAttribute('data-use-path-parameter')) {
            const attr = rootEl.getAttribute('data-use-path-parameter');
            if (typeof attr === 'string') {
                return attr === 'true' || attr === '1';
            }
        }
        // 2. Check window.USE_PATH_PARAMETER
        if (typeof window !== 'undefined' && typeof window.USE_PATH_PARAMETER !== 'undefined') {
            return window.USE_PATH_PARAMETER;
        }
        // 3. Default
        return false;
    }

    function getStoreIdFromConfig() {
        const usePath = getUsePathParameter();
        if (usePath) {
            // Example: /landingpage/123 or /store/123
            const pathParts = window.location.pathname.split('/');
            // Adjust index based on your URL structure
            // For /landingpage/123, storeId is at index 2
            let storeId = pathParts[2] || null;
            // Fallback to query string if not found in path
            if (!storeId) {
                const urlParams = new URLSearchParams(window.location.search);
                storeId = urlParams.get('storeId');
            }
            return storeId;
        } else {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('storeId');
        }
    }

    // Add this near the top of the file, after the configuration section
    const ICONS = {
        location: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
        locationArrow: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`,
        phone: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`,
        clock: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
        calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
        share: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`,
        link: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`,
        arrowLeft: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg>`,
        services: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H16V4z"></path><rect x="8" y="4" width="8" height="16" rx="2" ry="2"></rect></svg>`,
        fuel: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22h18"></path><path d="M4 9h16"></path><path d="M4 9v13"></path><path d="M20 9v13"></path><path d="M8 9V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4"></path><path d="M12 13v4"></path><path d="M10 13h4"></path></svg>`
    };

})();
