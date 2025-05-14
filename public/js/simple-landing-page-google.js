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
    const WEEKDAYS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const DAY_KEYS_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    const DEFAULT_STORE_CODE = '1337';

    // Default image URL
    const PMT_LANDING_PAGE_DEFAULT_IMAGE_URL = getConfigFromDataAttr(rootEl, 'data-default-image-url', 'https://yourdomain.com/images/store-default.jpg');
    // Store locator URL
    const PMT_STORE_LOCATOR_URL = getConfigFromDataAttr(rootEl, 'data-store-locator-url', 'https://yourdomain.com/store-locator');
    // Home URL
    const PMT_HOME_URL = getConfigFromDataAttr(rootEl, 'data-home-url', 'https://yourdomain.com/');

    // Add to config section:
    const LOCALES_PATH = getConfigFromDataAttr(rootEl, 'data-locales-path', 'locales/');
    const GOOGLE_MAPS_API_KEY_FROM_DATA = getConfigFromDataAttr(rootEl, 'data-google-maps-api-key', null);

    // --- DOM Elements Reference ---

    let domElements = {};

    // --- Map Instance Variable ---

    let mapInstance = null; // Will hold the Google Map instance

    // --- Translation Helper ---
    let translations = {};
    let currentLanguage = 'en';

    function t(key, replacements = {}) {
        let text = translations[key] || key;
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
                loadingMap: "Loading..."
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

        // Create H1 for store name
        elements.storeNameEl = document.createElement('h1');
        elements.storeNameEl.id = 'pmt-store-name';
        elements.storeNameEl.textContent = 'Loading store information...';
        elements.storeNameEl.setAttribute('role', 'heading');
        elements.storeNameEl.setAttribute('aria-level', '1');
        container.appendChild(elements.storeNameEl);

        // Create Message Box (fixed position, initially hidden)
        elements.messageBoxEl = document.createElement('div');
        elements.messageBoxEl.id = 'pmt-message-box';
        elements.messageBoxEl.style.display = 'none';
        elements.messageBoxEl.setAttribute('role', 'status');
        elements.messageBoxEl.setAttribute('aria-live', 'polite');
        container.appendChild(elements.messageBoxEl);

        // Create Store Details container (initially hidden)
        elements.storeDetailsEl = document.createElement('div');
        elements.storeDetailsEl.id = 'pmt-store-details';
        elements.storeDetailsEl.className = 'pmt-hidden';
        elements.storeDetailsEl.setAttribute('role', 'main');
        container.appendChild(elements.storeDetailsEl);

        // --- Address & Map Section ---
        const addressMapSection = document.createElement('section');
        addressMapSection.id = 'pmt-address-map-section';
        addressMapSection.setAttribute('role', 'region');
        addressMapSection.setAttribute('aria-label', t('addressAndLocation'));
        elements.storeDetailsEl.appendChild(addressMapSection);

        const addressMapH2 = document.createElement('h2');
        addressMapH2.innerHTML = '<i class="fa-solid fa-location-dot" aria-hidden="true"></i> Address & Location';
        addressMapH2.setAttribute('role', 'heading');
        addressMapH2.setAttribute('aria-level', '2');
        addressMapSection.appendChild(addressMapH2);

        const addressMapContainer = document.createElement('div');
        addressMapContainer.className = 'pmt-address-map-container';
        addressMapSection.appendChild(addressMapContainer);

        elements.storeAddressContainerEl = document.createElement('div');
        elements.storeAddressContainerEl.id = 'pmt-store-address-container';
        elements.storeAddressContainerEl.setAttribute('role', 'region');
        elements.storeAddressContainerEl.setAttribute('aria-label', t('addressAndLocation'));
        addressMapContainer.appendChild(elements.storeAddressContainerEl);

        elements.storeAddressEl = document.createElement('p');
        elements.storeAddressEl.id = 'pmt-store-address';
        elements.storeAddressEl.setAttribute('role', 'text');
        elements.storeAddressContainerEl.appendChild(elements.storeAddressEl);

        elements.directionsParagraphEl = document.createElement('p');
        elements.directionsParagraphEl.id = 'pmt-directions-paragraph';
        elements.directionsParagraphEl.className = 'pmt-hidden';
        elements.storeAddressContainerEl.appendChild(elements.directionsParagraphEl);

        elements.storeDirectionsLinkEl = document.createElement('a');
        elements.storeDirectionsLinkEl.id = 'pmt-store-directions-link';
        elements.storeDirectionsLinkEl.href = '#';
        elements.storeDirectionsLinkEl.target = '_blank';
        elements.storeDirectionsLinkEl.rel = 'noopener noreferrer';
        elements.storeDirectionsLinkEl.setAttribute('role', 'button');
        elements.storeDirectionsLinkEl.innerHTML = '<i class="fa-solid fa-location-arrow" aria-hidden="true"></i> Get Directions';
        elements.directionsParagraphEl.appendChild(elements.storeDirectionsLinkEl);

        elements.storeMapWrapperEl = document.createElement('div');
        elements.storeMapWrapperEl.id = 'pmt-store-map-wrapper';
        elements.storeMapWrapperEl.className = 'pmt-hidden';
        elements.storeMapWrapperEl.setAttribute('role', 'application');
        elements.storeMapWrapperEl.setAttribute('aria-label', t('interactiveMap'));
        addressMapContainer.appendChild(elements.storeMapWrapperEl);

        elements.storeMapEl = document.createElement('div');
        elements.storeMapEl.id = 'pmt-store-map';
        elements.storeMapWrapperEl.appendChild(elements.storeMapEl);

        // --- Phone Section (initially hidden) ---
        elements.phoneSectionEl = document.createElement('section');
        elements.phoneSectionEl.id = 'pmt-phone-section';
        elements.phoneSectionEl.className = 'pmt-hidden';
        elements.phoneSectionEl.setAttribute('role', 'region');
        elements.phoneSectionEl.setAttribute('aria-label', t('phone'));
        elements.storeDetailsEl.appendChild(elements.phoneSectionEl);

        const phoneH2 = document.createElement('h2');
        phoneH2.innerHTML = '<i class="fa-solid fa-phone" aria-hidden="true"></i> Phone';
        phoneH2.setAttribute('role', 'heading');
        phoneH2.setAttribute('aria-level', '2');
        elements.phoneSectionEl.appendChild(phoneH2);

        elements.storePhoneEl = document.createElement('p');
        elements.storePhoneEl.id = 'pmt-store-phone';
        elements.storePhoneEl.setAttribute('role', 'text');
        elements.phoneSectionEl.appendChild(elements.storePhoneEl);

        // --- Opening Hours Section ---
        const openingHoursSection = document.createElement('section');
        openingHoursSection.setAttribute('role', 'region');
        openingHoursSection.setAttribute('aria-label', t('openingHours'));
        elements.storeDetailsEl.appendChild(openingHoursSection);

        const openingHoursH2 = document.createElement('h2');
        openingHoursH2.innerHTML = '<i class="fa-regular fa-clock" aria-hidden="true"></i> Opening Hours';
        openingHoursH2.setAttribute('role', 'heading');
        openingHoursH2.setAttribute('aria-level', '2');
        openingHoursSection.appendChild(openingHoursH2);

        elements.storeOpeningHoursEl = document.createElement('ul');
        elements.storeOpeningHoursEl.id = 'pmt-store-opening-hours';
        elements.storeOpeningHoursEl.setAttribute('role', 'list');
        openingHoursSection.appendChild(elements.storeOpeningHoursEl);

        // --- Exceptions Section ---
        elements.exceptionsSectionEl = document.createElement('section');
        elements.exceptionsSectionEl.id = 'pmt-exceptions-section';
        elements.exceptionsSectionEl.setAttribute('role', 'region');
        elements.exceptionsSectionEl.setAttribute('aria-label', t('specialOpeningHours'));
        elements.storeDetailsEl.appendChild(elements.exceptionsSectionEl);

        const exceptionsH2 = document.createElement('h2');
        exceptionsH2.innerHTML = '<i class="fa-regular fa-calendar-check" aria-hidden="true"></i> Special Opening Hours';
        exceptionsH2.setAttribute('role', 'heading');
        exceptionsH2.setAttribute('aria-level', '2');
        elements.exceptionsSectionEl.appendChild(exceptionsH2);

        elements.storeExceptionsEl = document.createElement('ul');
        elements.storeExceptionsEl.id = 'pmt-store-exceptions';
        elements.storeExceptionsEl.setAttribute('role', 'list');
        elements.exceptionsSectionEl.appendChild(elements.storeExceptionsEl);

        // --- Concepts Section (initially hidden) ---
        elements.conceptsSectionEl = document.createElement('section');
        elements.conceptsSectionEl.id = 'pmt-concepts-section';
        elements.conceptsSectionEl.className = 'pmt-hidden';
        elements.conceptsSectionEl.setAttribute('role', 'region');
        elements.conceptsSectionEl.setAttribute('aria-label', t('concepts'));
        elements.storeDetailsEl.appendChild(elements.conceptsSectionEl);

        const conceptsH2 = document.createElement('h2');
        conceptsH2.id = 'pmt-concepts-heading';
        conceptsH2.innerHTML = 'Concepts';
        conceptsH2.setAttribute('role', 'heading');
        conceptsH2.setAttribute('aria-level', '2');
        elements.conceptsSectionEl.appendChild(conceptsH2);

        elements.storeConceptsEl = document.createElement('div');
        elements.storeConceptsEl.id = 'pmt-store-concepts';
        elements.storeConceptsEl.className = 'pmt-concepts-container';
        elements.storeConceptsEl.setAttribute('role', 'list');
        elements.conceptsSectionEl.appendChild(elements.storeConceptsEl);

        // --- Social Media Section ---
        elements.socialMediaSectionEl = document.createElement('section');
        elements.socialMediaSectionEl.id = 'pmt-social-media-section';
        elements.socialMediaSectionEl.className = 'pmt-hidden';
        elements.socialMediaSectionEl.setAttribute('role', 'region');
        elements.socialMediaSectionEl.setAttribute('aria-label', 'Social Media');
        elements.storeDetailsEl.appendChild(elements.socialMediaSectionEl);

        const socialMediaH2 = document.createElement('h2');
        socialMediaH2.innerHTML = '<i class="fa-solid fa-share-nodes" aria-hidden="true"></i> Social Media';
        socialMediaH2.setAttribute('role', 'heading');
        socialMediaH2.setAttribute('aria-level', '2');
        elements.socialMediaSectionEl.appendChild(socialMediaH2);

        elements.socialMediaLinksEl = document.createElement('div');
        elements.socialMediaLinksEl.id = 'pmt-social-media-links';
        elements.socialMediaLinksEl.className = 'pmt-social-links';
        elements.socialMediaSectionEl.appendChild(elements.socialMediaLinksEl);

        // --- Loading State ---
        elements.loadingStateEl = document.createElement('div');
        elements.loadingStateEl.id = 'pmt-loading-state';
        elements.loadingStateEl.setAttribute('role', 'status');
        elements.loadingStateEl.setAttribute('aria-live', 'polite');
        container.appendChild(elements.loadingStateEl);

        elements.loadingMessageEl = document.createElement('p');
        elements.loadingMessageEl.id = 'pmt-loading-message';
        elements.loadingMessageEl.textContent = 'Fetching store data...';
        elements.loadingStateEl.appendChild(elements.loadingMessageEl);

        const loadingIndicator = document.createElement('p');
        loadingIndicator.textContent = 'Loading...';
        loadingIndicator.setAttribute('role', 'status');
        loadingIndicator.setAttribute('aria-label', t('loading'));
        elements.loadingStateEl.appendChild(loadingIndicator);

        // --- Error State (initially hidden) ---
        elements.errorStateEl = document.createElement('div');
        elements.errorStateEl.id = 'pmt-error-state';
        elements.errorStateEl.className = 'pmt-hidden';
        elements.errorStateEl.setAttribute('role', 'alert');
        elements.errorStateEl.setAttribute('aria-live', 'assertive');
        container.appendChild(elements.errorStateEl);

        elements.errorMessageEl = document.createElement('p');
        elements.errorMessageEl.id = 'pmt-error-message';
        elements.errorStateEl.appendChild(elements.errorMessageEl);

        const errorHint = document.createElement('p');
        errorHint.textContent = 'Check the store code in the URL or try again later.';
        errorHint.setAttribute('role', 'text');
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

    function loadGoogleMapsSDK() {
        return new Promise(async (resolve, reject) => {
            if (!GOOGLE_MAPS_API_KEY) {
                try {
                    await fetchGoogleMapsApiKey();
                } catch (error) {
                    console.error('PMT Landing Page Error: Failed to fetch Google Maps API key', error);
                    reject(new Error('Failed to load Google Maps'));
                    return;
                }
            }

            if (window.google && window.google.maps) {
                console.log('PMT Landing Page: Google Maps SDK already loaded.');
                resolve();
                return;
            }

            if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
                const interval = setInterval(() => {
                    if (window.google && window.google.maps && window.google.maps.marker) {
                        clearInterval(interval);
                        console.log('PMT Landing Page: Google Maps SDK loaded (existing script).');
                        resolve();
                    }
                }, 100);
                setTimeout(() => {
                    if (!(window.google && window.google.maps && window.google.maps.marker)) {
                        clearInterval(interval);
                        console.error('PMT Landing Page Error: Timeout waiting for existing Google Maps SDK to load.');
                        reject(new Error('Failed to load Google Maps'));
                    }
                }, 15000);
                return;
            }

            console.log('PMT Landing Page: Loading Google Maps SDK...');
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=marker&loading=async&callback=pmtLandingPageGoogleMapsLoaded`;
            script.async = true;
            window.pmtLandingPageGoogleMapsLoaded = () => {
                console.log('PMT Landing Page: Google Maps SDK loaded.');
                delete window.pmtLandingPageGoogleMapsLoaded;
                resolve();
            };
            script.onerror = () => {
                console.error('PMT Landing Page Error: Failed to load Google Maps SDK.');
                delete window.pmtLandingPageGoogleMapsLoaded;
                reject(new Error('Failed to load Google Maps'));
            };
            document.head.appendChild(script);
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

    // Add social media link formatting function
    function formatSocialMediaLinks(network) {
        if (!network) return '';
        
        const links = [];
        const socialIcons = {
            facebook: '<i class="fab fa-facebook"></i>',
            google: '<i class="fab fa-google"></i>',
            bing: '<i class="fab fa-microsoft"></i>',
            apple: '<i class="fab fa-apple"></i>'
        };

        for (const [platform, data] of Object.entries(network)) {
            if (data && data.link) {
                const icon = socialIcons[platform] || '<i class="fas fa-link"></i>';
                links.push(`<a href="${data.link}" target="_blank" rel="noopener noreferrer" class="pmt-social-link" aria-label="${platform}">${icon}</a>`);
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
            socialMediaSectionEl, socialMediaLinksEl
        } = currentDomElements;

        console.log("Store data received:", store);

        if (storeNameEl) storeNameEl.textContent = store.name || t('fallbackStoreName');

        if (storeAddressEl) {
            let addressParts = [];
            if (store.address?.street) addressParts.push(store.address.street);
            if (store.address?.city) addressParts.push(store.address.city);
            if (store.address?.postalCode) addressParts.push(store.address.postalCode);
            if (store.address?.country) addressParts.push(store.address.country);
            storeAddressEl.textContent = addressParts.length > 0 ? addressParts.join(', ') : t('fallbackAddress');
        }

        const lat = parseFloat(store.location?.lat);
        const lon = parseFloat(store.location?.lon);
        console.log("Store coordinates:", { lat, lon });

        // --- Google Map & Directions ---
        if (mapInstance) { // Clear previous map instance if any (though unlikely for landing page)
             // For Google Maps, if re-rendering, ensure the map div is empty or handle updates appropriately.
             // Here, we assume it's a fresh load, so emptying is fine.
            if(storeMapEl) storeMapEl.innerHTML = ''; 
            mapInstance = null;
        }
        
        if (directionsParagraphEl) directionsParagraphEl.classList.add('pmt-hidden');

        if (!isNaN(lat) && !isNaN(lon) && storeMapWrapperEl && storeMapEl && directionsParagraphEl && storeDirectionsLinkEl) {
            if (typeof google === 'undefined' || !google.maps || !google.maps.Map || !google.maps.marker) {
                console.error("Google Maps SDK not available. Map cannot be displayed.");
                showMessage(t('mapLoadError'), 'error');
                if (storeMapWrapperEl) storeMapWrapperEl.classList.add('pmt-hidden');
            } else {
                storeMapWrapperEl.classList.remove('pmt-hidden');
                try {
                    console.log("PMT Landing Page: Initializing Google Map.");
                    mapInstance = new google.maps.Map(storeMapEl, {
                        center: { lat: lat, lng: lon },
                        zoom: 15,
                        mapId: "PMT_LANDING_PAGE_MAP_ID" // Optional: for cloud-based map styling
                    });

                    new google.maps.marker.AdvancedMarkerElement({
                        map: mapInstance,
                        position: { lat: lat, lng: lon },
                        title: store.name || 'Store Location'
                    });
                    console.log("PMT Landing Page: Google Map initialized with marker.");
                    
                    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
                    storeDirectionsLinkEl.href = googleMapsUrl;
                    directionsParagraphEl.classList.remove('pmt-hidden');

                } catch (mapError) {
                    console.error("!!! Error initializing Google Map:", mapError);
                    if (storeMapWrapperEl) storeMapWrapperEl.classList.add('pmt-hidden');
                    showMessage(t('mapDisplayError'), 'error');
                }
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
                    const dayData = store.openHours[dayKey];
                    const dayName = WEEKDAYS_EN[index];
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
            const stores = await response.json(); // The root of the response IS the array of stores

            if (!stores || !Array.isArray(stores)) { // Adjusted check
                console.error("API response structure error - expected an array of stores:", stores);
                throw new Error("API response has unexpected format (expected an array of stores).");
            }

            const selectedStore = stores.find(store => store.storeId?.toLowerCase() === storeIdFromConfig.toLowerCase());

            if (selectedStore) {
                // displayStoreDetails is now async but we don't necessarily need to await it here
                // if we don't have follow-up actions dependent on its completion within this function.
                displayStoreDetails(selectedStore, currentDomElements);
            } else {
                const errorMsg = `Store with ID "${storeIdFromConfig}" not found.`;
                throw new Error(errorMsg);
            }

        } catch (error) {
            console.error('Error loading store data:', error);
            if (storeNameEl) storeNameEl.textContent = t('errorLoading');
            if (loadingStateEl) loadingStateEl.classList.add('pmt-hidden');
            if (errorStateEl) {
                errorStateEl.classList.remove('pmt-hidden');
                if (errorMessageEl) errorMessageEl.textContent = error.message || t('errorFetching');
                const errorDetailEl = errorStateEl.querySelector('p:last-child');
                if (errorDetailEl) {
                    errorDetailEl.textContent = t('checkStoreCode');
                }
            }
            showMessage(t('errorFetching'), 'error');
        }
    }

    // --- Initialization ---

    async function initializeApp() { // Changed to async
        currentLanguage = detectLanguage();
        await fetchTranslations(`${LOCALES_PATH}${currentLanguage}.json`);
        const container = document.getElementById(rootElementId);
        if (!container) {
            console.error(`Main container '#${rootElementId}' not found!`);
            const errorDiv = document.createElement('div');
            errorDiv.textContent = 'Initialization Error: Root container not found.';
            errorDiv.style.color = 'red'; errorDiv.style.padding = '20px'; errorDiv.style.textAlign = 'center';
            document.body.prepend(errorDiv);
            return;
        }
        container.classList.add('pmt-container');
        domElements = createInitialDOMStructure(container);

        try {
            await loadGoogleMapsSDK(); // Wait for SDK to load
            console.log("PMT Landing Page: Google Maps SDK ready.");
        } catch (sdkError) {
            console.error("PMT Landing Page: Failed to initialize Google Maps SDK. Map functionality will be disabled.", sdkError);
            showMessage(t('mapLoadError'), 'error', 5000);
            // Optionally, you could hide map-related elements here or set a flag
            if (domElements.storeMapWrapperEl) domElements.storeMapWrapperEl.style.display = 'none';
        }

        const storeIdFromConfig = getStoreIdFromConfig();
        loadStoreData(storeIdFromConfig, domElements);
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/simple-landing-page.css'; // Ensure this path is correct
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

})();
