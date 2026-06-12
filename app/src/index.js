const express = require('express');
const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 8080;
// Middleware to parse JSON bodies
app.use(express.json());
// Health check endpoint
app.get('/health', (req, res) => {
res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
});
});
// Example API endpoint
app.get('/api/v1/data', (req, res) => {
res.json({
    service: 'devsecops-api',
    status: 'running',
    environment: process.env.NODE_ENV || 'development'
});
});
// Additional routes and middleware can be added here
app.listen(PORT, () => {
console.log(`Server running on port ${PORT}`);
});
// Export the app for testing purposes
module.exports = app;
