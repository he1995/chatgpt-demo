import { useUserInfoStore } from "../store/user";

export function fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = useUserInfoStore.getState().userInfo.token;
    return fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'satoken': token,
            ...(options.headers || {})
        }
    });
}