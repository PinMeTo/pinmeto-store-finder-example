(async function () {
    // --- Configuration --- 
    const rootElementId = 'pmt-store-locator-root';
    const URL_PARAM_NAME = 'storeId'; // URL parameter for deep linking
    const LANDING_PAGE_URL = 'landingpage.html'; // Target page for the link
    // MODIFIED API_URL
    const API_URL = "https://public-api.test.pinmeto.com/pinmeto/abc123/locations.json";
    let GOOGLE_MAPS_API_KEY = null; // Initialize as null
    const INLINE_CSS_PATH = '/css/simple-store-locator.css'; // Path to the extracted CSS
    
    // --- Fallback Reference Location (Malmö, Sweden) ---
    const FALLBACK_USER_LAT = 55.60498;
    const FALLBACK_USER_LON = 13.00382;

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
    let markerClusterer = null; // Will hold the MarkerClusterer instance

    // --- DOM Element References ---
    let rootElement = null;
    let searchInputElement = null;
    let listContainerElement = null;
    let mapContainerElement = null;
    let footerElement = null;
    
    // --- Translation Helper ---
    function t(key, replacements = {}) {
        let text = translations[key] || key;
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
    function formatOpeningHours(openHoursData) {
        if (!openHoursData || typeof openHoursData !== 'object') return t('fallbackHours');

        const now = new Date();
        const dayIndex = now.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
        const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const currentDayKey = dayMap[dayIndex];

        const dayInfo = openHoursData[currentDayKey];

        if (!dayInfo || dayInfo.state === 'Closed' || !dayInfo.span || dayInfo.span.length === 0) {
            return t('hoursClosed');
        }

        const firstSpan = dayInfo.span[0];
        if (firstSpan && firstSpan.open && firstSpan.close) {
            const formatTime = (timeStr) => timeStr.slice(0, 2) + ":" + timeStr.slice(2);
            return `${formatTime(firstSpan.open)} - ${formatTime(firstSpan.close)}`;
        }
        return t('hoursUnavailable');
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

        const leftPanel = document.createElement('div'); leftPanel.className = "pmt-sl-left-panel";
        const header = document.createElement('header'); header.className = "pmt-sl-header"; header.innerHTML = `<h1>${t('appTitle')}</h1>`;
        const searchArea = document.createElement('div'); searchArea.className = "pmt-sl-search-area";
        searchInputElement = document.createElement('input'); searchInputElement.type = "text"; searchInputElement.placeholder = t('searchPlaceholder'); searchInputElement.setAttribute("aria-label", t('searchAriaLabel')); searchInputElement.className = "pmt-sl-search-input";
        searchInputElement.disabled = isLoading;
        searchInputElement.addEventListener('input', handleSearchInput);
        searchArea.appendChild(searchInputElement);
        listContainerElement = document.createElement('div'); listContainerElement.className = "pmt-sl-list-container"; listContainerElement.id = "pmt-store-list-container";
        footerElement = document.createElement('footer'); footerElement.className = "pmt-sl-footer"; updateFooter();
        leftPanel.append(header, searchArea, listContainerElement, footerElement);

        const rightPanel = document.createElement('div'); rightPanel.className = "pmt-sl-right-panel";
        mapContainerElement = document.createElement('div'); mapContainerElement.className = "pmt-sl-map-container"; mapContainerElement.id = "pmt-map-container"; // Google Maps will use this ID
        rightPanel.appendChild(mapContainerElement);

        rootElement.append(leftPanel, rightPanel);
        console.log("PMT Store Locator: Initial layout rendered.");
    }    

    function renderStoreList() {
        if (!listContainerElement) return;
        listContainerElement.innerHTML = '';

        if (isLoading) { listContainerElement.innerHTML = `<div class="pmt-loader"></div>`; return; }
        if (error) { listContainerElement.innerHTML = `<p class="pmt-sl-error-text">${t('errorLoadingStores', { error: error })}</p>`; return; }
        if (!filteredStores || filteredStores.length === 0) { listContainerElement.innerHTML = `<p class="pmt-sl-muted-text">${t('noStoresFound')}</p>`; return; }

        const listFragment = document.createDocumentFragment();
        filteredStores.forEach(store => {
            const isSelected = store.id === selectedStoreId;
            const itemDiv = document.createElement('div');
            itemDiv.id = `pmt-store-item-${store.id}`;
            itemDiv.className = `pmt-store-list-item ${isSelected ? 'selected' : ''}`;
            const detailsLinkUrl = `${LANDING_PAGE_URL}?${URL_PARAM_NAME}=${encodeURIComponent(store.id)}`;
            let directionsLinkHtml = '';
            if (store.lat != null && store.lng != null) {
                const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`;
                directionsLinkHtml = `<a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" class="pmt-sl-directions-link">${t('getDirections')}</a>`;
            }
            let phoneHtml;
            const rawPhone = store.phone;
            if (rawPhone && rawPhone !== t('fallbackPhone')) {
                const cleanedPhone = cleanPhoneNumber(rawPhone);
                phoneHtml = `<a href="tel:${cleanedPhone}" class="pmt-sl-phone-link">${rawPhone}</a>`;
            } else {
                phoneHtml = t('fallbackPhone');
            }
            const addressParts = [];
            const streetAddress = store.address; // Already formatted by formatAddress
            if (streetAddress && streetAddress !== t('fallbackAddress') && streetAddress !== t('fallbackAddressMissing')) { addressParts.push(streetAddress); }
            if (store.city) { addressParts.push(store.city); }
            let addressCityString = addressParts.join(', ');
            if (store.zip) { addressCityString += (addressCityString ? `, ${store.zip}` : store.zip); }
            if (!addressCityString) { addressCityString = t('fallbackAddress');}
            let distanceHtml = '';
            if (store.distance != null) { distanceHtml = `<p><span>${t('distanceLabel')}</span> ${store.distance.toFixed(1)} km</p>`; }

            itemDiv.innerHTML = `
                <div class="pmt-store-list-item-header"><h3>${store.name || t('fallbackStoreName')}</h3></div>
                <div class="pmt-store-list-item-content">
                   <p>${addressCityString}</p>
                   ${distanceHtml}
                   <p><span>${t('phoneLabel')}</span> ${phoneHtml}</p>
                   <p><span>${t('hoursLabel')}</span> ${store.hours || t('fallbackHours')}</p>
                   <div class="pmt-sl-item-links">
                       <a href="${detailsLinkUrl}" rel="noopener noreferrer" class="pmt-sl-details-link">${t('storeDetails')}</a>
                       ${directionsLinkHtml}
                   </div>
                </div>`;
            itemDiv.addEventListener('click', (event) => {
                if (event.target.closest('a')) return;
                handleSelection(store.id);
            });
            listFragment.appendChild(itemDiv);
        });
        listContainerElement.appendChild(listFragment); 
        updateFooter(); 
        if (initialStoreIdFromUrl && selectedStoreId === initialStoreIdFromUrl) { scrollListIfNeeded(); }
    }
    
    function updateFooter() {
        if (!footerElement) return;
        const storeCountText = !isLoading && !error ? t('storesFound', { count: filteredStores.length }) : (isLoading ? t('loading') : ' ');
        footerElement.textContent = `${storeCountText} ${t(locationStatusMessageKey)}`;
    }
    
    function scrollListIfNeeded() { if (selectedStoreId && listContainerElement) { const e = document.getElementById(`pmt-store-item-${selectedStoreId}`); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }); } }

    // --- Google Maps Functions ---
    function initializeMap() {
        if (!mapContainerElement || mapInstance || typeof google === 'undefined' || typeof google.maps === 'undefined' || typeof google.maps.marker === 'undefined') {
             console.warn("PMT SL: Google Maps SDK (with marker lib) not ready or map container not found.");
            return;
        }
        try {
            console.log("PMT SL: Init Google Map");
            mapInstance = new google.maps.Map(mapContainerElement, { // Using fallback location
                center: { lat: currentUserLat, lng: currentUserLon }, // Use current user location or fallback
                zoom: 5, // Default zoom, will be adjusted by fitBounds or handleMapSelection
                mapId: "PMT_STORE_LOCATOR_MAP_ID", // Recommended for Advanced Markers
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false
            });
            infoWindow = new google.maps.InfoWindow();
            console.log("PMT SL: Google Map OK");
        } catch (e) {
            console.error("PMT SL: Google MapInit Err", e);
            mapContainerElement.innerHTML = `<p class="pmt-sl-error-text">${t('errorInitializingMap')}</p>`;
        }       
    }

    function updateMapMarkers() {
        if (!mapInstance || typeof google === 'undefined' || typeof google.maps === 'undefined' || typeof google.maps.marker === 'undefined') return;
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
                        
                        const marker = new google.maps.marker.AdvancedMarkerElement({
                            position: position,
                            map: mapInstance,
                            title: store.name || t('popupStoreNameDefault'),
                        });

                        // Add click listener to the marker
                        marker.addListener('click', () => {
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
                mapInstance.fitBounds(bounds, 50);
            }
        } else {
            mapInstance.setCenter({ lat: currentUserLat, lng: currentUserLon });
            mapInstance.setZoom(5);
        }
    }
    
    function handleMapSelection() {
        if (!mapInstance || typeof google === 'undefined' || typeof google.maps === 'undefined' || !selectedStoreId) {
            if (infoWindow) infoWindow.close();
            return;
        }
        const marker = mapMarkers[selectedStoreId];
        const store = filteredStores.find(s => s.id === selectedStoreId);
       
        if (marker && store) {
            try {
                mapInstance.panTo(marker.position); 
                mapInstance.setZoom(14);
                infoWindow.close(); 
                infoWindow.setContent(`<b>${store.name || t('popupStoreNameDefault')}</b><br>${store.address || t('popupAddressDefault')}`);
                infoWindow.open({ anchor: marker, map: mapInstance });
            } catch (e) {
                console.error("PMT SL: Google Map PanTo/Zoom Err", e);
            }
        } else {
            console.warn(`PMT SL: Google Map Advanced Marker not found for store ${selectedStoreId}`);
            if (infoWindow) infoWindow.close();
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
    async function fetchAndProcessStores(currentLat, currentLon) { // currentLat, currentLon are passed here
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
                if (latitude != null && longitude != null && currentLat != null && currentLon != null) {
                    distanceKm = calculateDistance(currentLat, currentLon, latitude, longitude);
                }
                return {
                    id: storeIdentifier,
                    name: s.locationDescriptor && String(s.locationDescriptor).trim() !== ''
                          ? `${s.name || t('fallbackStoreName')} (${s.locationDescriptor.trim()})` : s.name || t('fallbackStoreName'),
                    address: formatAddress(s.address),
                    city: s.address?.city || '', 
                    zip: s.address?.zip || '', 
                    phone: s.contact?.phone || t('fallbackPhone'),
                    hours: formatOpeningHours(s.openHours), 
                    lat: latitude,
                    lng: longitude,
                    distance: distanceKm
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
            await fetchTranslations(`locales/${currentLanguage}.json`); 

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
            } catch (geoError) {
                console.warn(`PMT Store Locator: Geolocation failed - ${geoError.message}. Using fallback: ${t(locationStatusMessageKey)}`);
                // currentUserLat and currentUserLon retain their fallback values
            }

            const urlParams = new URLSearchParams(window.location.search);
            initialStoreIdFromUrl = urlParams.get(URL_PARAM_NAME);
            if (initialStoreIdFromUrl) {
                console.log(`PMT Store Locator: Found initial store code from URL: ${initialStoreIdFromUrl}`);
                selectedStoreId = initialStoreIdFromUrl; 
            }

            loadCSS(INLINE_CSS_PATH);
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
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }

})();
