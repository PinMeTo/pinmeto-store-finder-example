require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Security headers with helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://maps.googleapis.com"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "https://maps.googleapis.com", "https://public-api.test.pinmeto.com"],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding resources
}));

// Rate limiter for API key endpoint to prevent abuse
const apiKeyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Route for the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route for the landing page
app.get('/landingpage', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'landingpage.html'));
});

// Route for the store locator
app.get('/locator', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'locator.html'));
});

// Serve landingpage-path.html for path parameter deep linking
app.get('/landingpage-path/:storeId', (req, res) => {
  res.sendFile(__dirname + '/public/landingpage-path.html');
});
// Fallback for /landingpage-path (no storeId)
app.get('/landingpage-path', (req, res) => {
  res.sendFile(__dirname + '/public/landingpage-path.html');
});

// API endpoint to get the Google Maps API key (with rate limiting)
app.get('/api/google-maps-key', apiKeyLimiter, (req, res) => {
    // Security: Always validate the API key exists before sending
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.error('GOOGLE_MAPS_API_KEY is not set in environment variables');
        return res.status(500).json({ error: 'API key not configured' });
    }
    res.json({ key: apiKey });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Main page: http://localhost:${port}/`);
    console.log(`Landing page: http://localhost:${port}/landingpage`);
}); 