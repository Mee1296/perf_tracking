import axios from "axios";

const api = axios.create({
    // Uses Nginx proxy in Docker; override with VITE_API_URL for local dev
    baseURL: import.meta.env.VITE_API_URL || "",
});

export default api;
