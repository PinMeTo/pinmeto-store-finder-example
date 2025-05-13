# PinMeTo Store Finder & Landing Page

This project provides two main components:
1. A Store Locator with Google Maps integration
2. A Store Landing Page for individual store information

## Prerequisites

- Node.js (v14 or higher)
- Google Maps API key
- PinMeTo API credentials

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd PinMeTo-Store-Finder
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your API keys:
```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
PINMETO_API_KEY=your_pinmeto_api_key
```

## Store Locator

The store locator provides a searchable map interface to find nearby stores.

### Features
- Interactive Google Maps integration
- Store search by location
- Custom marker clustering
- Responsive design
- Customizable store markers
- Info windows with store details

### Usage

1. Include the store locator in your HTML:
```html
<div id="pmt-store-locator-container"></div>
<script src="js/store-locator-google.js"></script>
```

2. Customize the appearance by modifying `public/css/store-locator.css`

3. Configure the store locator by setting options in the JavaScript:
```javascript
window.PMT_STORE_LOCATOR_CONFIG = {
    apiUrl: 'your-api-endpoint',
    defaultZoom: 12,
    maxResults: 20,
    useCustomMarkers: true
};
```

## Store Landing Page

The landing page displays detailed information about a specific store.

### Features
- Store details (address, phone, opening hours)
- Interactive Google Maps integration
- Special opening hours/exceptions
- Store concepts/services
- Responsive design
- Font Awesome icons

### Usage

1. Include the landing page in your HTML:
```html
<div id="pmt-store-landing-page-container"></div>
<script src="js/simple-landing-page-google.js"></script>
```

2. Customize the appearance by modifying `public/css/simple-landing-page.css`

3. Access a specific store by adding the store ID to the URL:
```
your-domain.com/landingpage.html?storeId=123
```

### Available Store Information
- Store name
- Address and location
- Phone number
- Regular opening hours
- Special opening hours/exceptions
- Store concepts/services
- Interactive map with directions

## API Integration

### Store Locator API
The store locator expects the API to return store data in the following format:
```json
{
    "stores": [
        {
            "storeId": "string",
            "name": "string",
            "address": {
                "street": "string",
                "city": "string",
                "postalCode": "string",
                "country": "string"
            },
            "location": {
                "lat": "number",
                "lon": "number"
            },
            "contact": {
                "phone": "string"
            }
        }
    ]
}
```

### Landing Page API
The landing page expects the API to return store data in the following format:
```json
{
    "storeId": "string",
    "name": "string",
    "address": {
        "street": "string",
        "city": "string",
        "postalCode": "string",
        "country": "string"
    },
    "location": {
        "lat": "number",
        "lon": "number"
    },
    "contact": {
        "phone": "string"
    },
    "openHours": {
        "mon": { "state": "string", "span": [{ "open": "string", "close": "string" }] },
        "tue": { "state": "string", "span": [{ "open": "string", "close": "string" }] },
        "wed": { "state": "string", "span": [{ "open": "string", "close": "string" }] },
        "thu": { "state": "string", "span": [{ "open": "string", "close": "string" }] },
        "fri": { "state": "string", "span": [{ "open": "string", "close": "string" }] },
        "sat": { "state": "string", "span": [{ "open": "string", "close": "string" }] },
        "sun": { "state": "string", "span": [{ "open": "string", "close": "string" }] }
    },
    "specialOpenHours": [
        {
            "start": "string",
            "label": "string",
            "open": "string",
            "close": "string"
        }
    ],
    "concepts": ["string"],
    "customData": {
        "services_list": ["string"]
    }
}
```

## Customization

### CSS Customization
Both components use scoped CSS to prevent style leakage. You can customize the appearance by modifying:
- `public/css/store-locator.css` for the store locator
- `public/css/simple-landing-page.css` for the landing page

### Icon Customization
The components use Font Awesome icons. You can change icons by modifying the icon classes in the JavaScript files.

### Map Customization
The Google Maps integration can be customized by modifying the map options in the JavaScript files.

## Security

- Google Maps API key is fetched securely from the server
- API endpoints are protected
- All user inputs are sanitized
- CORS is properly configured

## Browser Support

The components support all modern browsers:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.