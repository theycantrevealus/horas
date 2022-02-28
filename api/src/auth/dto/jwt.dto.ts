export interface JWTTokenResponse {
    status: number;
    user: string;
    token: string | null;
    message: string;
}

export interface JWTTokenDecodeResponse {
    status: number;
    token: string | null;
    user: string;
    message: string;
}
