require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

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

// Serve landingpage-path.html for path parameter deep linking
app.get('/landingpage-path/:storeId', (req, res) => {
  res.sendFile(__dirname + '/public/landingpage-path.html');
});
// Fallback for /landingpage-path (no storeId)
app.get('/landingpage-path', (req, res) => {
  res.sendFile(__dirname + '/public/landingpage-path.html');
});

// API endpoint to get the Google Maps API key
app.get('/api/google-maps-key', (req, res) => {
    res.json({ key: process.env.GOOGLE_MAPS_API_KEY });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Main page: http://localhost:${port}/`);
    console.log(`Landing page: http://localhost:${port}/landingpage`);
}); 