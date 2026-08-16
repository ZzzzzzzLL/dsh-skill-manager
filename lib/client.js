window.__ModuleLoader__.load({ id: 'dsh-skill-manager', factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let react = require("react");
react = __toESM(react);
let react_jsx_runtime = require("react/jsx-runtime");
react_jsx_runtime = __toESM(react_jsx_runtime);

//#region src/client/SkillManagerSection.tsx
const css = {
	section: "dsh-skill-manager-section",
	heading: "dsh-skill-manager-heading",
	intro: "dsh-skill-manager-intro",
	tabs: "dsh-skill-manager-tabs",
	tab: "dsh-skill-manager-tab",
	filters: "dsh-skill-manager-filters",
	field: "dsh-skill-manager-field",
	search: "dsh-skill-manager-search",
	actions: "dsh-skill-manager-actions",
	refresh: "dsh-skill-manager-refresh",
	upload: "dsh-skill-manager-upload",
	content: "dsh-skill-manager-content",
	status: "dsh-skill-manager-status",
	emptyState: "dsh-skill-manager-emptyState",
	emptyIcon: "dsh-skill-manager-emptyIcon",
	emptyTitle: "dsh-skill-manager-emptyTitle",
	emptyHint: "dsh-skill-manager-emptyHint",
	list: "dsh-skill-manager-list",
	entry: "dsh-skill-manager-entry",
	entryTop: "dsh-skill-manager-entryTop",
	identity: "dsh-skill-manager-identity",
	statusDot: "dsh-skill-manager-statusDot",
	entryActive: "dsh-skill-manager-entryActive",
	entryDisabled: "dsh-skill-manager-entryDisabled",
	entryName: "dsh-skill-manager-entryName",
	tags: "dsh-skill-manager-tags",
	tag: "dsh-skill-manager-tag",
	warningTag: "dsh-skill-manager-warningTag",
	entryDescription: "dsh-skill-manager-entryDescription",
	entryMeta: "dsh-skill-manager-entryMeta",
	toggle: "dsh-skill-manager-toggle",
	toggleEnable: "dsh-skill-manager-toggleEnable"
};
/** Settings section for local project/global skill discovery and reversible management. */
function SkillManagerSection({ t, manager, useWorkspaces }) {
	const frameworkWorkspaces = useWorkspaces((state) => state.items);
	const [workspaceId, setWorkspaceId] = (0, react.useState)(void 0);
	const [scope, setScope] = (0, react.useState)("project");
	const [snapshot$1, setSnapshot] = (0, react.useState)();
	const [query, setQuery] = (0, react.useState)("");
	const [error, setError] = (0, react.useState)(false);
	const [busy, setBusy] = (0, react.useState)(false);
	const generation = (0, react.useRef)(0);
	(0, react.useEffect)(() => {
		if (frameworkWorkspaces.every((item) => item.workspaceId !== workspaceId)) setWorkspaceId(frameworkWorkspaces[0]?.workspaceId);
	}, [frameworkWorkspaces, workspaceId]);
	const load = (0, react.useCallback)(async () => {
		const current = ++generation.current;
		setError(false);
		try {
			const next = await manager.list(scope === "project" ? workspaceId : void 0);
			if (current === generation.current) setSnapshot(next);
		} catch {
			if (current === generation.current) setError(true);
		}
	}, [
		manager,
		scope,
		workspaceId
	]);
	(0, react.useEffect)(() => {
		load();
	}, [load]);
	const entries = (0, react.useMemo)(() => (snapshot$1?.entries ?? []).filter((entry$1) => scope === "project" ? entry$1.source.startsWith("project-") : entry$1.source.startsWith("global-")).filter((entry$1) => [
		entry$1.name,
		entry$1.description,
		entry$1.source,
		entry$1.path,
		entry$1.diagnostic
	].filter(Boolean).join(" ").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [
		query,
		scope,
		snapshot$1
	]);
	const upload = async (event) => {
		const file = event.target.files?.[0];
		if (file === void 0) return;
		const current = ++generation.current;
		setBusy(true);
		try {
			const bytes = new Uint8Array(await file.arrayBuffer());
			let binary = "";
			for (const byte of bytes) binary += String.fromCharCode(byte);
			const next = await manager.upload(scope === "project" ? workspaceId : void 0, scope, file.name, btoa(binary));
			if (current === generation.current) {
				setSnapshot(next);
				setError(false);
			}
		} catch {
			if (current === generation.current) setError(true);
		} finally {
			setBusy(false);
			event.target.value = "";
		}
	};
	const toggle = async (item) => {
		if (scope === "project" && workspaceId === void 0) return;
		const current = ++generation.current;
		setBusy(true);
		try {
			const next = await manager.toggle(scope === "project" ? workspaceId : void 0, item.entryId, !item.active);
			if (current === generation.current) setSnapshot(next);
		} catch {
			if (current === generation.current) setError(true);
		} finally {
			setBusy(false);
		}
	};
	const projectWithoutWorkspace = scope === "project" && workspaceId === void 0;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
		className: css.section,
		"aria-busy": busy ? "true" : void 0,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
				className: css.heading,
				children: t("nav")
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: css.intro,
				children: t("intro")
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: css.tabs,
				role: "tablist",
				"aria-label": t("nav"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: css.tab,
					role: "tab",
					"aria-selected": scope === "project",
					"data-active": scope === "project" ? "true" : void 0,
					onClick: () => setScope("project"),
					children: t("project")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: css.tab,
					role: "tab",
					"aria-selected": scope === "global",
					"data-active": scope === "global" ? "true" : void 0,
					onClick: () => setScope("global"),
					children: t("global")
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: css.filters,
				children: [
					scope === "project" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: css.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("workspace") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
							"aria-label": t("workspace"),
							value: workspaceId ?? "",
							onChange: (event) => setWorkspaceId(event.target.value || void 0),
							children: frameworkWorkspaces.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: item.workspaceId,
								children: item.title
							}, item.workspaceId))
						})]
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: css.search,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
							"aria-hidden": "true",
							width: "16",
							height: "16",
							viewBox: "0 0 16 16",
							fill: "none",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
								cx: "7",
								cy: "7",
								r: "4.25",
								stroke: "currentColor",
								strokeWidth: "1.5"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
								d: "m10.25 10.25 3 3",
								stroke: "currentColor",
								strokeWidth: "1.5",
								strokeLinecap: "round"
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "search",
							"aria-label": t("search"),
							placeholder: t("search"),
							value: query,
							onChange: (event) => setQuery(event.target.value)
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: css.actions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: css.refresh,
							type: "button",
							disabled: busy,
							onClick: () => {
								load();
							},
							children: t("refresh")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: css.upload,
							"aria-disabled": projectWithoutWorkspace || busy,
							children: [t("upload"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "file",
								accept: ".md,.zip",
								disabled: projectWithoutWorkspace || busy,
								onChange: (event) => {
									upload(event);
								}
							})]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: css.content,
				children: projectWithoutWorkspace ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: css.status,
					role: "status",
					children: t("choose")
				}) : error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: css.status,
					role: "alert",
					children: t("error")
				}) : snapshot$1 === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: css.status,
					children: t("loading")
				}) : entries.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: css.emptyState,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: css.emptyIcon,
							"aria-hidden": "true",
							children: "✦"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
							className: css.emptyTitle,
							children: t("empty")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: css.emptyHint,
							children: t("emptyHint")
						})
					]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					className: css.list,
					children: entries.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Entry, {
						entry: item,
						t,
						onToggle: () => toggle(item),
						busy
					}, item.entryId))
				})
			})
		]
	});
}
function Entry({ entry: entry$1, t, onToggle, busy }) {
	const summary = entry$1.valid ? entry$1.description : entry$1.diagnostic;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
		className: css.entry,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: css.entryTop,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: css.identity,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: `${css.statusDot} ${entry$1.active ? css.entryActive : css.entryDisabled}`,
							"aria-hidden": "true"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
							className: css.entryName,
							children: entry$1.name
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: css.tags,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: css.tag,
								children: entry$1.active ? t("active") : t("disabled")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: css.tag,
								children: entry$1.source
							}),
							!entry$1.valid ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `${css.tag} ${css.warningTag}`,
								children: t("invalid")
							}) : null,
							entry$1.shadowed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `${css.tag} ${css.warningTag}`,
								children: t("shadowed")
							}) : null
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						className: `${css.toggle} ${entry$1.active ? "" : css.toggleEnable}`,
						type: "button",
						disabled: busy,
						"aria-pressed": entry$1.active,
						onClick: () => {
							onToggle();
						},
						children: entry$1.active ? t("disable") : t("enable")
					})
				]
			}),
			summary ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: css.entryDescription,
				title: summary,
				children: summary
			}) : null,
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: css.entryMeta,
				title: entry$1.path,
				children: entry$1.path
			})
		]
	});
}

