// server/index.js
require('dotenv').config({ path: '../.env' }); // Reaches out to the root .env
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware (The "Rules" of the server)
app.use(cors()); // Allows your React app to talk to this server
app.use(express.json()); // Allows the server to read JSON data

// A simple "Ping" route to test the connection
app.get('/api/ping', (req, res) => {
    res.json({ message: "The server is alive and healthy! " });
});

app.listen(PORT, () => {
    console.log(` Server is running on http://localhost:${PORT}`);
});