import React, { useMemo } from "react";

interface CivitaiRichDescriptionProps {
    content?: string;
    modelName?: string;
    className?: string;
}

/**
 * Sanitizes and converts markdown/HTML combinations into safe, rich Civitai-styled HTML.
 */
function formatRichCivitaiText(raw?: string): string {
    if (!raw || !raw.trim()) {
        return "<p class='civitai-empty-desc'>Tidak ada deskripsi rinci untuk model ini.</p>";
    }

    let text = raw.trim();

    // 1. Strip dangerous tags
    text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
    text = text.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "");
    text = text.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, "");
    text = text.replace(/<embed\b[^>]*>/gi, "");

    // 2. Strip event handlers and javascript:
    text = text.replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    text = text.replace(/href\s*=\s*["']?javascript:[^"'>\s]*["']?/gi, 'href="#"');

    // Check if the input contains existing HTML paragraph/heading/list tags
    const hasHTMLStructure = /<(p|h[1-6]|ul|ol|li|div|blockquote|table|hr)\b/i.test(text);

    if (!hasHTMLStructure) {
        // Plain text / Markdown mode
        // Convert headers ### Heading
        text = text.replace(/^####\s+(.*)$/gim, '<h4 class="civitai-article-h4">$1</h4>');
        text = text.replace(/^###\s+(.*)$/gim, '<h3 class="civitai-article-h3">$1</h3>');
        text = text.replace(/^##\s+(.*)$/gim, '<h3 class="civitai-article-h3">$1</h3>');
        text = text.replace(/^#\s+(.*)$/gim, '<h2 class="civitai-article-h2">$1</h2>');

        // Convert horizontal dividers
        text = text.replace(/^(?:---|___|\*\*\*)\s*$/gim, '<hr class="civitai-rich-hr" />');

        // Bold & Italic
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="civitai-strong">$1</strong>');
        text = text.replace(/__([^_]+)__/g, '<strong class="civitai-strong">$1</strong>');
        text = text.replace(/\*([^*]+)\*/g, '<em class="civitai-em">$1</em>');

        // Inline code
        text = text.replace(/`([^`]+)`/g, '<code class="civitai-inline-code">$1</code>');

        // Convert markdown links: [text](url)
        text = text.replace(
            /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer ugc" class="civitai-rich-link">$1 <span class="ext-icon">↗</span></a>'
        );

        // Convert raw URLs (not inside a tag or link)
        text = text.replace(
            /(?<!href=["'])(https?:\/\/[^\s<>"']+)(?!["'])/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer ugc" class="civitai-rich-link">$1 <span class="ext-icon">↗</span></a>'
        );

        // Convert bullet lists (- or *)
        const lines = text.split("\n");
        let inList = false;
        const processedLines: string[] = [];

        for (const line of lines) {
            const listMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
            if (listMatch) {
                if (!inList) {
                    processedLines.push('<ul class="civitai-rich-list">');
                    inList = true;
                }
                processedLines.push(`<li>${listMatch[2]}</li>`);
            } else {
                if (inList) {
                    processedLines.push("</ul>");
                    inList = false;
                }
                processedLines.push(line);
            }
        }
        if (inList) {
            processedLines.push("</ul>");
        }
        text = processedLines.join("\n");

        // Split into paragraphs by double newlines or headers
        const paragraphs = text
            .split(/\n{2,}/)
            .map((block) => block.trim())
            .filter(Boolean)
            .map((block) => {
                if (
                    block.startsWith("<h2") ||
                    block.startsWith("<h3") ||
                    block.startsWith("<h4") ||
                    block.startsWith("<hr") ||
                    block.startsWith("<ul") ||
                    block.startsWith("<ol")
                ) {
                    return block;
                }
                // Convert single newlines inside paragraph to <br />
                const withBreaks = block.replace(/\n/g, "<br />");
                return `<p class="civitai-paragraph">${withBreaks}</p>`;
            });

        text = paragraphs.join("\n");
    } else {
        // HTML mode (e.g. from Civitai Quill editor)
        // Ensure links have target="_blank" and rel="noopener noreferrer ugc"
        text = text.replace(/<a\s+([^>]*?)>/gi, (match) => {
            let m = match;
            if (!/target=/i.test(m)) {
                m = m.replace("<a ", '<a target="_blank" ');
            }
            if (!/rel=/i.test(m)) {
                m = m.replace("<a ", '<a rel="noopener noreferrer ugc" ');
            }
            if (!/class=/i.test(m)) {
                m = m.replace("<a ", '<a class="civitai-rich-link" ');
            }
            return m;
        });

        // Also convert any unrendered markdown bold tags `**text**` that users frequently type inside Civitai WYSIWYG
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="civitai-strong">$1</strong>');

        // Convert unrendered markdown headers like `### Heading` or `### V5-V15 User Manual`
        text = text.replace(/###\s+([^<]+)/g, '<h3 class="civitai-article-h3">$1</h3>');

        // Convert raw URLs inside paragraphs that were not made into links by Quill
        text = text.replace(
            /(?<!href=["'])(https?:\/\/[^\s<>"']+)(?!["'])/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer ugc" class="civitai-rich-link">$1 <span class="ext-icon">↗</span></a>'
        );
    }

    return text;
}

export const CivitaiRichDescription: React.FC<CivitaiRichDescriptionProps> = ({
    content,
    modelName,
    className = "",
}) => {
    const formattedHTML = useMemo(() => {
        return formatRichCivitaiText(content);
    }, [content]);

    return (
        <div className={`civitai-rich-article ${className}`}>
            {modelName && <h2 className="article-main-title">{modelName}</h2>}
            <div
                className="civitai-rich-body"
                dangerouslySetInnerHTML={{ __html: formattedHTML }}
            />
        </div>
    );
};
