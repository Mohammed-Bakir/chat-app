// API Configuration for Chat App
const API_BASE_URL = import.meta.env.PROD
    ? 'https://chat-app-backend-production.up.railway.app'
    : 'http://localhost:5000';

export { API_BASE_URL };