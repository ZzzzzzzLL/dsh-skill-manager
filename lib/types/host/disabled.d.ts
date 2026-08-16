interface DisabledDirectoryOptions {
    readonly create?: boolean;
    readonly onUnsafe?: 'throw' | 'ignore';
}
/** Resolve the reserved disabled directory without following a symlink. */
export declare function disabledDirectory(root: string, options?: DisabledDirectoryOptions): Promise<string | undefined>;
export {};
//# sourceMappingURL=disabled.d.ts.map