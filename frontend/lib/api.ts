import axios from 'axios';

// Build the base URL – prefer IPv4 (127.0.0.1) when running locally to avoid IPv6 resolution issues.
const getBaseUrl = () => {
  // Always prefer the env variable if set (works both in browser and SSR via Next.js)
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    // Force IPv4 for localhost to guarantee the request hits the FastAPI server.
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://127.0.0.1:8001';
    return `http://${hostname}:8001`;
  }
  // Fallback for non‑browser environments (e.g., tests, SSR)
  return 'http://127.0.0.1:8001';
};

export const API_BASE_URL = getBaseUrl();

// Centralised axios instance with JSON payloads – FastAPI expects JSON for most endpoints.
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // keep cookies / auth tokens across domains if needed
});

// Export a simple config for legacy imports (if any parts of the app still reference it).
export const apiConfig = {
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
};
