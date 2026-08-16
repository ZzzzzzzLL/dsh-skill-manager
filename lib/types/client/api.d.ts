import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client';
import type { SkillManagerSnapshot } from '../shared/types.ts';
/** Browser-side validated generic RPC facade. */
export declare function createSkillManagerApi(connection: ConnectionHandle): {
    list: (workspaceId?: string) => Promise<SkillManagerSnapshot>;
    toggle: (workspaceId: string | undefined, entryId: string, enabled: boolean) => Promise<SkillManagerSnapshot>;
    upload: (workspaceId: string | undefined, scope: "project" | "global", filename: string, contentBase64: string) => Promise<SkillManagerSnapshot>;
};
//# sourceMappingURL=api.d.ts.map