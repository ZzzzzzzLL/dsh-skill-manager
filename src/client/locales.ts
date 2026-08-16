/** Localized copy for the skill manager Settings section. */
export const zh = {
  nav: '技能', intro: '查看、上传并控制项目与全局本地技能。', loading: '正在读取技能…', error: '技能目录暂时不可用。', empty: '暂无技能', emptyHint: '上传一个 SKILL.md 或 ZIP 技能包开始使用。', search: '搜索技能',
  project: '项目', global: '全局', enable: '启用', disable: '停用', upload: '上传技能', refresh: '刷新', workspace: '工作区',
  active: '已启用', disabled: '已停用', invalid: '无效', shadowed: '已被覆盖', source: '来源', path: '路径', description: '描述', choose: '选择工作区',
} satisfies Record<string, string>
export type SkillManagerLocaleKey = keyof typeof zh
export const en = {
  nav: 'Skills', intro: 'Inspect, upload, and control project and global local skills.', loading: 'Reading skills…', error: 'The skill catalog is unavailable.', empty: 'No skills found', emptyHint: 'Upload a SKILL.md or ZIP skill bundle to get started.', search: 'Search skills',
  project: 'Project', global: 'Global', enable: 'Enable', disable: 'Disable', upload: 'Upload skill', refresh: 'Refresh', workspace: 'Workspace',
  active: 'Enabled', disabled: 'Disabled', invalid: 'Invalid', shadowed: 'Shadowed', source: 'Source', path: 'Path', description: 'Description', choose: 'Choose workspace',
} satisfies Record<SkillManagerLocaleKey, string>
