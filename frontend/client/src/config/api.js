// API Configuration for Chat App
const API_BASE_URL = import.meta.env.PROD
    ? 'https://chat-app-production-d76e.up.railway.app'
    : 'http://localhost:5000';

export { API_BASE_URL };