//#endregion
//#region src/client/api.ts
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function wireResult(value) {
	if (!isRecord(value) || typeof value.ok !== "boolean") throw new Error("skill-manager returned an invalid response");
	if (value.ok) return {
		ok: true,
		value: value.value
	};
	if (!isRecord(value.error) || value.error.code !== "internal" || typeof value.error.message !== "string" || !isRecord(value.error.details)) throw new Error("skill-manager returned an invalid error");
	return {
		ok: false,
		error: {
			code: "internal",
			message: value.error.message,
			details: {}
		}
	};
}
function entry(value) {
	if (!isRecord(value) || typeof value.entryId !== "string" || typeof value.name !== "string" || typeof value.source !== "string" || typeof value.root !== "string" || typeof value.storageName !== "string" || typeof value.path !== "string" || typeof value.rank !== "number" || typeof value.active !== "boolean" || typeof value.valid !== "boolean" || value.description !== void 0 && typeof value.description !== "string" || value.diagnostic !== void 0 && typeof value.diagnostic !== "string" || value.shadowed !== void 0 && typeof value.shadowed !== "boolean") throw new Error("skill-manager returned an invalid entry");
	return value;
}
function snapshot(value) {
	if (!isRecord(value) || !Array.isArray(value.entries) || value.workspaceId !== void 0 && typeof value.workspaceId !== "string") throw new Error("skill-manager returned an invalid snapshot");
	return {
		entries: value.entries.map(entry),
		...value.workspaceId === void 0 ? {} : { workspaceId: value.workspaceId },
		...typeof value.projectRoot === "string" ? { projectRoot: value.projectRoot } : {}
	};
}
/** Browser-side validated generic RPC facade. */
function createSkillManagerApi(connection) {
	const call = async (endpoint, payload) => {
		const result = wireResult(await connection.rpc.call("/skill-manager", endpoint, payload));
		if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
		return result.value;
	};
	return {
		list: async (workspaceId) => snapshot(await call("list", workspaceId === void 0 ? {} : { workspaceId })),
		toggle: async (workspaceId, entryId, enabled) => snapshot(await call("toggle", {
			...workspaceId === void 0 ? {} : { workspaceId },
			entryId,
			enabled
		})),
		upload: async (workspaceId, scope, filename, contentBase64) => snapshot(await call("upload", {
			...workspaceId === void 0 ? {} : { workspaceId },
			scope,
			filename,
			contentBase64
		}))
	};
}

