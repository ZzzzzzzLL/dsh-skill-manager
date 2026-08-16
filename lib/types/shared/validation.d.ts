export interface ParsedSkillMarkdown {
    readonly name: string;
    readonly description: string;
    readonly body: string;
}
export interface UploadLimits {
    readonly maxCompressedBytes: number;
    readonly maxEntries: number;
    readonly maxExtractedBytes: number;
}
/** Parse and validate the required YAML frontmatter of one UTF-8 SKILL.md. */
export declare function parseSkillMarkdown(input: string): ParsedSkillMarkdown;
/** Validate a base64 archive and its ZIP central-directory bounds before inflate. */
export declare function validateUploadArchive(bytes: Uint8Array, limits: UploadLimits): Record<string, Uint8Array>;
/** Validate a single uploaded file or archive path. */
export declare function validateZipPath(name: string): void;
/** Decode canonical base64 without accepting whitespace or alternate alphabets. */
export declare function decodeCanonicalBase64(value: string): Uint8Array;
/** Decode one UTF-8 SKILL.md and reject replacement characters. */
export declare function decodeUtf8(bytes: Uint8Array): string;
/** Return the single valid SKILL.md path accepted by archive layout rules. */
export declare function skillMarkdownPath(files: Record<string, Uint8Array>): string;
/** Convert an archive SKILL.md to validated metadata. */
export declare function parseArchiveSkill(files: Record<string, Uint8Array>): ParsedSkillMarkdown;
//# sourceMappingURL=validation.d.ts.map