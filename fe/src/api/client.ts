export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:8080/api";
export const BACKEND_BASE_URL = (import.meta as any).env?.VITE_BACKEND_URL || "http://localhost:8080";

/**
 * Resolves image URL to point to backend storage if relative
 */
export function resolveImageUrl(url?: string | null): string {
    if (!url) return "";
    if (
        url.startsWith("http://") ||
        url.startsWith("https://") ||
        url.startsWith("blob:") ||
        url.startsWith("data:")
    ) {
        return url;
    }
    if (url.startsWith("/storage/") || url.startsWith("storage/")) {
        const clean = url.startsWith("/") ? url : `/${url}`;
        return `${BACKEND_BASE_URL}${clean}`;
    }
    return url;
}

export function getAdminToken(): string {
    const isAuth = typeof window !== "undefined" && sessionStorage.getItem("models_guide_admin_authenticated") === "true";
    if (!isAuth) return "";
    return localStorage.getItem("models_guide_admin_key") || "admin123";
}

export function getAuthHeaders(): Record<string, string> {
    const token = getAdminToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch<T>(
    endpoint: string,
    options?: RequestInit
): Promise<T> {
    const authHeaders = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...authHeaders,
            ...options?.headers,
        },
    });

    if (!response.ok) {
        let errMsg = `API Error: ${response.status} ${response.statusText}`;
        try {
            const errBody = await response.json();
            if (errBody && errBody.error) {
                errMsg = errBody.error;
            }
        } catch {
            // ignore non-json error responses
        }
        throw new Error(errMsg);
    }

    return response.json();
}