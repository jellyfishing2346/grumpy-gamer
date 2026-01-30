// API Configuration
// In development, we use the proxy (empty string uses relative URLs)
// In production, we use the deployed backend URL

const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://grumpy-gamer.onrender.com'
  : '';

export default API_URL;
