import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export interface Config {
    readonly dshHome?: string;
    readonly agentsHome?: string;
    readonly maxCompressedUploadBytes?: number;
    readonly maxArchiveEntries?: number;
    readonly maxExtractedBytes?: number;
}
export declare const Config: z<Schemastery.ObjectS<{
    dshHome: z<string, string>;
    agentsHome: z<string, string>;
    maxCompressedUploadBytes: z<number, number>;
    maxArchiveEntries: z<number, number>;
    maxExtractedBytes: z<number, number>;
}>, Schemastery.ObjectT<{
    dshHome: z<string, string>;
    agentsHome: z<string, string>;
    maxCompressedUploadBytes: z<number, number>;
    maxArchiveEntries: z<number, number>;
    maxExtractedBytes: z<number, number>;
}>>;
export interface SkillManagerHomes {
    readonly dshHome: string;
    readonly agentsHome: string;
}
export declare function resolveSkillManagerHomes(config: Pick<Config, 'dshHome' | 'agentsHome'>, env?: Record<string, string | undefined>): SkillManagerHomes;
/** Host plugin for local skill catalog management over a loopback RPC channel. */
export declare function apply(ctx: Context, config?: Config): void;
//# sourceMappingURL=index.d.ts.map
