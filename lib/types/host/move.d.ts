/**
 * Move one filesystem entry without replacing an existing non-directory target.
 * Relative symlink targets are rebased so the moved link keeps the same referent.
 * @param from - Existing source entry in the managed root.
 * @param to - Destination path on the same filesystem.
 * @returns A promise that resolves after the source has been unlinked.
 */
export declare function moveEntryNoClobber(from: string, to: string): Promise<void>;
//# sourceMappingURL=move.d.ts.map