import axios from "axios";
import { getMockData } from "./mockData";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "",
    timeout: 10000, // 10 seconds timeout for Render cold start
});

// Mock data in case backend is down
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isNetworkError = !error.response || error.code === "ERR_NETWORK";
        const isServerError = error.response && error.response.status >= 500;

        if (isNetworkError || isServerError) {
            console.warn("[API Fallback] Backend seems to be down. Using mock data...");

            let requestData = {};
            try {
                requestData = error.config.data ? JSON.parse(error.config.data) : {};
            } catch (e) {
                requestData = error.config.data;
            }

            const mockResponse = getMockData(error.config.url, error.config.method, requestData);
            if (mockResponse) {
                console.log("[API Fallback] Mock path:", error.config.url);
                return Promise.resolve(mockResponse);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