//#endregion
//#region src/client/locales.ts
/** Localized copy for the skill manager Settings section. */
const zh = {
	nav: "技能",
	intro: "查看、上传并控制项目与全局本地技能。",
	loading: "正在读取技能…",
	error: "技能目录暂时不可用。",
	empty: "暂无技能",
	emptyHint: "上传一个 SKILL.md 或 ZIP 技能包开始使用。",
	search: "搜索技能",
	project: "项目",
	global: "全局",
	enable: "启用",
	disable: "停用",
	upload: "上传技能",
	refresh: "刷新",
	workspace: "工作区",
	active: "已启用",
	disabled: "已停用",
	invalid: "无效",
	shadowed: "已被覆盖",
	source: "来源",
	path: "路径",
	description: "描述",
	choose: "选择工作区"
};
const en = {
	nav: "Skills",
	intro: "Inspect, upload, and control project and global local skills.",
	loading: "Reading skills…",
	error: "The skill catalog is unavailable.",
	empty: "No skills found",
	emptyHint: "Upload a SKILL.md or ZIP skill bundle to get started.",
	search: "Search skills",
	project: "Project",
	global: "Global",
	enable: "Enable",
	disable: "Disable",
	upload: "Upload skill",
	refresh: "Refresh",
	workspace: "Workspace",
	active: "Enabled",
	disabled: "Disabled",
	invalid: "Invalid",
	shadowed: "Shadowed",
	source: "Source",
	path: "Path",
	description: "Description",
	choose: "Choose workspace"
};

