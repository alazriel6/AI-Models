import type { ModelImage } from "../api/models";

/**
 * Standard tags recognized as 18+ / Adult / NSFW content
 */
export const NSFW_TAGS = ["18+", "nsfw", "r18", "r-18"];

/**
 * Check if a ModelImage has 18+ or NSFW tags
 */
export function isNsfwImage(img: ModelImage): boolean {
    if (!img) return false;
    if (img.tags && img.tags.length > 0) {
        const hasNsfwTag = img.tags.some((t: any) => {
            const name = (typeof t === "string" ? t : t?.name || "").toLowerCase().trim();
            const slug = (typeof t === "string" ? t : t?.slug || "").toLowerCase().trim();
            return (
                name === "18+" ||
                name === "nsfw" ||
                name === "r18" ||
                name === "r-18" ||
                slug === "18+" ||
                slug === "nsfw" ||
                slug === "r18" ||
                slug === "r-18"
            );
        });
        if (hasNsfwTag) return true;
    }
    return false;
}

/**
 * Check if a list of string tags contains 18+ or NSFW
 */
export function hasNsfwTagString(tags: string[]): boolean {
    if (!tags || tags.length === 0) return false;
    return tags.some((t) => {
        const lower = t.toLowerCase().trim();
        return lower === "18+" || lower === "nsfw" || lower === "r18" || lower === "r-18";
    });
}

/**
 * Toggle 18+ tags (adds or removes "18+" and "nsfw")
 */
export function toggleNsfwTags(currentTags: string[]): string[] {
    const isCurrentlyNsfw = hasNsfwTagString(currentTags);
    if (isCurrentlyNsfw) {
        // Remove 18+ and nsfw
        return currentTags.filter((t) => {
            const lower = t.toLowerCase().trim();
            return lower !== "18+" && lower !== "nsfw" && lower !== "r18" && lower !== "r-18";
        });
    } else {
        // Add "18+" and "nsfw"
        const next = [...currentTags];
        if (!next.some((t) => t.toLowerCase().trim() === "18+")) {
            next.push("18+");
        }
        if (!next.some((t) => t.toLowerCase().trim() === "nsfw")) {
            next.push("nsfw");
        }
        return next;
    }
}
