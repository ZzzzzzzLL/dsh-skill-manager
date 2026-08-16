import { type UploadLimits } from '../shared/validation.ts';
/** Install one validated Markdown or ZIP upload into a shipped local root. */
export declare function installUpload(root: string, filename: string, contentBase64: string, limits: UploadLimits, options?: {
    readonly skipSystem?: boolean;
}): Promise<{
    name: string;
}>;
//# sourceMappingURL=upload.d.ts.map