//#endregion
//#region src/client/index.ts
const STYLE = `.dsh-skill-manager-section{display:flex;flex-direction:column;gap:12px;width:100%;max-width:760px;color:var(--dsw-alias-label-primary)}
.dsh-skill-manager-heading{margin:0;font-size:18px;line-height:24px;font-weight:600}
.dsh-skill-manager-intro{margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-tertiary)}
.dsh-skill-manager-tabs{display:flex;align-items:flex-end;gap:22px;border-bottom:1px solid var(--dsw-alias-border-l2);margin-top:2px}
.dsh-skill-manager-tab{position:relative;border:0;padding:7px 1px 9px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:13px;line-height:20px;cursor:pointer}
.dsh-skill-manager-tab:hover,.dsh-skill-manager-tab[data-active=true]{color:var(--dsw-alias-label-primary)}
.dsh-skill-manager-tab[data-active=true]::after{position:absolute;right:0;bottom:-1px;left:0;height:2px;border-radius:2px 2px 0 0;background:var(--dsw-alias-label-primary);content:''}
.dsh-skill-manager-filters{display:flex;align-items:flex-end;gap:8px;min-width:0}
.dsh-skill-manager-field{display:flex;flex:0 1 190px;min-width:120px;flex-direction:column;gap:5px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.dsh-skill-manager-field select{box-sizing:border-box;width:100%;height:36px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:0 10px;font:inherit;font-size:13px}
.dsh-skill-manager-search{box-sizing:border-box;display:flex;flex:1 1 180px;min-width:120px;height:36px;align-items:center;gap:7px;border:1px solid var(--dsw-alias-border-l2);border-radius:18px;padding:0 12px;color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-1)}
.dsh-skill-manager-search:focus-within{border-color:var(--dsw-alias-border-l3);box-shadow:0 0 0 2px var(--dsw-alias-interactive-bg-hover)}
.dsh-skill-manager-search input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px}
.dsh-skill-manager-search input::placeholder{color:var(--dsw-alias-label-placeholder)}
.dsh-skill-manager-actions{display:flex;flex:none;gap:6px}
.dsh-skill-manager-refresh,.dsh-skill-manager-upload,.dsh-skill-manager-toggle{box-sizing:border-box;display:inline-flex;height:36px;align-items:center;justify-content:center;border:1px solid var(--dsw-alias-border-l2);border-radius:18px;padding:0 14px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px;cursor:pointer;white-space:nowrap}
.dsh-skill-manager-refresh:hover:not(:disabled),.dsh-skill-manager-upload:hover:not([aria-disabled=true]),.dsh-skill-manager-toggle:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-solid)}
.dsh-skill-manager-refresh:disabled,.dsh-skill-manager-upload[aria-disabled=true],.dsh-skill-manager-toggle:disabled{opacity:.4;cursor:default}
.dsh-skill-manager-upload{border-color:transparent;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
.dsh-skill-manager-upload:hover:not([aria-disabled=true]){background:var(--dsw-alias-button-primary-hover)}
.dsh-skill-manager-upload input{position:absolute;width:0;height:0;opacity:0}
.dsh-skill-manager-content{min-width:0;padding-top:2px}
.dsh-skill-manager-status{margin:28px 0 0;text-align:center;font-size:13px;color:var(--dsw-alias-label-tertiary)}
.dsh-skill-manager-emptyState{display:flex;min-height:190px;flex-direction:column;align-items:center;justify-content:center;border-radius:12px;background:var(--dsw-alias-bg-module-platform);padding:28px;text-align:center}
.dsh-skill-manager-emptyIcon{display:grid;width:42px;height:42px;place-items:center;border-radius:50%;margin-bottom:12px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:20px}
.dsh-skill-manager-emptyTitle{font-size:14px;line-height:22px;font-weight:500}
.dsh-skill-manager-emptyHint{max-width:320px;margin:4px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.dsh-skill-manager-list{display:flex;flex-direction:column;gap:10px;list-style:none;padding:0;margin:0}
.dsh-skill-manager-entry{box-sizing:border-box;display:flex;flex-direction:column;gap:9px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:13px 15px;background:var(--dsw-alias-bg-layer-1)}
.dsh-skill-manager-entryTop{display:flex;align-items:center;gap:10px;min-width:0}
.dsh-skill-manager-identity{display:flex;min-width:0;align-items:center;gap:8px}
.dsh-skill-manager-statusDot{flex:none;width:8px;height:8px;border-radius:50%}
.dsh-skill-manager-entryActive{background:var(--dsw-alias-state-success-primary)}
.dsh-skill-manager-entryDisabled{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l3);background:transparent}
.dsh-skill-manager-entryName{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;line-height:22px;font-weight:500}
.dsh-skill-manager-tags{display:flex;min-width:0;align-items:center;gap:5px;overflow:hidden}
.dsh-skill-manager-tag{flex:none;border:1px solid var(--dsw-alias-border-l3);border-radius:5px;padding:1px 6px;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}
.dsh-skill-manager-warningTag{color:var(--dsw-alias-state-warn-label)}
.dsh-skill-manager-toggle{flex:none;height:28px;margin-left:auto;padding:0 10px;border-radius:14px;font-size:12px;line-height:18px}
.dsh-skill-manager-toggleEnable{border-color:transparent;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
.dsh-skill-manager-entryDescription{display:-webkit-box;overflow:hidden;margin:0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:19px;-webkit-box-orient:vertical;-webkit-line-clamp:2}
.dsh-skill-manager-entryMeta{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;line-height:17px}
.dsh-skill-manager-tab:focus-visible,.dsh-skill-manager-refresh:focus-visible,.dsh-skill-manager-upload:focus-within,.dsh-skill-manager-toggle:focus-visible,.dsh-skill-manager-field select:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}
@media (max-width:680px){.dsh-skill-manager-filters{flex-wrap:wrap}.dsh-skill-manager-field{flex-basis:100%}.dsh-skill-manager-search{order:2;flex-basis:100%}.dsh-skill-manager-actions{margin-left:auto}.dsh-skill-manager-tags{display:none}}`;
const NS = "skillManager";
const inject = [
	"slots",
	"locale",
	"connection"
];
/** Register the localized Skills Settings section and its lazy generic RPC face. */
function apply(ctx) {
	ctx.effect(() => ctx.locale.register(NS, {
		zh,
		en
	}), "dsh-skill-manager: dictionaries");
	ctx.effect(() => {
		if (typeof document === "undefined") return () => {};
		const tag = document.createElement("style");
		tag.dataset.plugin = "dsh-skill-manager";
		tag.textContent = STYLE;
		document.head.appendChild(tag);
		return () => {
			tag.remove();
		};
	}, "dsh-skill-manager: styles");
	const t = ctx.locale.bind(NS);
	const managerInjected = { ...createSkillManagerApi(ctx.get("connection")) };
	const injected = () => ({ manager: managerInjected });
	ctx.slots.inject("settings.section", () => ctx.slots.register({
		name: "settings.section",
		id: "skills",
		order: 30,
		label: () => t("nav"),
		locale: NS,
		inject: injected
	}, SkillManagerSection));
}

//#endregion
exports.NS = NS;
exports.apply = apply;
exports.inject = inject;
return module.exports; } });