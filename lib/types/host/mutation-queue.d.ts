/** Serialize all in-process mutations targeting one skill root. */
export declare function enqueueMutation<T>(root: string, operation: () => Promise<T>): Promise<T>;
//# sourceMappingURL=mutation-queue.d.ts.map