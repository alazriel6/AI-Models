export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:8080/api";
export const BACKEND_BASE_URL = (import.meta as any).env?.VITE_BACKEND_URL || "http://localhost:8080";

let backendOffline = false;

export function isBackendOffline(): boolean {
    return backendOffline;
}

export function setBackendOffline(val: boolean): void {
    if (backendOffline !== val) {
        backendOffline = val;
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("mg-backend-status", { detail: { offline: val } }));
        }
    }
}

/**
 * Resolves image URL to point to backend storage if relative
 */
export function resolveImageUrl(url?: string | null): string {
    if (!url) return "";
    let finalUrl = url;
    if (url.startsWith("/storage/") || url.startsWith("storage/")) {
        const clean = url.startsWith("/") ? url : `/${url}`;
        finalUrl = `${BACKEND_BASE_URL}${clean}`;
    }
    // Automatically optimize heavy raw Civitai downloads to compressed width
    if (finalUrl.includes("image.civitai.com") && finalUrl.includes("/original=true/")) {
        finalUrl = finalUrl.replace("/original=true/", "/width=450/");
    }
    return finalUrl;
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
    try {
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

        setBackendOffline(false);
        return response.json();
    } catch (err) {
        setBackendOffline(true);
        throw err;
    }
}

export function apiGet<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return apiFetch<T>(endpoint, { ...options, method: "GET" });
}

export function apiPost<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return apiFetch<T>(endpoint, {
        ...options,
        method: "POST",
        body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
    });
}

export function apiPut<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return apiFetch<T>(endpoint, {
        ...options,
        method: "PUT",
        body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
    });
}

export function apiDelete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return apiFetch<T>(endpoint, { ...options, method: "DELETE" });
}
