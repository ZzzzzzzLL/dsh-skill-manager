import { type ReactNode } from 'react';
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { SkillManagerSnapshot } from '../shared/types.ts';
export interface SkillManagerInjected {
    readonly list: (workspaceId?: string) => Promise<SkillManagerSnapshot>;
    readonly toggle: (workspaceId: string | undefined, entryId: string, enabled: boolean) => Promise<SkillManagerSnapshot>;
    readonly upload: (workspaceId: string | undefined, scope: 'project' | 'global', filename: string, contentBase64: string) => Promise<SkillManagerSnapshot>;
}
export type SkillManagerSectionProps = PropsRuntime<'settings.section'> & PropsLocale<'skillManager'> & {
    readonly manager: SkillManagerInjected;
};
/** Settings section for local project/global skill discovery and reversible management. */
export declare function SkillManagerSection({ t, manager, useWorkspaces }: SkillManagerSectionProps): ReactNode;
//# sourceMappingURL=SkillManagerSection.d.ts.map