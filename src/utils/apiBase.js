export function getApiBase() {
  // Render production
  if (import.meta.env.PROD) {
    return "https://investing-simulator.onrender.com";
  }

  // Local development via VITE_API_URL when running `npm run dev`
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Fallback for safety in local dev
  return "http://localhost:5000";
}
