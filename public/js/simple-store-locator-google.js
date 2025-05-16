(async function () {
    // --- Configuration --- 
    const rootElementId = window.PMT_STORE_LOCATOR_ROOT_ID || 'pmt-store-locator-root';
    const URL_PARAM_NAME = 'storeId'; // URL parameter for deep linking

    // Helper to get config from data attribute or fallback
    function getConfigFromDataAttr(rootEl, attr, fallback) {
        if (rootEl && rootEl.hasAttribute(attr)) {
            return rootEl.getAttribute(attr);
        }
        return fallback;
    }

    const rootEl = document.getElementById(rootElementId);

    // API URL
    const API_URL = getConfigFromDataAttr(rootEl, 'data-api-url', "https://public-api.test.pinmeto.com/pinmeto/abc123/locations.json");
    // Fallback reference location
    const FALLBACK_USER_LAT = parseFloat(getConfigFromDataAttr(rootEl, 'data-fallback-user-lat', 55.60498));
    const FALLBACK_USER_LON = parseFloat(getConfigFromDataAttr(rootEl, 'data-fallback-user-lon', 13.00382));
    // Landing page URL
    const LANDING_PAGE_URL = getConfigFromDataAttr(rootEl, 'data-landing-page-url', 'landingpage.html');
    // Locales path
    const LOCALES_PATH = getConfigFromDataAttr(rootEl, 'data-locales-path', 'locales/');
    // First day of week (0 = Sunday, 1 = Monday, etc.)
    const FIRST_DAY_OF_WEEK = parseInt(getConfigFromDataAttr(rootEl, 'data-first-day-of-week', '1'));

    let GOOGLE_MAPS_API_KEY = null; // Initialize as null
    const CSS_PATH = getConfigFromDataAttr(rootEl, 'data-css-path', '/css/simple-store-locator.css');
    
    // Add to config section:
    const GOOGLE_MAPS_API_KEY_FROM_DATA = getConfigFromDataAttr(rootEl, 'data-google-maps-api-key', null);
    const USE_PATH_PARAMETER = (getConfigFromDataAttr(rootEl, 'data-use-path-parameter', 'false') === 'true');
    
    // --- Application State ---
    let allStores = [];
    let filteredStores = [];
    let selectedStoreId = null;
    let searchTerm = '';
    let isLoading = true;
    let error = null;
    let mapInstance = null; // Will hold the Google Map instance
    let mapMarkers = {}; // { storeId: google.maps.marker.AdvancedMarkerElement instance }
    let infoWindow = null; // To display store info on map click
    let initialStoreIdFromUrl = null;
    let locationStatusMessageKey = 'distanceFromFallback';
    let translations = {};
    let currentLanguage = 'en';
    let currentUserLat = FALLBACK_USER_LAT; // ADDED: Initialize with fallback
    let currentUserLon = FALLBACK_USER_LON; // ADDED: Initialize with fallback

    // Add at the top, after let error = null;
    let geolocationAllowed = false;

    // --- DOM Element References ---
    let rootElement = null;
    let searchInputElement = null;
    let listContainerElement = null;
    let mapContainerElement = null;
    let footerElement = null;
    
    // --- Translation Helper ---
    function t(key, replacements = {}) {
        // Support dot notation for nested keys
        let text = key.split('.').reduce((o, i) => (o ? o[i] : undefined), translations) || key;
        for (const placeholder in replacements) {
            text = text.replace(`{${placeholder}}`, replacements[placeholder]);
        }
        return text;
    }
    
    // --- Fetch Translations ---
    async function fetchTranslations(localeFilePath) {
        try {
            const response = await fetch(localeFilePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, path: ${localeFilePath}`);
            }
            translations = await response.json();
            console.log(`PMT Store Locator: Translations loaded for ${currentLanguage}.`);
        } catch (e) {
            console.error(`PMT Store Locator Error: Failed to load locale file: ${localeFilePath}. Falling back to English defaults.`, e);
            currentLanguage = 'en';
            translations = { // Using more generic translations suitable for PinMeTo data
                appTitle: "Store Locator",
                searchPlaceholder: "Search stores...",
                loading: "Loading...",
                errorLoadingStores: "Error loading stores.",
                noStoresFound: "No stores found.",
                errorInitialization: "Store locator failed to load.",
                distanceFromFallback: "Distance from Malmö.",
                errorLoadingGoogleMaps: "Error loading Google Maps.",
                errorInitializingMap: "Error initializing map.",
                popupStoreNameDefault: "Store",
                popupAddressDefault: "Address not available",
                geolocationNotSupported: "Geolocation is not supported by your browser.",
                geolocationPermissionDenied: "Permission to access location was denied.",
                geolocationUnavailable: "Location information is unavailable.",
                geolocationTimeout: "The request to get user location timed out.",
                geolocationUnknownError: "An unknown error occurred while trying to get user location.",
                geolocationFailed: "Could not get your location: {reason}",
                getDirections: "Get Directions",
                storeDetails: "Store Details",
                distanceLabel: "Distance:",
                phoneLabel: "Phone:",
                hoursLabel: "Hours:",
                fallbackStoreName: "Store Name Unavailable",
                fallbackAddress: "Address Unavailable",
                fallbackAddressMissing: "Address details missing",
                fallbackPhone: "N/A",
                fallbackHours: "Opening hours unavailable",
                hoursClosed: "Closed today",
                hoursUnavailable: "Not available", // Added for PinMeTo structure
                searchAriaLabel: "Search for stores by name, city, or zip code",
                errorHTTP: "HTTP error! status: {status}",
                errorAPIFormat: "Invalid API response format.",
                errorGenericFetch: "Could not fetch store data.",
                storesFound: "{count} stores found.", // Added
                distanceFromUser: "Distance from your location." // Added
            };
        }
    }

    // --- Debounce Helper ---
    function debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
    
    // --- Fetch Google Maps API Key ---
    async function fetchGoogleMapsApiKey() {
        // 1. Data attribute
        if (GOOGLE_MAPS_API_KEY_FROM_DATA) {
            GOOGLE_MAPS_API_KEY = GOOGLE_MAPS_API_KEY_FROM_DATA;
            console.log('PMT Store Locator: Google Maps API key loaded from data attribute.');
            return;
        }
        // 2. window.USE_GOOGLE_MAPS_API_KEY
        if (typeof window !== 'undefined' && typeof window.USE_GOOGLE_MAPS_API_KEY === 'string') {
            GOOGLE_MAPS_API_KEY = window.USE_GOOGLE_MAPS_API_KEY;
            console.log('PMT Store Locator: Google Maps API key loaded from window.USE_GOOGLE_MAPS_API_KEY.');
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
            console.log('PMT Store Locator: Google Maps API key fetched successfully');
        } catch (error) {
            console.error('PMT Store Locator Error: Failed to fetch Google Maps API key', error);
            throw error;
        }
    }

    // --- Dependency Loading Functions ---
    async function loadGoogleMapsSDK() {
        if (!GOOGLE_MAPS_API_KEY) {
            try {
                await fetchGoogleMapsApiKey();
            } catch (error) {
                console.error('PMT Store Locator Error: Failed to fetch Google Maps API key', error);
                throw new Error(t('errorLoadingGoogleMaps'));
            }
        }

        return new Promise((resolve, reject) => {
            if (window.google && window.google.maps && window.google.maps.marker) {
                console.log('PMT Store Locator: Google Maps SDK (with marker lib) already loaded.');
                resolve();
                return;
            }
            if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
                const interval = setInterval(() => {
                    if (window.google && window.google.maps && window.google.maps.marker) {
                        clearInterval(interval);
                        console.log('PMT Store Locator: Google Maps SDK (with marker lib) loaded (existing script).');
                        resolve();
                    }
                }, 100);
                setTimeout(() => {
                    if (!(window.google && window.google.maps && window.google.maps.marker)) {
                        clearInterval(interval);
                        console.error('PMT Store Locator Error: Timeout waiting for existing Google Maps SDK (with marker lib) to load.');
                        reject(new Error(t('errorLoadingGoogleMaps')));
                    }
                }, 15000);
                return;
            }

            console.log('PMT Store Locator: Loading Google Maps SDK (with marker lib)...');
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=marker&loading=async&callback=pmtStoreLocatorGoogleMapsLoaded`;
            script.async = true;
            window.pmtStoreLocatorGoogleMapsLoaded = () => {
                console.log('PMT Store Locator: Google Maps SDK (with marker lib) loaded.');
                delete window.pmtStoreLocatorGoogleMapsLoaded;
                resolve();
            };
            script.onerror = () => {
                console.error('PMT Store Locator Error: Failed to load Google Maps SDK (with marker lib).');
                delete window.pmtStoreLocatorGoogleMapsLoaded;
                reject(new Error(t('errorLoadingGoogleMaps')));
            };
            document.head.appendChild(script);
        });
    }

    function loadCSS(href) {
        if (document.querySelector(`link[href="${href}"]`)) return;
        console.log(`PMT Store Locator: Loading CSS ${href}...`);
        const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href;
        link.onerror = () => console.error(`PMT Store Locator Error: Failed to load CSS: ${href}`);
        document.head.appendChild(link);
    }
    
    // --- Geolocation Function ---
    function getUserLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error(t('geolocationNotSupported')));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log("PMT Store Locator: Geolocation success.", position.coords);
                    resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude });
                },
                (error) => {
                    console.warn("PMT Store Locator: Geolocation error.", error);
                    let reasonKey;
                    switch (error.code) {
                        case error.PERMISSION_DENIED: reasonKey = 'geolocationPermissionDenied'; break;
                        case error.POSITION_UNAVAILABLE: reasonKey = 'geolocationUnavailable'; break;
                        case error.TIMEOUT: reasonKey = 'geolocationTimeout'; break;
                        default: reasonKey = 'geolocationUnknownError'; break;
                    }
                    reject(new Error(t('geolocationFailed', { reason: t(reasonKey) })));
                },
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
            );
        });
    }
    
    // --- Helper Functions ---
    // MODIFIED formatAddress for PinMeTo structure
    function formatAddress(addr) {
        if (!addr || !addr.street) return t('fallbackAddress');
        return addr.street.trim() || t('fallbackAddressMissing');
    }

    // MODIFIED formatOpeningHours for PinMeTo structure 
    function formatOpeningHours(openHoursData, specialOpenHours) {
        if (!openHoursData || typeof openHoursData !== 'object') return t('fallbackHours');

        const now = new Date();
        const today = now.toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

        // Check for special hours for today
        if (specialOpenHours && Array.isArray(specialOpenHours)) {
            const todaySpecialHours = specialOpenHours.find(ex => ex.start === today);
            if (todaySpecialHours) {
                if (todaySpecialHours.state === 'Closed' || !todaySpecialHours.span || todaySpecialHours.span.length === 0) {
                    return t('hoursClosed');
                }
                const formatTime = (timeStr) => timeStr.slice(0, 2) + ":" + timeStr.slice(2);
                const spans = todaySpecialHours.span.map(span => {
                    if (span.open && span.close) {
                        return `${formatTime(span.open)} - ${formatTime(span.close)}`;
                    }
                    return '';
                }).filter(Boolean);
                return spans.join(', ');
            }
        }

        // If no special hours for today, use regular hours
        const dayIndex = now.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
        const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const currentDayKey = dayMap[dayIndex];

        const dayInfo = openHoursData[currentDayKey];

        if (!dayInfo || dayInfo.state === 'Closed' || !dayInfo.span || dayInfo.span.length === 0) {
            return t('hoursClosed');
        }

        const formatTime = (timeStr) => timeStr.slice(0, 2) + ":" + timeStr.slice(2);
        const spans = dayInfo.span.map(span => {
            if (span.open && span.close) {
                return `${formatTime(span.open)} - ${formatTime(span.close)}`;
            }
            return '';
        }).filter(Boolean);
        return spans.join(', ');
    }
    
    // Add new function to format full week hours
    function formatFullWeekHours(openHoursData, specialOpenHours) {
        if (!openHoursData || typeof openHoursData !== 'object') return [];

        const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const dayNames = [
            t('weekdays.sunday'),
            t('weekdays.monday'),
            t('weekdays.tuesday'),
            t('weekdays.wednesday'),
            t('weekdays.thursday'),
            t('weekdays.friday'),
            t('weekdays.saturday')
        ];
        
        // Reorder days based on FIRST_DAY_OF_WEEK
        const reorderedDayMap = [...dayMap.slice(FIRST_DAY_OF_WEEK), ...dayMap.slice(0, FIRST_DAY_OF_WEEK)];
        const reorderedDayNames = [...dayNames.slice(FIRST_DAY_OF_WEEK), ...dayNames.slice(0, FIRST_DAY_OF_WEEK)];
        
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        
        // Find special hours for today if they exist
        const todaySpecialHours = specialOpenHours?.find(ex => ex.start === today);
        
        return reorderedDayMap.map((dayKey, index) => {
            const dayInfo = openHoursData[dayKey];
            let timeStr = t('hoursClosed');
            let isSpecial = false;
            
            // Check if this is today and has special hours
            if (dayKey === dayMap[new Date().getDay()] && todaySpecialHours) {
                if (todaySpecialHours.state === 'Open' && todaySpecialHours.span && todaySpecialHours.span.length > 0) {
                    const formatTime = (timeStr) => timeStr.slice(0, 2) + ":" + timeStr.slice(2);
                    const spans = todaySpecialHours.span.map(span => {
                        if (span.open && span.close) {
                            return `${formatTime(span.open)} - ${formatTime(span.close)}`;
                        }
                        return '';
                    }).filter(Boolean);
                    
                    timeStr = spans.join(', ');
                    isSpecial = true;
                }
            } else if (dayInfo && dayInfo.state === 'Open' && dayInfo.span && dayInfo.span.length > 0) {
                const formatTime = (timeStr) => timeStr.slice(0, 2) + ":" + timeStr.slice(2);
                const spans = dayInfo.span.map(span => {
                    if (span.open && span.close) {
                        return `${formatTime(span.open)} - ${formatTime(span.close)}`;
                    }
                    return '';
                }).filter(Boolean);
                
                timeStr = spans.join(', ');
            }
            
            return {
                day: reorderedDayNames[index],
                hours: timeStr,
                isSpecial: isSpecial
            };
        });
    }

    function cleanPhoneNumber(phone) { if (!phone) return ''; return phone.replace(/[\s()-]/g, ''); }
    
    // --- Haversine Distance Calculation ---
    function calculateDistance(lat1, lon1, lat2, lon2) {
        function toRad(value) { return value * Math.PI / 180; }
        const R = 6371; // Earth radius in kilometers
        try {
            lat1 = parseFloat(lat1); lon1 = parseFloat(lon1); lat2 = parseFloat(lat2); lon2 = parseFloat(lon2);
            if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return null;
            const dLat = toRad(lat2 - lat1); const dLon = toRad(lon2 - lon1);
            const rLat1 = toRad(lat1); const rLat2 = toRad(lat2);
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(rLat1) * Math.cos(rLat2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c; // Distance in km
        } catch (e) { console.error("Error calculating distance:", e); return null; }
    }

    // --- URL Update Function --- 
    function updateUrlWithSelection() {
        const currentUrl = new URL(window.location.href);
        const searchParams = currentUrl.searchParams;
        if (selectedStoreId) { searchParams.set(URL_PARAM_NAME, selectedStoreId); } else { searchParams.delete(URL_PARAM_NAME); }
        let newRelativeUrl = window.location.pathname;
        const searchString = searchParams.toString();
        if (searchString) { newRelativeUrl += '?' + searchString; }
        if (newRelativeUrl !== (window.location.pathname + window.location.search)) {
            console.log(`PMT SL: Updating URL to: ${newRelativeUrl}`);
            history.pushState({ storeId: selectedStoreId }, '', newRelativeUrl);
        }
    }
    
    // --- DOM Manipulation / Rendering Functions ---
    function ensureRootElement() {
        rootElement = document.getElementById(rootElementId);
        if (!rootElement) {
            console.log(`PMT Store Locator: Root element #${rootElementId} not found. Creating...`);
            rootElement = document.createElement('div'); rootElement.id = rootElementId; document.body.appendChild(rootElement);
        } else { console.log(`PMT Store Locator: Found root element #${rootElementId}.`); }
        rootElement.innerHTML = '';

        let lang = rootElement.dataset.language || document.documentElement.lang || 'en';
        if (lang.includes('-')) { lang = lang.split('-')[0]; }
        currentLanguage = lang.toLowerCase();
        console.log(`PMT Store Locator: Using language: ${currentLanguage}`);
    }
    
    function renderLayout() {
        rootElement.className = ""; // Clear previous classes 

        const leftPanel = document.createElement('div'); 
        leftPanel.className = "pmt-sl-left-panel";
        leftPanel.setAttribute('role', 'complementary');
        leftPanel.setAttribute('aria-label', t('appTitle'));

        const header = document.createElement('header'); 
        header.className = "pmt-sl-header"; 
        header.innerHTML = `<h1>${t('appTitle')}</h1>`;

        const searchArea = document.createElement('div'); 
        searchArea.className = "pmt-sl-search-area";
        searchArea.setAttribute('role', 'search');
        searchArea.setAttribute('aria-label', t('searchPlaceholder'));

        searchInputElement = document.createElement('input'); 
        searchInputElement.type = "text"; 
        searchInputElement.placeholder = t('searchPlaceholder'); 
        searchInputElement.setAttribute("aria-label", t('searchAriaLabel'));
        searchInputElement.setAttribute('role', 'searchbox');
        searchInputElement.setAttribute('aria-autocomplete', 'list');
        searchInputElement.className = "pmt-sl-search-input";
        searchInputElement.disabled = isLoading;
        searchInputElement.addEventListener('input', handleSearchInput);
        searchArea.appendChild(searchInputElement);

        // Create map container for mobile view
        const mobileMapContainer = document.createElement('div');
        mobileMapContainer.className = "pmt-sl-map-container";
        mobileMapContainer.id = "pmt-map-container-mobile";
        mobileMapContainer.setAttribute('role', 'application');
        mobileMapContainer.setAttribute('aria-label', t('interactiveMap'));

        listContainerElement = document.createElement('div'); 
        listContainerElement.className = "pmt-sl-list-container"; 
        listContainerElement.id = "pmt-store-list-container";
        listContainerElement.setAttribute('role', 'list');
        listContainerElement.setAttribute('aria-label', t('storesFound', { count: 0 }));

        footerElement = document.createElement('footer'); 
        footerElement.className = "pmt-sl-footer"; 
        footerElement.setAttribute('role', 'contentinfo');
        updateFooter();

        // Add elements to left panel in correct order
        leftPanel.append(header, searchArea, mobileMapContainer, listContainerElement, footerElement);

        const rightPanel = document.createElement('div'); 
        rightPanel.className = "pmt-sl-right-panel";
        rightPanel.setAttribute('role', 'complementary');
        rightPanel.setAttribute('aria-label', t('mapView'));

        mapContainerElement = document.createElement('div'); 
        mapContainerElement.className = "pmt-sl-map-container"; 
        mapContainerElement.id = "pmt-map-container";
        mapContainerElement.setAttribute('role', 'application');
        mapContainerElement.setAttribute('aria-label', t('interactiveMap'));
        rightPanel.appendChild(mapContainerElement);

        rootElement.append(leftPanel, rightPanel);
        console.log("PMT Store Locator: Initial layout rendered.");
    }    

    function renderStoreList() {
        if (!listContainerElement) return;
        listContainerElement.innerHTML = '';

        if (isLoading) { 
            const loader = document.createElement('div');
            loader.className = "pmt-loader";
            loader.setAttribute('role', 'status');
            loader.setAttribute('aria-label', t('loading'));
            listContainerElement.appendChild(loader);
            return; 
        }
        if (error) { 
            const errorEl = document.createElement('p');
            errorEl.className = "pmt-sl-error-text";
            errorEl.setAttribute('role', 'alert');
            errorEl.textContent = t('errorLoadingStores', { error: error });
            listContainerElement.appendChild(errorEl);
            return; 
        }
        if (!filteredStores || filteredStores.length === 0) { 
            const noResults = document.createElement('p');
            noResults.className = "pmt-sl-muted-text";
            noResults.setAttribute('role', 'status');
            noResults.textContent = t('noStoresFound');
            listContainerElement.appendChild(noResults);
            return; 
        }

        const listFragment = document.createDocumentFragment();
        filteredStores.forEach(store => {
            const isSelected = store.id === selectedStoreId;
            const itemDiv = document.createElement('div');
            itemDiv.id = `pmt-store-item-${store.id}`;
            itemDiv.className = `pmt-store-list-item ${isSelected ? 'selected' : ''}`;
            itemDiv.setAttribute('role', 'listitem');
            itemDiv.setAttribute('aria-selected', isSelected);
            itemDiv.setAttribute('aria-label', `${store.name || t('fallbackStoreName')} - ${store.address || t('fallbackAddress')}`);

            const detailsLinkUrl = USE_PATH_PARAMETER
                ? (() => {
                    const qIndex = LANDING_PAGE_URL.indexOf('?');
                    if (qIndex === -1) {
                        return `${LANDING_PAGE_URL.replace(/\/$/, '')}/${encodeURIComponent(store.id)}`;
                    } else {
                        return `${LANDING_PAGE_URL.slice(0, qIndex).replace(/\/$/, '')}/${encodeURIComponent(store.id)}${LANDING_PAGE_URL.slice(qIndex)}`;
                    }
                })()
                : `${LANDING_PAGE_URL}${LANDING_PAGE_URL.includes('?') ? '&' : '?'}${URL_PARAM_NAME}=${encodeURIComponent(store.id)}`;

            let directionsLinkHtml = '';
            if (store.lat != null && store.lng != null) {
                const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`;
                directionsLinkHtml = `<a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" class="pmt-sl-directions-link" aria-label="${t('getDirections')} - ${store.name || t('fallbackStoreName')}">${t('getDirections')}</a>`;
            }

            let phoneHtml;
            const rawPhone = store.phone;
            if (rawPhone && rawPhone !== t('fallbackPhone')) {
                const cleanedPhone = cleanPhoneNumber(rawPhone);
                phoneHtml = `<a href="tel:${cleanedPhone}" class="pmt-sl-phone-link" aria-label="${t('phoneLabel')} ${rawPhone}">${rawPhone}</a>`;
            } else {
                phoneHtml = t('fallbackPhone');
            }

            const addressParts = [];
            const streetAddress = store.address;
            if (streetAddress && streetAddress !== t('fallbackAddress') && streetAddress !== t('fallbackAddressMissing')) { 
                addressParts.push(streetAddress); 
            }
            if (store.city) { addressParts.push(store.city); }
            let addressCityString = addressParts.join(', ');
            if (store.zip) { addressCityString += (addressCityString ? `, ${store.zip}` : store.zip); }
            if (!addressCityString) { addressCityString = t('fallbackAddress');}

            // In renderStoreList, only show distanceHtml if geolocationAllowed is true
            let distanceHtml = '';
            if (geolocationAllowed && store.distance != null) { 
                distanceHtml = `<p><span>${t('distanceLabel')}</span> ${store.distance.toFixed(1)} km</p>`; 
            }

            // Create week hours list
            const weekHours = formatFullWeekHours(store.openHours, store.specialOpenHours);
            const weekHoursHtml = weekHours.map(({ day, hours, isSpecial }) => 
                `<li class="${isSpecial ? 'pmt-special-hours' : ''}"><span class="pmt-day-name">${day}:</span> ${hours}</li>`
            ).join('');

            const hoursHtml = store.hours && store.hours !== t('fallbackHours') 
                ? `<p><span>${t('hoursLabel')}</span> <button class="pmt-hours-button" aria-label="${t('viewFullHours')}">${store.hours}</button></p>
                   <div class="pmt-week-hours">
                       <ul class="pmt-week-hours-list">
                           ${weekHoursHtml}
                       </ul>
                   </div>`
                : `<p><span>${t('hoursLabel')}</span> ${store.hours || t('fallbackHours')}</p>`;

            // Helper to render social links
            let socialLinksHtml = renderSocialLinks(store.network);

            itemDiv.innerHTML = `
                <div class="pmt-store-list-item-header" role="heading" aria-level="3">
                    <h3>${store.name || t('fallbackStoreName')}</h3>
                </div>
                <div class="pmt-store-list-item-content">
                   <p>${addressCityString}</p>
                   ${distanceHtml}
                   <p><span>${t('phoneLabel')}</span> ${phoneHtml}</p>
                   ${hoursHtml}
                   ${socialLinksHtml}
                   <div class="pmt-sl-item-links">
                       <a href="${detailsLinkUrl}" rel="noopener noreferrer" class="pmt-sl-details-link" aria-label="${t('storeDetails')} - ${store.name || t('fallbackStoreName')}">${t('storeDetails')}</a>
                       ${directionsLinkHtml}
                   </div>
                </div>`;

            // Add click handler for hours button
            const hoursButton = itemDiv.querySelector('.pmt-hours-button');
            if (hoursButton) {
                hoursButton.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent store selection
                    itemDiv.classList.toggle('expanded');
                    // Update aria-expanded attribute
                    hoursButton.setAttribute('aria-expanded', itemDiv.classList.contains('expanded'));
                });
            }

            itemDiv.addEventListener('click', (event) => {
                if (event.target.closest('a')) return;
                handleSelection(store.id);
            });

            listFragment.appendChild(itemDiv);
        });

        listContainerElement.appendChild(listFragment);
        listContainerElement.setAttribute('aria-label', t('storesFound', { count: filteredStores.length }));
        updateFooter();
        if (initialStoreIdFromUrl && selectedStoreId === initialStoreIdFromUrl) { 
            scrollListIfNeeded(); 
        }
    }
    
    function updateFooter() {
        if (!footerElement) return;
        const storeCountText = !isLoading && !error ? t('storesFound', { count: filteredStores.length }) : (isLoading ? t('loading') : ' ');
        footerElement.textContent = `${storeCountText} ${t(locationStatusMessageKey)}`;

        // Add Powered by PinMeTo with SVG
        let poweredBy = document.getElementById('pmt-powered-by');
        if (!poweredBy) {
            poweredBy = document.createElement('div');
            poweredBy.id = 'pmt-powered-by';
            poweredBy.innerHTML = `
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
            poweredBy.className = 'pmt-powered-by';
            footerElement.appendChild(poweredBy);
        }
    }
    
    function scrollListIfNeeded() { if (selectedStoreId && listContainerElement) { const e = document.getElementById(`pmt-store-item-${selectedStoreId}`); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }); } }

    // --- Google Maps Functions ---
    function initializeMap() {
        if (typeof google === 'undefined' || typeof google.maps === 'undefined' || typeof google.maps.marker === 'undefined') {
            console.warn("PMT SL: Google Maps SDK (with marker lib) not ready.");
            return;
        }

        try {
            console.log("PMT SL: Init Google Map");
            const isMobile = window.matchMedia('(max-width: 767px)').matches;

            if (isMobile) {
                // Only initialize mobile map
                const mobileMapContainer = document.getElementById('pmt-map-container-mobile');
                if (mobileMapContainer) {
                    window.pmtMobileMapInstance = new google.maps.Map(mobileMapContainer, {
                        center: { lat: currentUserLat, lng: currentUserLon },
                        zoom: 5,
                        mapId: "PMT_STORE_LOCATOR_MAP_ID",
                        mapTypeControl: false,
                        streetViewControl: false,
                        fullscreenControl: false
                    });
                }
                mapInstance = null; // Don't use desktop map
            } else {
                // Only initialize desktop map
                if (mapContainerElement) {
                    mapInstance = new google.maps.Map(mapContainerElement, {
                        center: { lat: currentUserLat, lng: currentUserLon },
                        zoom: 5,
                        mapId: "PMT_STORE_LOCATOR_MAP_ID",
                        mapTypeControl: false,
                        streetViewControl: false,
                        fullscreenControl: false
                    });
                }
                window.pmtMobileMapInstance = null; // Don't use mobile map
            }

            infoWindow = new google.maps.InfoWindow();
            console.log("PMT SL: Google Map OK");
        } catch (e) {
            console.error("PMT SL: Google MapInit Err", e);
            const errorMessage = `<p class=\"pmt-sl-error-text\">${t('errorInitializingMap')}</p>`;
            if (mapContainerElement) mapContainerElement.innerHTML = errorMessage;
            const mobileMapContainer = document.getElementById('pmt-map-container-mobile');
            if (mobileMapContainer) mobileMapContainer.innerHTML = errorMessage;
        }
    }

    function updateMapMarkers() {
        if (typeof google === 'undefined' || typeof google.maps === 'undefined' || typeof google.maps.marker === 'undefined') return;
        console.log(`PMT SL: Update Google Map Advanced Markers`);

        // Clear existing markers
        Object.values(mapMarkers).forEach(marker => {
            marker.map = null; 
        });
        mapMarkers = {};

        let markersAddedCount = 0;
        const bounds = new google.maps.LatLngBounds();

        // Only create markers for the closest 1000 stores
        const storesToShow = filteredStores.slice(0, 1000);

        storesToShow.forEach(store => {
            const lat = store?.lat;
            const lng = store?.lng;
            if (lat != null && lng != null) {
                try {
                    const parsedLat = parseFloat(lat);
                    const parsedLng = parseFloat(lng);
                    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
                        const position = { lat: parsedLat, lng: parsedLng };
                        
                        // Create marker for desktop map
                        if (mapInstance) {
                            const marker = new google.maps.marker.AdvancedMarkerElement({
                                position: position,
                                map: mapInstance,
                                title: store.name || t('popupStoreNameDefault'),
                            });

                            // Add click listener to the marker
                            marker.addListener('gmp-click', () => {
                                console.log(`PMT SL: Marker clicked for store ${store.id}`);
                                // First open the info window
                                infoWindow.open({ anchor: marker, map: mapInstance });
                                // Then select the store in the list
                                handleSelection(store.id);
                                // Scroll the selected store into view
                                const storeElement = document.getElementById(`pmt-store-item-${store.id}`);
                                if (storeElement) {
                                    storeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }
                            });

                            mapMarkers[store.id] = marker;
                        }

                        // Create marker for mobile map
                        if (window.pmtMobileMapInstance) {
                            const mobileMarker = new google.maps.marker.AdvancedMarkerElement({
                                position: position,
                                map: window.pmtMobileMapInstance,
                                title: store.name || t('popupStoreNameDefault'),
                            });

                            // Add click listener to the mobile marker
                            mobileMarker.addListener('gmp-click', () => {
                                console.log(`PMT SL: Mobile marker clicked for store ${store.id}`);
                                // First open the info window
                                infoWindow.open({ anchor: mobileMarker, map: window.pmtMobileMapInstance });
                                // Then select the store in the list
                                handleSelection(store.id);
                                // Scroll the selected store into view
                                const storeElement = document.getElementById(`pmt-store-item-${store.id}`);
                                if (storeElement) {
                                    storeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }
                            });
                        }

                        bounds.extend(position);
                        markersAddedCount++;
                    } else {
                        console.warn(`PMT SL: Invalid coords for store ${store.id}: lat=${lat}, lng=${lng}`);
                    }
                } catch (e) {
                    console.error(`PMT SL: Google Advanced MarkerErr for store ${store.id}`, e);
                }
            } else {
                console.warn(`PMT SL: Missing coords for store ${store.id}`);
            }
        });

        console.log(`PMT SL: ${markersAddedCount} Google Map Advanced Markers added.`);
        if (markersAddedCount > 0) {
            if (!selectedStoreId) {
                if (mapInstance) mapInstance.fitBounds(bounds, 50);
                if (window.pmtMobileMapInstance) window.pmtMobileMapInstance.fitBounds(bounds, 50);
            }
        } else {
            if (mapInstance) {
                mapInstance.setCenter({ lat: currentUserLat, lng: currentUserLon });
                mapInstance.setZoom(5);
            }
            if (window.pmtMobileMapInstance) {
                window.pmtMobileMapInstance.setCenter({ lat: currentUserLat, lng: currentUserLon });
                window.pmtMobileMapInstance.setZoom(5);
            }
        }
    }

    function handleMapSelection() {
        if (typeof google === 'undefined' || typeof google.maps === 'undefined' || !selectedStoreId) {
            if (infoWindow) infoWindow.close();
            return;
        }

        const store = filteredStores.find(s => s.id === selectedStoreId);
        if (!store) return;

        // Handle desktop map
        if (mapInstance) {
            const marker = mapMarkers[selectedStoreId];
            if (marker) {
                try {
                    mapInstance.panTo(marker.position); 
                    mapInstance.setZoom(14);
                    infoWindow.close(); 
                    
                    const addressParts = [];
                    const streetAddress = store.address;
                    if (streetAddress && streetAddress !== t('fallbackAddress') && streetAddress !== t('fallbackAddressMissing')) { 
                        addressParts.push(streetAddress); 
                    }
                    if (store.city) { addressParts.push(store.city); }
                    let addressCityString = addressParts.join(', ');
                    if (store.zip) { addressCityString += (addressCityString ? `, ${store.zip}` : store.zip); }
                    if (!addressCityString) { addressCityString = t('fallbackAddress');}

                    // In handleMapSelection, only show distanceHtml if geolocationAllowed is true
                    let distanceHtml = '';
                    if (geolocationAllowed && store.distance != null) { 
                        distanceHtml = `<p><span>${t('distanceLabel')}</span> ${store.distance.toFixed(1)} km</p>`; 
                    }

                    let phoneHtml;
                    const rawPhone = store.phone;
                    if (rawPhone && rawPhone !== t('fallbackPhone')) {
                        const cleanedPhone = cleanPhoneNumber(rawPhone);
                        phoneHtml = `<a href="tel:${cleanedPhone}" class="pmt-sl-phone-link pmt-no-select" aria-label="${t('phoneLabel')} ${rawPhone}">${rawPhone}</a>`;
                    } else {
                        phoneHtml = t('fallbackPhone');
                    }

                    // Create week hours list
                    const weekHours = formatFullWeekHours(store.openHours, store.specialOpenHours);
                    const weekHoursHtml = weekHours.map(({ day, hours, isSpecial }) => 
                        `<li class="${isSpecial ? 'pmt-special-hours' : ''}"><span class="pmt-day-name">${day}:</span> ${hours}</li>`
                    ).join('');

                    const hoursHtml = store.hours && store.hours !== t('fallbackHours') 
                        ? `<p><span>${t('hoursLabel')}</span>${store.hours}</p>
                           <div class="pmt-week-hours">
                               <ul class="pmt-week-hours-list">
                                   ${weekHoursHtml}
                               </ul>
                           </div>`
                        : `<p><span>${t('hoursLabel')}</span> ${store.hours || t('fallbackHours')}</p>`;

                    // Helper to render social links
                    let socialLinksHtml = renderSocialLinks(store.network);

                    const content = `
                        <div class="pmt-map-info-window">
                            <div class="pmt-store-list-item-header">
                                <h3>${store.name || t('fallbackStoreName')}</h3>
                            </div>
                            <div class="pmt-store-list-item-content">
                                <p>${addressCityString}</p>
                                ${distanceHtml}
                                <p><span>${t('phoneLabel')}</span> ${phoneHtml}</p>
                                ${hoursHtml}
                                ${socialLinksHtml}
                            </div>
                        </div>
                    `;
                    infoWindow.setHeaderDisabled(true);
                    infoWindow.setContent(content);
                    infoWindow.open({ anchor: marker, map: mapInstance });

                    // After infoWindow.open({ anchor: marker, map: mapInstance }); in handleMapSelection, add:
                    setTimeout(() => {
                        const infoWindowEl = document.querySelector('.pmt-map-info-window');
                        if (infoWindowEl) {
                            const phoneLink = infoWindowEl.querySelector('a.pmt-sl-phone-link');
                            if (phoneLink) phoneLink.blur();
                        }
                        if (window.getSelection) {
                            const sel = window.getSelection();
                            if (sel && sel.removeAllRanges) sel.removeAllRanges();
                        }
                    }, 100);
                } catch (e) {
                    console.error("PMT SL: Google Map PanTo/Zoom Err", e);
                }
            }
        }

        // Handle mobile map
        if (window.pmtMobileMapInstance) {
            const mobileMarker = mapMarkers[selectedStoreId];
            if (mobileMarker) {
                try {
                    window.pmtMobileMapInstance.panTo(mobileMarker.position);
                    window.pmtMobileMapInstance.setZoom(14);
                    infoWindow.close();

                    // Reuse the same content for mobile map
                    const content = infoWindow.getContent();
                    if (content) {
                        infoWindow.setContent(content);
                        infoWindow.open({ anchor: mobileMarker, map: window.pmtMobileMapInstance });
                    }
                } catch (e) {
                    console.error("PMT SL: Mobile Google Map PanTo/Zoom Err", e);
                }
            }
        }
    }
    
    // --- Search Logic ---
    function performSearch() {
        selectedStoreId = null; // Clear selection on new search
        filterStores();
        renderStoreList();
        updateMapMarkers();
        updateUrlWithSelection();
        if (infoWindow) infoWindow.close();
    }

    const debouncedPerformSearch = debounce(performSearch, 300); // Debounce search by 300ms

    function handleSearchInput(event) {
        searchTerm = event.target.value;
        debouncedPerformSearch();
    }    

    function filterStores() {
        const term = searchTerm.trim().toLowerCase();
        if (!term) {
            filteredStores = [...allStores];
        } else {
            filteredStores = allStores.filter(s =>
                (s.name && s.name.toLowerCase().includes(term)) ||
                (s.city && s.city.toLowerCase().includes(term)) || 
                (s.zip && s.zip.toLowerCase().includes(term)) 
            );
        }
        
        if (selectedStoreId && !filteredStores.some(s => s.id === selectedStoreId)) {
            selectedStoreId = null; 
        }
    }
    
    function handleSelection(storeId) {
        console.log(`PMT SL: Select store ${storeId}`);
        const previouslySelected = selectedStoreId;
        selectedStoreId = storeId;

        if (previouslySelected) { 
            document.getElementById(`pmt-store-item-${previouslySelected}`)?.classList.remove('selected'); 
        }
        if (selectedStoreId) { 
            document.getElementById(`pmt-store-item-${selectedStoreId}`)?.classList.add('selected'); 
        }

        // If a store is selected, add markers for the closest 1000 locations to it
        if (selectedStoreId) {
            const selectedStore = filteredStores.find(s => s.id === selectedStoreId);
            if (selectedStore && selectedStore.lat != null && selectedStore.lng != null) {
                try {
                    const selectedLat = parseFloat(selectedStore.lat);
                    const selectedLng = parseFloat(selectedStore.lng);
                    
                    if (!isNaN(selectedLat) && !isNaN(selectedLng)) {
                        // Calculate distances to all stores from the selected store
                        const storesWithDistances = filteredStores.map(store => ({
                            ...store,
                            distanceToSelected: calculateDistance(
                                selectedLat,
                                selectedLng,
                                parseFloat(store.lat),
                                parseFloat(store.lng)
                            )
                        }));

                        // Sort by distance to selected store
                        storesWithDistances.sort((a, b) => {
                            if (a.distanceToSelected === null && b.distanceToSelected === null) return 0;
                            if (a.distanceToSelected === null) return 1;
                            if (b.distanceToSelected === null) return -1;
                            return a.distanceToSelected - b.distanceToSelected;
                        });

                        // Take closest 1000 stores
                        const closestStores = storesWithDistances.slice(0, 1000);

                        // Add markers for stores that don't have them
                        closestStores.forEach(store => {
                            if (!mapMarkers[store.id] && store.lat != null && store.lng != null) {
                                const parsedLat = parseFloat(store.lat);
                                const parsedLng = parseFloat(store.lng);
                                
                                if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
                                    const position = { lat: parsedLat, lng: parsedLng };
                                    const marker = new google.maps.marker.AdvancedMarkerElement({
                                        position: position,
                                        map: mapInstance,
                                        title: store.name || t('popupStoreNameDefault'),
                                    });

                                    marker.addListener('click', () => {
                                        infoWindow.open({ anchor: marker, map: mapInstance });
                                        handleSelection(store.id);
                                    });

                                    mapMarkers[store.id] = marker;
                                }
                            }
                        });

                        // Update map bounds to show all markers
                        const bounds = new google.maps.LatLngBounds();
                        Object.values(mapMarkers).forEach(marker => {
                            bounds.extend(marker.position);
                        });
                        mapInstance.fitBounds(bounds, 50);
                    }
                } catch (e) {
                    console.error(`PMT SL: Error updating markers for selected store ${storeId}`, e);
                }
            }
        }

        handleMapSelection();
        scrollListIfNeeded();
        updateUrlWithSelection();
    }
    
    // MODIFIED fetchAndProcessStores for PinMeTo structure
    async function fetchAndProcessStores(currentLat, currentLon) {
        isLoading = true; error = null;
        if (searchInputElement) searchInputElement.disabled = true;
        renderStoreList(); updateFooter();
        console.log("PMT SL: Fetching stores from new API...");
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error(t('errorHTTP', { status: response.status }));
            const data = await response.json(); 
            if (!data || !Array.isArray(data)) throw new Error(t('errorAPIFormat'));

            allStores = data.filter(s => s.permanentlyClosed !== true).map((s, i) => {
                const latitude = s.location?.lat;
                const longitude = s.location?.lon;
                const storeIdentifier = s.storeId || `pmt-gen-${i}`; 

                let distanceKm = null;
                if (geolocationAllowed) {
                    if (latitude != null && longitude != null && currentLat != null && currentLon != null) {
                        distanceKm = calculateDistance(currentLat, currentLon, latitude, longitude);
                    }
                } else {
                    distanceKm = null; // Explicitly ensure no distance is set if geolocation is not allowed
                }
                return {
                    id: storeIdentifier,
                    name: s.locationDescriptor && String(s.locationDescriptor).trim() !== ''
                          ? `${s.name || t('fallbackStoreName')} (${s.locationDescriptor.trim()})` : s.name || t('fallbackStoreName'),
                    address: formatAddress(s.address),
                    city: s.address?.city || '', 
                    zip: s.address?.zip || '', 
                    phone: s.contact?.phone || t('fallbackPhone'),
                    hours: formatOpeningHours(s.openHours, s.specialOpenHours),
                    openHours: s.openHours,
                    lat: latitude,
                    lng: longitude,
                    distance: distanceKm,
                    network: s.network,
                };
            });
            
            allStores.sort((a, b) => {
                if (a.distance === null && b.distance === null) return 0;
                if (a.distance === null) return 1; 
                if (b.distance === null) return -1;
                return a.distance - b.distance;
            });

            console.log(`PMT SL: Processed and sorted ${allStores.length} stores.`);
            filterStores(); 
        } catch (err) {
            console.error("PMT SL: FetchErr", err);
            error = err.message || t('errorGenericFetch');
            allStores = []; filteredStores = [];
        } finally {
            isLoading = false;
            if (searchInputElement) searchInputElement.disabled = false;
        }
    }
    
    // --- Initialization ---
    async function initializeApp() {
        try {
            console.log('PMT Store Locator (Google Maps with PinMeTo data): Initializing App...');
            ensureRootElement(); 
            await fetchTranslations(`${LOCALES_PATH}${currentLanguage}.json`); 

            renderLayout(); 

            // currentUserLat and currentUserLon are already initialized with fallbacks
            locationStatusMessageKey = 'distanceFromFallback'; 
            try {
                console.log('PMT Store Locator: Requesting user location...');
                const coords = await getUserLocation();
                currentUserLat = coords.latitude; // MODIFIED: Assign to IIFE-scoped variable
                currentUserLon = coords.longitude; // MODIFIED: Assign to IIFE-scoped variable
                locationStatusMessageKey = 'distanceFromUser';
                console.log(`PMT Store Locator: ${t(locationStatusMessageKey)}`);
                geolocationAllowed = true;
            } catch (geoError) {
                console.warn(`PMT Store Locator: Geolocation failed - ${geoError.message}. Using fallback: ${t(locationStatusMessageKey)}`);
                // currentUserLat and currentUserLon retain their fallback values
                geolocationAllowed = false;
            }

            const urlParams = new URLSearchParams(window.location.search);
            initialStoreIdFromUrl = urlParams.get(URL_PARAM_NAME);
            if (initialStoreIdFromUrl) {
                console.log(`PMT Store Locator: Found initial store code from URL: ${initialStoreIdFromUrl}`);
                selectedStoreId = initialStoreIdFromUrl; 
            }

            loadCSS(CSS_PATH);
            await loadGoogleMapsSDK(); 
            
            initializeMap(); // initializeMap will now use the IIFE-scoped currentUserLat/Lon

            // Pass the determined (or fallback) user location to fetchAndProcessStores
            await fetchAndProcessStores(currentUserLat, currentUserLon); 

            let applyInitialSelection = false;
            if (selectedStoreId) { 
                const storeExists = allStores.some(store => store.id === selectedStoreId);
                if (storeExists) {
                    console.log(`PMT Store Locator: Initial store code ${selectedStoreId} is valid.`);
                    applyInitialSelection = true;
                    if (!searchTerm && !filteredStores.some(s => s.id === selectedStoreId)) {
                         filterStores(); 
                    }
                } else {
                    console.warn(`PMT Store Locator: Initial store code ${selectedStoreId} not found in fetched data.`);
                    selectedStoreId = null; initialStoreIdFromUrl = null; updateUrlWithSelection(); 
                }
            }
            
            renderStoreList(); 
            updateMapMarkers(); 
            
            if (applyInitialSelection) {
                console.log(`PMT Store Locator: Applying initial map selection for ${selectedStoreId}`);
                handleSelection(selectedStoreId); 
            } else if (filteredStores.length > 0 && mapInstance && Object.keys(mapMarkers).length > 0) {
                 const bounds = new google.maps.LatLngBounds();
                 filteredStores.forEach(store => {
                    const marker = mapMarkers[store.id];
                    if(marker && marker.position) bounds.extend(marker.position); 
                 });
                 if(!bounds.isEmpty()) mapInstance.fitBounds(bounds, 50); 
            } else if (mapInstance) { 
                mapInstance.setCenter({ lat: currentUserLat, lng: currentUserLon });
                mapInstance.setZoom(5);
            }
            
            console.log('PMT Store Locator (Google Maps with PinMeTo data): Initialization complete.');

        } catch (initError) {
            console.error("PMT Store Locator Error (Google Maps with PinMeTo data): Failed to initialize.", initError);
            const displayError = (msg) => {
                if (!rootElement) { 
                    rootElement = document.getElementById(rootElementId) || document.createElement('div');
                    if (!rootElement.id) rootElement.id = rootElementId;
                    if(!document.getElementById(rootElementId)) document.body.appendChild(rootElement);
                }
                if (Object.keys(translations).length === 0) {
                    translations = { 
                        errorInitialization: "Store locator failed to load: {message}"
                    };
                }
                const errorMessageText = t('errorInitialization', { message: msg });
                rootElement.innerHTML = `<p style="color: red; background-color: white; border: 1px solid red; padding: 1em; font-family: sans-serif; margin: 1em;">${errorMessageText} Check console for details.</p>`;
            };
            displayError(initError.message || "Unknown error");
        }
    }
    
    // Helper to render social links (make available globally)
    function renderSocialLinks(network) {
        if (!network) return '';
        const icons = {
            facebook: {
                svg: `<svg viewBox="0 0 1365.3333 1365.3333" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1.3333333,0,0,-1.3333333,0,1365.3333)"><g transform="scale(0.1)"><path style="fill:#1877f2;fill-opacity:1;fill-rule:nonzero;stroke:none" d="m 10240,5120 c 0,2827.7 -2292.3,5120 -5120,5120 C 2292.3,10240 0,7947.7 0,5120 0,2564.46 1872.31,446.301 4320,62.1992 V 3640 H 3020 v 1480 h 1300 v 1128 c 0,1283.2 764.38,1992 1933.9,1992 560.17,0 1146.1,-100 1146.1,-100 V 6880 H 6754.38 C 6118.35,6880 5920,6485.33 5920,6080.43 V 5120 H 7340 L 7113,3640 H 5920 V 62.1992 C 8367.69,446.301 10240,2564.46 10240,5120"></path><path style="fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none" d="m 7113,3640 227,1480 H 5920 v 960.43 c 0,404.9 198.35,799.57 834.38,799.57 H 7400 v 1260 c 0,0 -585.93,100 -1146.1,100 C 5084.38,8240 4320,7531.2 4320,6248 V 5120 H 3020 V 3640 H 4320 V 62.1992 C 4580.67,21.3008 4847.84,0 5120,0 c 272.16,0 539.33,21.3008 800,62.1992 V 3640 h 1193"></path></g></g></svg>`
            },
            google: {
                svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48" xmlns:xlink="http://www.w3.org/1999/xlink"><path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"></path><path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"></path><path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34A21.991 21.991 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"></path><path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"></path><path fill="none" d="M2 2h44v44H2z"></path></svg>`
            },
            bing: {
                svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" preserveAspectRatio="xMidYMid" viewBox="0 0 256 388"><defs><radialGradient id="bing-a" cx="93.717%" cy="77.818%" r="143.121%" fx="93.717%" fy="77.818%" gradientTransform="matrix(-.65486 -.5438 .75575 -.4712 .963 1.654)"><stop offset="0%" stop-color="#00CACC"/><stop offset="100%" stop-color="#048FCE"/></radialGradient><radialGradient id="bing-b" cx="13.893%" cy="71.448%" r="150.086%" fx="13.893%" fy="71.448%" gradientTransform="matrix(.55155 -.39387 .23634 .91917 -.107 .112)"><stop offset="0%" stop-color="#00BBEC"/><stop offset="100%" stop-color="#2756A9"/></radialGradient><linearGradient id="bing-c" x1="50%" x2="50%" y1="0%" y2="100%"><stop offset="0%" stop-color="#00BBEC"/><stop offset="100%" stop-color="#2756A9"/></linearGradient></defs><path fill="url(#bing-a)" d="M129.424 122.047c-7.133.829-12.573 6.622-13.079 13.928-.218 3.147-.15 3.36 6.986 21.722 16.233 41.774 20.166 51.828 20.827 53.243 1.603 3.427 3.856 6.65 6.672 9.544 2.16 2.22 3.585 3.414 5.994 5.024 4.236 2.829 6.337 3.61 22.818 8.49 16.053 4.754 24.824 7.913 32.381 11.664 9.791 4.86 16.623 10.387 20.944 16.946 3.1 4.706 5.846 13.145 7.04 21.64.468 3.321.47 10.661.006 13.663-1.008 6.516-3.021 11.976-6.101 16.545-1.638 2.43-1.068 2.023 1.313-.939 6.74-8.379 13.605-22.7 17.108-35.687 4.24-15.718 4.817-32.596 1.66-48.57-6.147-31.108-25.786-57.955-53.444-73.06-1.738-.95-8.357-4.42-17.331-9.085a1633 1633 0 0 1-4.127-2.154c-.907-.477-2.764-1.447-4.126-2.154-1.362-.708-5.282-2.75-8.711-4.539l-8.528-4.446a6021 6021 0 0 1-8.344-4.357c-8.893-4.655-12.657-6.537-13.73-6.863-1.125-.343-3.984-.782-4.701-.723-.152.012-.838.088-1.527.168"/><path fill="url(#bing-b)" d="M148.81 277.994c-.493.292-1.184.714-1.537.938-.354.225-1.137.712-1.743 1.083a8315 8315 0 0 0-13.204 8.137 2848 2848 0 0 0-8.07 4.997 388 388 0 0 1-3.576 2.198c-.454.271-2.393 1.465-4.31 2.654a2652 2652 0 0 1-7.427 4.586 3958 3958 0 0 0-8.62 5.316 3011 3011 0 0 1-7.518 4.637c-1.564.959-3.008 1.885-3.21 2.058-.3.257-14.205 8.87-21.182 13.121-5.3 3.228-11.43 5.387-17.705 6.235-2.921.395-8.45.396-11.363.003-7.9-1.067-15.176-4.013-21.409-8.666-2.444-1.826-7.047-6.425-8.806-8.8-4.147-5.598-6.829-11.602-8.218-18.396-.32-1.564-.622-2.884-.672-2.935-.13-.13.105 2.231.528 5.319.44 3.211 1.377 7.856 2.387 11.829 7.814 30.743 30.05 55.749 60.15 67.646 8.668 3.424 17.415 5.582 26.932 6.64 3.576.4 13.699.56 17.43.276 17.117-1.296 32.02-6.334 47.308-15.996 1.362-.86 3.92-2.474 5.685-3.585a877 877 0 0 0 4.952-3.14c.958-.615 2.114-1.341 2.567-1.614a91 91 0 0 0 2.018-1.268c.656-.424 3.461-2.2 6.235-3.944l11.092-7.006 3.809-2.406.137-.086.42-.265.199-.126 2.804-1.771 9.69-6.121c12.348-7.759 16.03-10.483 21.766-16.102 2.392-2.342 5.997-6.34 6.176-6.848.037-.104.678-1.092 1.424-2.197 3.036-4.492 5.06-9.995 6.064-16.484.465-3.002.462-10.342-.005-13.663-.903-6.42-2.955-13.702-5.167-18.339-3.627-7.603-11.353-14.512-22.453-20.076-3.065-1.537-6.23-2.943-6.583-2.924-.168.009-10.497 6.322-22.954 14.03-12.457 7.71-23.268 14.4-24.025 14.87a290 290 0 0 1-2.888 1.764z"/><path fill="url(#bing-c)" d="m.053 241.013.054 53.689.695 3.118c2.172 9.747 5.937 16.775 12.482 23.302 3.078 3.07 5.432 4.922 8.768 6.896 7.06 4.177 14.657 6.238 22.978 6.235 8.716-.005 16.256-2.179 24.025-6.928 1.311-.801 6.449-3.964 11.416-7.029l9.032-5.572v-127.4l-.002-58.273c-.002-37.177-.07-59.256-.188-60.988-.74-10.885-5.293-20.892-12.948-28.461-2.349-2.323-4.356-3.875-10.336-7.99a25160 25160 0 0 1-12.104-8.336L28.617 5.835C22.838 1.85 22.386 1.574 20.639.949 18.367.136 15.959-.163 13.67.084 6.998.804 1.657 5.622.269 12.171.053 13.191.013 26.751.01 100.35l-.003 86.975H0z"/></svg>`
            },
            apple: {
                svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 496.255 608.728"><path d="M273.81 52.973C313.806.257 369.41 0 369.41 0s8.271 49.562-31.463 97.306c-42.426 50.98-90.649 42.638-90.649 42.638s-9.055-40.094 26.512-86.971zM252.385 174.662c20.576 0 58.764-28.284 108.471-28.284 85.562 0 119.222 60.883 119.222 60.883s-65.833 33.659-65.833 115.331c0 92.133 82.01 123.885 82.01 123.885s-57.328 161.357-134.762 161.357c-35.565 0-63.215-23.967-100.688-23.967-38.188 0-76.084 24.861-100.766 24.861C89.33 608.73 0 455.666 0 332.628c0-121.052 75.612-184.554 146.533-184.554 46.105 0 81.883 26.588 105.852 26.588z" fill="#999"/></svg>`
            },
            instagram: {
                svg: `<svg role="img" viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><title>Instagram</title><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.974.974 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.974.974-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.974-.974-1.246-2.242-1.308-3.608C2.175 15.647 2.163 15.267 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.974-.974 2.242-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.332.013 7.052.072 5.775.13 4.602.402 3.635 1.37c-.967.967-1.24 2.14-1.298 3.417C2.013 8.332 2 8.741 2 12c0 3.259.013 3.668.072 4.948.058 1.277.331 2.45 1.298 3.417.967.967 2.14 1.24 3.417 1.298C8.332 23.987 8.741 24 12 24s3.668-.013 4.948-.072c1.277-.058 2.45-.331 3.417-1.298.967-.967 1.24-2.14 1.298-3.417.059-1.28.072-1.689.072-4.948s-.013-3.668-.072-4.948c-.058-1.277-.331-2.45-1.298-3.417-.967-.967-2.14-1.24-3.417-1.298C15.668.013 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998zm6.406-11.845a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z" fill="#E4405F"/></svg>`
            }
        };
        const links = [];
        for (const key of Object.keys(icons)) {
            if (network[key] && network[key].link) {
                links.push(`<a href="${network[key].link}" class="pmt-sl-social-link pmt-sl-social-${key}" target="_blank" rel="noopener" aria-label="${key.charAt(0).toUpperCase() + key.slice(1)}">${icons[key].svg}</a>`);
            }
        }
        if (!links.length) return '';
        return `<div class="pmt-sl-social-links">${links.join('')}</div>`;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }

})();
