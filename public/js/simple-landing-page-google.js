(async function() { // Changed to async IIFE
    // --- Configuration ---

    const API_URL = 'https://public-api.test.pinmeto.com/pinmeto/abc123/locations.json';
    let GOOGLE_MAPS_API_KEY = null; // Initialize as null
    const WEEKDAYS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const DAY_KEYS_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    const DEFAULT_STORE_CODE = '1337';
    const NO_EXCEPTIONS_MESSAGE = "No special opening hours";
    const rootElementId = window.PMT_LANDING_PAGE_ROOT_ID || 'pmt-store-landing-page-container';

    // --- DOM Elements Reference ---

    let domElements = {};

    // --- Map Instance Variable ---

    let mapInstance = null; // Will hold the Google Map instance

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
    container.appendChild(elements.storeNameEl);

    // Create Message Box (fixed position, initially hidden)
    elements.messageBoxEl = document.createElement('div');
    elements.messageBoxEl.id = 'pmt-message-box';
    elements.messageBoxEl.style.display = 'none';
    container.appendChild(elements.messageBoxEl);

    // Create Store Details container (initially hidden)
    elements.storeDetailsEl = document.createElement('div');
    elements.storeDetailsEl.id = 'pmt-store-details';
    elements.storeDetailsEl.className = 'pmt-hidden';
    container.appendChild(elements.storeDetailsEl);

    // --- Address & Map Section ---
    const addressMapSection = document.createElement('section');
    addressMapSection.id = 'pmt-address-map-section';
    elements.storeDetailsEl.appendChild(addressMapSection);

    const addressMapH2 = document.createElement('h2');
    addressMapH2.innerHTML = '<i class="fa-solid fa-location-dot"></i> Address & Location';
    addressMapSection.appendChild(addressMapH2);

    const addressMapContainer = document.createElement('div');
    addressMapContainer.className = 'pmt-address-map-container';
    addressMapSection.appendChild(addressMapContainer);

    elements.storeAddressContainerEl = document.createElement('div');
    elements.storeAddressContainerEl.id = 'pmt-store-address-container';
    addressMapContainer.appendChild(elements.storeAddressContainerEl);

    elements.storeAddressEl = document.createElement('p');
    elements.storeAddressEl.id = 'pmt-store-address';
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
    elements.storeDirectionsLinkEl.innerHTML = '<i class="fa-solid fa-location-arrow"></i> Get Directions';
    elements.directionsParagraphEl.appendChild(elements.storeDirectionsLinkEl);

    elements.storeMapWrapperEl = document.createElement('div');
    elements.storeMapWrapperEl.id = 'pmt-store-map-wrapper';
    elements.storeMapWrapperEl.className = 'pmt-hidden';
    addressMapContainer.appendChild(elements.storeMapWrapperEl);

    elements.storeMapEl = document.createElement('div');
    elements.storeMapEl.id = 'pmt-store-map';
    elements.storeMapWrapperEl.appendChild(elements.storeMapEl);

    // --- Phone Section (initially hidden) ---
    elements.phoneSectionEl = document.createElement('section');
    elements.phoneSectionEl.id = 'pmt-phone-section';
    elements.phoneSectionEl.className = 'pmt-hidden';
    elements.storeDetailsEl.appendChild(elements.phoneSectionEl);

    const phoneH2 = document.createElement('h2');
    phoneH2.innerHTML = '<i class="fa-solid fa-phone"></i> Phone';
    elements.phoneSectionEl.appendChild(phoneH2);

    elements.storePhoneEl = document.createElement('p');
    elements.storePhoneEl.id = 'pmt-store-phone';
    elements.phoneSectionEl.appendChild(elements.storePhoneEl);

    // --- Opening Hours Section ---
    const openingHoursSection = document.createElement('section');
    elements.storeDetailsEl.appendChild(openingHoursSection);

    const openingHoursH2 = document.createElement('h2');
    openingHoursH2.innerHTML = '<i class="fa-regular fa-clock"></i> Opening Hours';
    openingHoursSection.appendChild(openingHoursH2);

    elements.storeOpeningHoursEl = document.createElement('ul');
    elements.storeOpeningHoursEl.id = 'pmt-store-opening-hours';
    openingHoursSection.appendChild(elements.storeOpeningHoursEl);

    // --- Exceptions Section ---
    elements.exceptionsSectionEl = document.createElement('section');
    elements.exceptionsSectionEl.id = 'pmt-exceptions-section';
    elements.storeDetailsEl.appendChild(elements.exceptionsSectionEl);

    const exceptionsH2 = document.createElement('h2');
    exceptionsH2.innerHTML = '<i class="fa-regular fa-calendar-check"></i> Special Opening Hours';
    elements.exceptionsSectionEl.appendChild(exceptionsH2);

    elements.storeExceptionsEl = document.createElement('ul');
    elements.storeExceptionsEl.id = 'pmt-store-exceptions';
    elements.exceptionsSectionEl.appendChild(elements.storeExceptionsEl);

    // --- Concepts Section (initially hidden) ---
    elements.conceptsSectionEl = document.createElement('section');
    elements.conceptsSectionEl.id = 'pmt-concepts-section';
    elements.conceptsSectionEl.className = 'pmt-hidden';
    elements.storeDetailsEl.appendChild(elements.conceptsSectionEl);

    const conceptsH2 = document.createElement('h2');
    conceptsH2.id = 'pmt-concepts-heading';
    conceptsH2.innerHTML = 'Concepts';
    elements.conceptsSectionEl.appendChild(conceptsH2);

    elements.storeConceptsEl = document.createElement('div');
    elements.storeConceptsEl.id = 'pmt-store-concepts';
    elements.storeConceptsEl.className = 'pmt-concepts-container';
    elements.conceptsSectionEl.appendChild(elements.storeConceptsEl);

    // --- Loading State ---
    elements.loadingStateEl = document.createElement('div');
    elements.loadingStateEl.id = 'pmt-loading-state';
    container.appendChild(elements.loadingStateEl);

    elements.loadingMessageEl = document.createElement('p');
    elements.loadingMessageEl.id = 'pmt-loading-message';
    elements.loadingMessageEl.textContent = 'Fetching store data...';
    elements.loadingStateEl.appendChild(elements.loadingMessageEl);

    const loadingIndicator = document.createElement('p');
    loadingIndicator.textContent = 'Loading...'; // Basic loader
    elements.loadingStateEl.appendChild(loadingIndicator);

    // --- Error State (initially hidden) ---
    elements.errorStateEl = document.createElement('div');
    elements.errorStateEl.id = 'pmt-error-state';
    elements.errorStateEl.className = 'pmt-hidden';
    container.appendChild(elements.errorStateEl);

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
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=marker&callback=pmtLandingPageGoogleMapsLoaded`;
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
    const image = store.imageUrl || 'https://yourdomain.com/images/store-default.jpg'; // fallback
    const url = window.location.href;
    const canonicalUrl = url.split(/[?#]/)[0] + window.location.search;
    const description = `Visit ${storeName}${city ? ' in ' + city : ''}. Find opening hours, address, phone number, and services. Get directions and more information about our store.`;
    const title = `${storeName}${city ? ' – ' + city : ''} | Opening Hours, Address & Contact`;

    // Opening hours for JSON-LD
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
        "url": url
    });
}

// --- Display Logic ---

async function displayStoreDetails(store, currentDomElements) { // Changed to async
    const {
        storeNameEl, storeDetailsEl, storeAddressEl,
        directionsParagraphEl, storeDirectionsLinkEl, phoneSectionEl, storePhoneEl,
        storeOpeningHoursEl, exceptionsSectionEl, storeExceptionsEl, conceptsSectionEl,
        storeConceptsEl, loadingStateEl, errorStateEl, storeMapWrapperEl, storeMapEl
    } = currentDomElements;

    console.log("Store data received:", store);

    if (storeNameEl) storeNameEl.textContent = store.name || 'Store name missing';

    if (storeAddressEl) {
        let addressParts = [];
        if (store.address?.street) addressParts.push(store.address.street);
        if (store.address?.city) addressParts.push(store.address.city);
        if (store.address?.postalCode) addressParts.push(store.address.postalCode);
        if (store.address?.country) addressParts.push(store.address.country);
        storeAddressEl.textContent = addressParts.length > 0 ? addressParts.join(', ') : 'Address details missing.';
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
            showMessage('Could not load map SDK.', 'error');
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
                showMessage('Could not display map.', 'error');
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
            storeOpeningHoursEl.innerHTML = '<li>No regular opening hours specified.</li>';
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
            li.textContent = NO_EXCEPTIONS_MESSAGE;
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

    if (storeDetailsEl) storeDetailsEl.classList.remove('pmt-hidden');
    if (loadingStateEl) loadingStateEl.classList.add('pmt-hidden');
    if (errorStateEl) errorStateEl.classList.add('pmt-hidden');
    showMessage(`Displaying information for ${store.name}`, 'success', 2000);

    // In displayStoreDetails, at the very start, add:
    updateMetaTags(store);
}

// --- Data Fetching Logic ---

async function loadStoreData(storeCode, currentDomElements) {
     const {
        storeNameEl, storeDetailsEl, loadingStateEl, loadingMessageEl,
        errorStateEl, errorMessageEl, storeMapWrapperEl, directionsParagraphEl
    } = currentDomElements;

    const urlParams = new URLSearchParams(window.location.search);
    let storeId = urlParams.get('storeId');
    let isDefault = false;

    if (!storeId) {
        storeId = DEFAULT_STORE_CODE;
        isDefault = true;
        console.log(`No storeId in URL, using default: ${storeId}`);
    }

    if (loadingMessageEl) loadingMessageEl.textContent = `Fetching data for store ${storeId}${isDefault ? ' (default)' : ''}...`;
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

        const selectedStore = stores.find(store => store.storeId?.toLowerCase() === storeId.toLowerCase());

        if (selectedStore) {
            // displayStoreDetails is now async but we don't necessarily need to await it here
            // if we don't have follow-up actions dependent on its completion within this function.
            displayStoreDetails(selectedStore, currentDomElements);
        } else {
            const errorMsg = isDefault
                ? `Default store with ID "${storeId}" not found in API response.`
                : `Store with ID "${storeId}" not found.`;
            throw new Error(errorMsg);
        }

    } catch (error) {
        console.error('Error loading store data:', error);
        if (storeNameEl) storeNameEl.textContent = 'Error Loading Store';
        if (loadingStateEl) loadingStateEl.classList.add('pmt-hidden');
        if (errorStateEl) {
            errorStateEl.classList.remove('pmt-hidden');
            if (errorMessageEl) errorMessageEl.textContent = error.message || 'Could not load store data.';
            const errorDetailEl = errorStateEl.querySelector('p:last-child');
            if (errorDetailEl) {
                errorDetailEl.textContent = isDefault
                    ? 'The default store could not be found. Check the API or the default store ID.'
                    : 'Check the store code in the URL or try again later.';
            }
        }
        showMessage('An error occurred while fetching store data.', 'error');
    }
}

// --- Initialization ---

async function initializeApp() { // Changed to async
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
        showMessage("Map service failed to load. Store map will not be available.", "error", 5000);
        // Optionally, you could hide map-related elements here or set a flag
        if (domElements.storeMapWrapperEl) domElements.storeMapWrapperEl.style.display = 'none';
    }


    const urlParams = new URLSearchParams(window.location.search);
    const storeIdFromUrl = urlParams.get('storeId');
    // loadStoreData is async but we don't need to await it if initializeApp has no further direct dependencies on its completion.
    loadStoreData(storeIdFromUrl, domElements); 
}

const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'css/simple-landing-page.css'; // Ensure this path is correct
document.head.appendChild(link);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

})();
