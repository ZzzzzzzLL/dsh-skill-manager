/** Browser Settings contribution for the standalone Web skill manager bundle. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type SkillManagerLocaleKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        skillManager: SkillManagerLocaleKey;
    }
}
export declare const NS = "skillManager";
export declare const inject: string[];
/** Register the localized Skills Settings section and its lazy generic RPC face. */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map
