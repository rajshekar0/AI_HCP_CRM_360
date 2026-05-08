const LOCAL_API_URL = "http://127.0.0.1:8000";
const DEPLOYED_API_URL = "https://ai-first-crm-backend-mcfd.onrender.com";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? LOCAL_API_URL
    : DEPLOYED_API_URL);