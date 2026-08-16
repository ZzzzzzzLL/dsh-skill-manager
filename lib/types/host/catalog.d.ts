import type { SkillManagerSnapshot } from '../shared/types.ts';
export interface DiscoverOptions {
    readonly workspacePath?: string;
    readonly dshHome: string;
    readonly agentsHome: string;
}
/** Find the nearest ancestor containing `.git`, falling back to workspacePath. */
export declare function resolveProjectRoot(workspacePath: string): Promise<string>;
/** Discover active and disabled local skills from the four shipped roots. */
export declare function discoverSkills(options: DiscoverOptions): Promise<SkillManagerSnapshot>;
//# sourceMappingURL=catalog.d.ts.map