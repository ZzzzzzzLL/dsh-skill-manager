/** Move an rc.6 legacy disabled root-level SKILL.md to the provider-safe alias. */
export declare function relocateLegacyRootFlatSkill(root: string): Promise<void>;
/** Move one entry between a root and its private `.disabled` directory. */
export declare function relocateSkill(root: string, entry: string, disable: boolean): Promise<void>;
//# sourceMappingURL=relocation.d.ts.map