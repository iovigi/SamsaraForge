import { API_BASE_URL } from './config';

export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    let token = localStorage.getItem('token'); // This is now accessToken

    // Ensure url is absolute or relative to base
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

    // 1. Initial Request
    let res = await fetch(fullUrl, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
    });

    // 2. If 401, try to refresh
    if (res.status === 401) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            // No refresh token? Force login.
            window.location.href = '/auth/login';
            return res;
        }

        try {
            // Request new Access Token
            const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            if (refreshRes.ok) {
                const data = await refreshRes.json();
                token = data.accessToken;
                localStorage.setItem('token', token); // Update storage

                // 3. Retry Original Request with NEW Token
                res = await fetch(fullUrl, {
                    ...options,
                    headers: {
                        ...options.headers,
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    }
                });
            } else {
                // Refresh failed (expired/invalid) -> Logout
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                window.location.href = '/auth/login';
            }
        } catch (err) {
            // Network/Server error during refresh
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            window.location.href = '/auth/login';
        }
    }

    return res;
};
