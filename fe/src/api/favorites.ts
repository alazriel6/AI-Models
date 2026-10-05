import { useState, useEffect, useCallback } from "react";

const FAVORITE_MODELS_KEY = "models_guide_favorite_models";
const FAVORITE_IMAGES_KEY = "models_guide_favorite_images";
const FAVORITES_CHANGED_EVENT = "models_guide_favorites_changed";

function getStoredList(key: string): string[] {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
        return [];
    }
}

function setStoredList(key: string, list: string[]) {
    try {
        localStorage.setItem(key, JSON.stringify(list));
        window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
    } catch (e) {
        console.error("Failed to persist favorites to localStorage:", e);
    }
}

export function isModelFavorited(id: string | number): boolean {
    const list = getStoredList(FAVORITE_MODELS_KEY);
    return list.includes(String(id));
}

export function toggleFavoriteModel(id: string | number): boolean {
    const strId = String(id);
    const list = getStoredList(FAVORITE_MODELS_KEY);
    let next: string[];
    let newState = false;

    if (list.includes(strId)) {
        next = list.filter((item) => item !== strId);
        newState = false;
    } else {
        next = [...list, strId];
        newState = true;
    }

    setStoredList(FAVORITE_MODELS_KEY, next);
    return newState;
}

export function isImageFavorited(id: number | string): boolean {
    const list = getStoredList(FAVORITE_IMAGES_KEY);
    return list.includes(String(id));
}

export function toggleFavoriteImage(id: number | string): boolean {
    const strId = String(id);
    const list = getStoredList(FAVORITE_IMAGES_KEY);
    let next: string[];
    let newState = false;

    if (list.includes(strId)) {
        next = list.filter((item) => item !== strId);
        newState = false;
    } else {
        next = [...list, strId];
        newState = true;
    }

    setStoredList(FAVORITE_IMAGES_KEY, next);
    return newState;
}

export function useFavorites() {
    const [favModels, setFavModels] = useState<string[]>(() => getStoredList(FAVORITE_MODELS_KEY));
    const [favImages, setFavImages] = useState<string[]>(() => getStoredList(FAVORITE_IMAGES_KEY));

    const syncFavorites = useCallback(() => {
        setFavModels(getStoredList(FAVORITE_MODELS_KEY));
        setFavImages(getStoredList(FAVORITE_IMAGES_KEY));
    }, []);

    useEffect(() => {
        window.addEventListener(FAVORITES_CHANGED_EVENT, syncFavorites);
        window.addEventListener("storage", syncFavorites);
        return () => {
            window.removeEventListener(FAVORITES_CHANGED_EVENT, syncFavorites);
            window.removeEventListener("storage", syncFavorites);
        };
    }, [syncFavorites]);

    return {
        favoriteModels: favModels,
        favoriteImages: favImages,
        isModelFav: useCallback((id: string | number) => favModels.includes(String(id)), [favModels]),
        isImageFav: useCallback((id: string | number) => favImages.includes(String(id)), [favImages]),
        toggleModel: useCallback((id: string | number) => toggleFavoriteModel(id), []),
        toggleImage: useCallback((id: string | number) => toggleFavoriteImage(id), []),
    };
}
