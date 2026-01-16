export interface User {
    _id: string;
    email: string;
    nickname?: string;
    isAdmin: boolean;
    isBlocked?: boolean;
    createdAt?: string;
    // Add other fields as needed
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    message: string;
}

export interface DecodedToken {
    userId: string;
    email: string;
    isAdmin: boolean;
    exp: number;
    iat: number;
}
