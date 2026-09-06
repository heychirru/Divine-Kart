import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Request interceptor - Add auth token to requests
// IMPORTANT: Only inject the regular user token if no Authorization header has
// already been set by the caller (e.g. vendor requests set their own token).
api.interceptors.request.use(
    (config) => {
        const alreadyHasAuth = !!config.headers?.Authorization;
        if (!alreadyHasAuth) {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Handle errors and token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // Vendor session expired — redirect to vendor login (not regular login)
            if (error.response?.data?.vendorTokenExpired) {
                localStorage.removeItem('vendor-token');
                window.location.href = '/login';
                return Promise.reject(error);
            }

            try {
                // Try to refresh regular user token
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    const { data } = await axios.post(
                        `${import.meta.env.VITE_API_URL}/api/users/refresh-token`,
                        { refreshToken }
                    );

                    localStorage.setItem('token', data.token);

                    originalRequest.headers.Authorization = `Bearer ${data.token}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
