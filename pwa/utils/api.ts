import { API_BASE_URL } from './config';
export { API_BASE_URL };

export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    let token = localStorage.getItem('token'); // This is now accessToken

    // Ensure url is absolute or relative to base
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

    // 1. Initial Request
    let res = await fetch(fullUrl, {
        ...options,
        cache: 'no-store', // Ensure fresh data
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
                if (token) {
                    localStorage.setItem('token', token); // Update storage
                }

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

export function parseJwt(token: string) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

export const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    if (res.ok) {
        return res.json();
    }
    throw new Error('Upload failed');
};
