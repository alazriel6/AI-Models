const API_BASE_URL = "http://localhost:8080/api";

export async function apiFetch<T>(
    endpoint: string,
    options?: RequestInit
): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
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