import z from "@deepseek-ai/schemastery";
import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { chmod, link, lstat, mkdir, mkdtemp, readFile, readdir, readlink, rename, rm, stat, symlink, unlink, writeFile } from "node:fs/promises";
import { TextDecoder as TextDecoder$1 } from "node:util";
import { Unzip, UnzipInflate } from "fflate";
import { parse } from "yaml";
import { randomBytes } from "node:crypto";

//#region src/shared/validation.ts
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Parse and validate the required YAML frontmatter of one UTF-8 SKILL.md. */
function parseSkillMarkdown(input) {
	if (!input.startsWith("---")) throw new Error("SKILL.md requires YAML frontmatter");
	const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/.exec(input);
	if (match === null) throw new Error("SKILL.md frontmatter is malformed");
	const frontmatter = match[1];
	const body = match[2];
	if (frontmatter === void 0 || body === void 0) throw new Error("SKILL.md frontmatter is malformed");
	const data = parse(frontmatter);
	if (typeof data !== "object" || data === null || Array.isArray(data)) throw new Error("SKILL.md frontmatter must be a mapping");
	const record = data;
	const name$1 = record.name;
	const description = record.description;
	if (typeof name$1 !== "string" || !SKILL_NAME.test(name$1)) throw new Error("SKILL.md name must be kebab-case");
	if (typeof description !== "string" || description.length === 0) throw new Error("SKILL.md description must be nonempty");
	validateInvocationFields(record);
	return {
		name: name$1,
		description,
		body
	};
}
function validateInvocationFields(data) {
	rejectLegacyInvocationKey(data, "disableModelInvocation", "disable-model-invocation");
	rejectLegacyInvocationKey(data, "modelInvocable", "disable-model-invocation");
	rejectLegacyInvocationKey(data, "userInvocable", "user-invocable");
	parseFrontmatterBoolean(data, "disable-model-invocation");
	parseFrontmatterBoolean(data, "user-invocable");
}
function rejectLegacyInvocationKey(data, legacy, canonical) {
	if (Object.hasOwn(data, legacy)) throw new Error(`frontmatter field "${legacy}" is unsupported; use "${canonical}"`);
}
function parseFrontmatterBoolean(data, key) {
	if (!Object.hasOwn(data, key)) return void 0;
	const value = data[key];
	if (typeof value === "boolean") return value;
	if (value === 1 || value === "1") return true;
	if (value === 0 || value === "0") return false;
	if (typeof value === "string") switch (value.toLowerCase()) {
		case "true":
		case "yes":
		case "on": return true;
		case "false":
		case "no":
		case "off": return false;
	}
	throw new TypeError(`frontmatter field "${key}" must be a boolean`);
}
/** Validate a base64 archive and its ZIP central-directory bounds before inflate. */
function validateUploadArchive(bytes, limits) {
	if (bytes.byteLength > limits.maxCompressedBytes) throw new Error("compressed upload exceeds limit");
	const declared = inspectZipCentralDirectory(bytes);
	if (declared.length > limits.maxEntries) throw new Error("zip entry count exceeds limit");
	let declaredTotal = 0;
	const canonicalNames = /* @__PURE__ */ new Set();
	for (const item of declared) {
		validateZipPath(item.name);
		const canonicalName = item.name.normalize("NFC").toLowerCase();
		if (canonicalNames.has(canonicalName)) throw new Error(`zip contains canonical path collision: ${item.name}`);
		canonicalNames.add(canonicalName);
		if (item.mode !== void 0 && (item.mode & 61440) !== 0 && (item.mode & 61440) !== 16384 && (item.mode & 61440) !== 32768) throw new Error("zip contains a suspicious file mode");
		declaredTotal += item.uncompressedSize;
		if (declaredTotal > limits.maxExtractedBytes) throw new Error("declared extracted bytes exceed limit");
	}
	return unzipStreaming(bytes, declared, limits);
}
/** Read only ZIP central-directory metadata so declared bombs fail before inflate. */
function inspectZipCentralDirectory(bytes) {
	if (bytes.byteLength < 22) throw new Error("upload is not a valid zip archive");
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const start = Math.max(0, bytes.byteLength - 65557);
	let eocd = -1;
	for (let offset$1 = bytes.byteLength - 22; offset$1 >= start; offset$1 -= 1) if (view.getUint32(offset$1, true) === 101010256) {
		eocd = offset$1;
		break;
	}
	if (eocd < 0) throw new Error("upload is not a valid zip archive");
	if (view.getUint16(eocd + 4, true) !== 0 || view.getUint16(eocd + 6, true) !== 0 || view.getUint16(eocd + 8, true) !== view.getUint16(eocd + 10, true)) throw new Error("multi-disk zip archives are not supported");
	const count = view.getUint16(eocd + 10, true);
	const centralSize = view.getUint32(eocd + 12, true);
	const centralOffset = view.getUint32(eocd + 16, true);
	if (centralOffset + centralSize > bytes.byteLength) throw new Error("zip central directory is truncated");
	const result = [];
	let offset = centralOffset;
	for (let index = 0; index < count; index += 1) {
		if (offset + 46 > bytes.byteLength || view.getUint32(offset, true) !== 33639248) throw new Error("zip central directory is malformed");
		const uncompressedSize = view.getUint32(offset + 24, true);
		const mode = view.getUint32(offset + 38, true) >>> 16 & 65535;
		const nameLength = view.getUint16(offset + 28, true);
		const extraLength = view.getUint16(offset + 30, true);
		const commentLength = view.getUint16(offset + 32, true);
		const end = offset + 46 + nameLength + extraLength + commentLength;
		if (end > bytes.byteLength) throw new Error("zip central directory is truncated");
		const name$1 = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
		result.push({
			name: name$1,
			uncompressedSize,
			...mode === 0 ? {} : { mode }
		});
		offset = end;
	}
	if (offset > centralOffset + centralSize) throw new Error("zip central directory is malformed");
	return result;
}
/** Validate a single uploaded file or archive path. */
function validateZipPath(name$1) {
	if (name$1.includes("\\") || name$1.includes("\0") || name$1.startsWith("/") || /^[A-Za-z]:/.test(name$1)) throw new Error(`unsafe zip path: ${name$1}`);
	const parts = name$1.endsWith("/") ? name$1.slice(0, -1).split("/") : name$1.split("/");
	if (parts.length === 0 || parts.some((part) => part === ".." || part === "." || part === "")) throw new Error(`unsafe zip path: ${name$1}`);
	for (const part of parts) if (part.includes(":") || /[. ]$/.test(part) || /^(?:CON|PRN|AUX|NUL|CLOCK\$|COM[1-9]|LPT[1-9])(?:\..*)?$/i.test(part)) throw new Error(`unsafe zip path: ${name$1}`);
}
/** Inflate a ZIP incrementally so the actual extracted-byte bound is enforced while data arrives. */
function unzipStreaming(bytes, declared, limits) {
	const files = Object.create(null);
	const declaredByName = /* @__PURE__ */ new Map();
	for (const item of declared) {
		if (declaredByName.has(item.name)) throw new Error(`zip contains duplicate entry: ${item.name}`);
		declaredByName.set(item.name, item);
	}
	const seen = /* @__PURE__ */ new Set();
	let total = 0;
	let failure;
	const unzip = new Unzip((file) => {
		if (failure !== void 0) return;
		const expected = declaredByName.get(file.name);
		if (expected === void 0 || seen.has(file.name)) {
			failure = /* @__PURE__ */ new Error("zip entry metadata does not match central directory");
			throw failure;
		}
		seen.add(file.name);
		validateZipPath(file.name);
		const originalSize = file.originalSize;
		if (typeof originalSize === "number" && originalSize !== expected.uncompressedSize) {
			failure = /* @__PURE__ */ new Error("zip entry original size does not match central directory");
			throw failure;
		}
		const chunks = [];
		let actual = 0;
		file.ondata = (error, data, final) => {
			if (error !== null) {
				failure = error instanceof Error ? error : new Error(String(error));
				throw failure;
			}
			actual += data.byteLength;
			total += data.byteLength;
			if (actual > limits.maxExtractedBytes || total > limits.maxExtractedBytes) {
				failure = /* @__PURE__ */ new Error("actual extracted bytes exceed limit");
				throw failure;
			}
			chunks.push(data.slice());
			if (final) {
				const output = new Uint8Array(actual);
				let offset = 0;
				for (const chunk of chunks) {
					output.set(chunk, offset);
					offset += chunk.byteLength;
				}
				files[file.name] = output;
			}
		};
		file.start();
	});
	unzip.register(UnzipInflate);
	const chunkSize = 8 * 1024;
	for (let offset = 0; offset < bytes.byteLength; offset += chunkSize) {
		const end = Math.min(bytes.byteLength, offset + chunkSize);
		unzip.push(bytes.subarray(offset, end), end === bytes.byteLength);
		if (failure !== void 0) throw failure;
	}
	if (seen.size !== declaredByName.size) throw new Error("zip entry count does not match central directory");
	return files;
}
/** Decode canonical base64 without accepting whitespace or alternate alphabets. */
function decodeCanonicalBase64(value) {
	if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new Error("contentBase64 is not canonical base64");
	const bytes = Buffer.from(value, "base64");
	if (bytes.toString("base64") !== value) throw new Error("contentBase64 is not canonical base64");
	return new Uint8Array(bytes);
}
/** Decode one UTF-8 SKILL.md and reject replacement characters. */
function decodeUtf8(bytes) {
	const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	if (text.includes("�")) throw new Error("SKILL.md is not valid UTF-8");
	return text;
}
/** Return the single valid SKILL.md path accepted by archive layout rules. */
function skillMarkdownPath(files) {
	const paths = Object.keys(files).filter((path$1) => path$1.endsWith("/SKILL.md") || path$1 === "SKILL.md");
	if (paths.length !== 1) throw new Error("archive must contain exactly one SKILL.md");
	const path = paths[0];
	if (path === void 0) throw new Error("archive must contain exactly one SKILL.md");
	const depth = path.split("/").length;
	if (depth > 2) throw new Error("SKILL.md must be at the archive root or one directory deep");
	if (depth === 2) {
		const prefix = path.slice(0, path.lastIndexOf("/") + 1);
		if (Object.keys(files).some((candidate) => candidate !== path && !candidate.startsWith(prefix))) throw new Error("archive files must share SKILL.md top-level directory");
	}
	return path;
}
/** Convert an archive SKILL.md to validated metadata. */
function parseArchiveSkill(files) {
	const bytes = files[skillMarkdownPath(files)];
	if (bytes === void 0) throw new Error("archive SKILL.md content is missing");
	return parseSkillMarkdown(decodeUtf8(bytes));
}

//#endregion
//#region src/host/disabled.ts
/** Resolve the reserved disabled directory without following a symlink. */
async function disabledDirectory(root, options = {}) {
	const path = join(root, ".disabled");
	const onUnsafe = options.onUnsafe ?? "throw";
	let state = await readDisabledDirectory(path, onUnsafe);
	if (state !== void 0 || options.create !== true) return state;
	try {
		await mkdir(path, { mode: 448 });
	} catch (error) {
		if ((error instanceof Error && "code" in error ? error.code : void 0) !== "EEXIST") throw error;
	}
	state = await readDisabledDirectory(path, onUnsafe);
	if (state === void 0) throw new Error(`reserved .disabled directory is unavailable: ${path}`);
	return state;
}
async function readDisabledDirectory(path, onUnsafe) {
	let entry;
	try {
		entry = await lstat(path);
	} catch (error) {
		const code = error instanceof Error && "code" in error ? error.code : void 0;
		if (code === "ENOENT" || code === "ENOTDIR") return void 0;
		throw error;
	}
	if (entry.isDirectory() && !entry.isSymbolicLink()) return path;
	if (onUnsafe === "ignore") return void 0;
	throw new Error(`unsafe reserved .disabled directory: ${path}`);
}

//#endregion
//#region src/host/catalog.ts
const ROOT_FLAT_ENTRY$1 = "SKILL.md";
/** Find the nearest ancestor containing `.git`, falling back to workspacePath. */
async function resolveProjectRoot(workspacePath) {
	let current = resolve(workspacePath);
	try {
		if (!(await stat(current)).isDirectory()) current = dirname(current);
	} catch {}
	while (true) {
		try {
			if ((await stat(join(current, ".git"))).isDirectory() || (await stat(join(current, ".git"))).isFile()) return current;
		} catch {}
		const parent = dirname(current);
		if (parent === current) return resolve(workspacePath);
		current = parent;
	}
}
/** Discover active and disabled local skills from the four shipped roots. */
async function discoverSkills(options) {
	const projectRoot = options.workspacePath === void 0 ? void 0 : await resolveProjectRoot(options.workspacePath);
	const roots = [
		...projectRoot === void 0 ? [] : [{
			path: join(projectRoot, ".dsh", "skills"),
			source: "project-dsh",
			rank: 100
		}, {
			path: join(projectRoot, ".agents", "skills"),
			source: "project-agents",
			rank: 200
		}],
		{
			path: join(resolve(options.dshHome), "skills"),
			source: "global-dsh",
			rank: 400,
			skipSystem: true
		},
		{
			path: join(resolve(options.agentsHome), "skills"),
			source: "global-agents",
			rank: 500
		}
	];
	const entries = [];
	for (const root of roots) await scanRoot(root, entries);
	const winners = /* @__PURE__ */ new Map();
	for (const entry of [...entries].sort((a, b) => a.rank - b.rank || a.path.localeCompare(b.path) || a.entryId.localeCompare(b.entryId))) {
		if (!entry.active || !entry.valid || winners.has(entry.name)) continue;
		winners.set(entry.name, entry);
	}
	const normalized = entries.map((entry) => ({
		...entry,
		shadowed: entry.active && entry.valid && winners.get(entry.name)?.entryId !== entry.entryId
	}));
	normalized.sort((a, b) => a.rank - b.rank || a.entryId.localeCompare(b.entryId));
	return {
		...projectRoot === void 0 ? {} : { projectRoot },
		entries: normalized
	};
}
async function scanRoot(root, output) {
	const active = await listRoot(root.path, root.skipSystem);
	const disabledRoot = await disabledDirectory(root.path, { onUnsafe: "ignore" });
	const disabled = disabledRoot === void 0 ? [] : await listRoot(disabledRoot, root.skipSystem);
	for (const item of active) await inspectItem(root, item, true, output);
	for (const item of disabled) {
		const legacyRootFlat = item.storageName === ROOT_FLAT_ENTRY$1 && item.path === join(root.path, ".disabled", ROOT_FLAT_ENTRY$1);
		await inspectItem(root, item, legacyRootFlat, output, legacyRootFlat);
	}
}
async function listRoot(path, skipSystem) {
	try {
		const names = await readdir(path, { withFileTypes: true });
		const items = [];
		for (const name$1 of names) {
			if (name$1.name === ".disabled" || skipSystem === true && name$1.name === ".system") continue;
			let kind;
			try {
				const target = await stat(join(path, name$1.name));
				kind = target.isDirectory() ? "directory" : target.isFile() ? "file" : void 0;
			} catch (error) {
				const code = error instanceof Error && "code" in error ? error.code : void 0;
				if (code !== "ENOENT" && code !== "ENOTDIR" && code !== "ELOOP") throw error;
			}
			if (kind === "directory") items.push({
				storageName: name$1.name,
				path: join(path, name$1.name),
				label: name$1.name,
				kind
			});
			else if (kind === "file" && name$1.name.endsWith(".md")) items.push({
				storageName: name$1.name,
				path: join(path, name$1.name),
				label: name$1.name,
				kind
			});
		}
		return items;
	} catch (error) {
		const code = error instanceof Error && "code" in error ? error.code : void 0;
		if (code === "ENOENT" || code === "ENOTDIR") return [];
		throw error;
	}
}
async function inspectItem(root, item, active, output, legacyRootFlat = false) {
	const skillPath = item.kind === "file" ? item.path : join(item.path, "SKILL.md");
	let parsed;
	let diagnostic;
	try {
		parsed = parseSkillMarkdown(new TextDecoder$1("utf-8", { fatal: true }).decode(await readFile(skillPath)));
	} catch (error) {
		diagnostic = error instanceof Error ? error.message : "SKILL.md could not be parsed";
	}
	const entryId = `${root.source}:${legacyRootFlat ? "legacy-active" : active ? "active" : "disabled"}:${item.storageName}`;
	output.push({
		entryId,
		name: parsed?.name ?? item.label.replace(/\.md$/, ""),
		...parsed === void 0 ? {} : { description: parsed.description },
		source: root.source,
		root: root.path,
		storageName: item.storageName,
		path: skillPath,
		rank: root.rank,
		active,
		valid: parsed !== void 0,
		...diagnostic === void 0 ? {} : { diagnostic }
	});
}

//#endregion
//#region src/host/move.ts
/**
* Move one filesystem entry without replacing an existing non-directory target.
* Relative symlink targets are rebased so the moved link keeps the same referent.
* @param from - Existing source entry in the managed root.
* @param to - Destination path on the same filesystem.
* @returns A promise that resolves after the source has been unlinked.
*/
async function moveEntryNoClobber(from, to) {
	const source = await lstat(from);
	if (source.isDirectory() && !source.isSymbolicLink()) {
		await rename(from, to);
		return;
	}
	if (source.isSymbolicLink()) {
		const target = await readlink(from);
		const adjustedTarget = isAbsolute(target) ? target : relative(dirname(to), resolve(dirname(from), target)) || ".";
		let type;
		try {
			type = (await stat(from)).isDirectory() ? "dir" : "file";
		} catch {}
		await symlink(adjustedTarget, to, type);
	} else await link(from, to);
	try {
		await unlink(from);
	} catch (error) {
		throw error;
	}
}

//#endregion
//#region src/host/mutation-queue.ts
const tails = /* @__PURE__ */ new Map();
/** Serialize all in-process mutations targeting one skill root. */
function enqueueMutation(root, operation) {
	const next = (tails.get(root) ?? Promise.resolve()).catch(() => {}).then(operation);
	tails.set(root, next);
	return next.finally(() => {
		if (tails.get(root) === next) tails.delete(root);
	});
}

//#endregion
//#region src/host/relocation.ts
const ROOT_FLAT_ENTRY = "SKILL.md";
const ROOT_FLAT_DISABLED_ALIAS = ".dsh-skill-manager-root-SKILL.md";
/** Move an rc.6 legacy disabled root-level SKILL.md to the provider-safe alias. */
function relocateLegacyRootFlatSkill(root) {
	return enqueueMutation(root, async () => {
		const disabledRoot = await disabledDirectory(root);
		if (disabledRoot === void 0) throw new Error("legacy disabled skill is no longer present");
		const from = join(disabledRoot, ROOT_FLAT_ENTRY);
		const to = join(disabledRoot, ROOT_FLAT_DISABLED_ALIAS);
		try {
			await lstat(from);
		} catch {
			throw new Error("legacy disabled skill is no longer present");
		}
		try {
			await lstat(to);
			throw new Error("skill relocation conflicts with an existing entry");
		} catch (error) {
			if (error instanceof Error && !("code" in error && error.code === "ENOENT")) throw error;
		}
		await moveEntryNoClobber(from, to);
	});
}
/** Move one entry between a root and its private `.disabled` directory. */
function relocateSkill(root, entry, disable) {
	if (!isSafeStorageName(entry)) throw new Error("invalid skill entry");
	if (disable && entry === ROOT_FLAT_DISABLED_ALIAS) throw new Error("skill entry uses the reserved root-level alias");
	return enqueueMutation(root, async () => {
		const disabledRoot = await disabledDirectory(root, { create: disable });
		if (disabledRoot === void 0) throw new Error(disable ? "reserved .disabled directory is unavailable" : "skill entry is no longer present");
		const from = disable ? join(root, entry) : join(disabledRoot, entry === ROOT_FLAT_DISABLED_ALIAS ? ROOT_FLAT_DISABLED_ALIAS : entry);
		const to = disable ? join(disabledRoot, entry === ROOT_FLAT_ENTRY ? ROOT_FLAT_DISABLED_ALIAS : entry) : join(root, entry === ROOT_FLAT_DISABLED_ALIAS ? ROOT_FLAT_ENTRY : entry);
		try {
			await lstat(from);
		} catch {
			throw new Error("skill entry is no longer present");
		}
		try {
			await lstat(to);
			throw new Error("skill relocation conflicts with an existing entry");
		} catch (error) {
			if (error instanceof Error && !("code" in error && error.code === "ENOENT")) throw error;
		}
		await moveEntryNoClobber(from, to);
	});
}
function isSafeStorageName(value) {
	if (value === "" || value === "." || value === ".." || value === ".disabled") return false;
	return !/[\\/\0]/.test(value);
}

//#endregion
//#region src/host/upload.ts
/** Install one validated Markdown or ZIP upload into a shipped local root. */
async function installUpload(root, filename, contentBase64, limits, options = {}) {
	return enqueueMutation(root, () => performUpload(root, filename, contentBase64, limits, options.skipSystem === true));
}
async function performUpload(root, filename, contentBase64, limits, skipSystem) {
	const maxBase64Length = Math.ceil(limits.maxCompressedBytes / 3) * 4;
	if (contentBase64.length > maxBase64Length) throw new Error("compressed upload exceeds limit");
	const bytes = decodeCanonicalBase64(contentBase64);
	if (bytes.byteLength > limits.maxCompressedBytes) throw new Error("compressed upload exceeds limit");
	const lower = filename.toLowerCase();
	const isZip = lower.endsWith(".zip");
	if (!isZip && !lower.endsWith(".md")) throw new Error("upload must be .md or .zip");
	await mkdir(root, {
		recursive: true,
		mode: 448
	});
	const stageParent = dirname(root);
	await mkdir(stageParent, {
		recursive: true,
		mode: 448
	});
	const stage = await mkdtemp(join(stageParent, `.dsh-skill-manager-${randomBytes(8).toString("hex")}-`), { encoding: "utf8" });
	try {
		await chmod(stage, 448);
		let name$1;
		let destination;
		if (isZip) {
			const files = validateUploadArchive(bytes, limits);
			name$1 = parseArchiveSkill(files).name;
			destination = join(root, name$1);
			await assertNoConflict(root, name$1, skipSystem);
			const skillRoot = join(stage, name$1);
			await extractArchive(files, skillRoot);
			await rename(skillRoot, destination);
		} else {
			name$1 = parseSkillMarkdown(decodeUtf8(bytes)).name;
			destination = join(root, `${name$1}.md`);
			await assertNoConflict(root, name$1, skipSystem);
			await writeFile(join(stage, `${name$1}.md`), bytes, { mode: 384 });
			await moveEntryNoClobber(join(stage, `${name$1}.md`), destination);
		}
		return { name: name$1 };
	} finally {
		await rm(stage, {
			recursive: true,
			force: true
		});
	}
}
async function assertNoConflict(root, name$1, skipSystem) {
	const disabledRoot = await disabledDirectory(root);
	const candidates = [
		join(root, name$1),
		join(root, `${name$1}.md`),
		...disabledRoot === void 0 ? [] : [join(disabledRoot, name$1), join(disabledRoot, `${name$1}.md`)]
	];
	for (const path of candidates) try {
		await lstat(path);
		throw new Error(`skill name conflicts with existing entry: ${name$1}`);
	} catch (error) {
		if (error instanceof Error && !("code" in error && error.code === "ENOENT")) throw error;
	}
	for (const area of [root, ...disabledRoot === void 0 ? [] : [disabledRoot]]) {
		let names;
		try {
			names = await readdir(area, { withFileTypes: true });
		} catch (error) {
			const code = error instanceof Error && "code" in error ? error.code : void 0;
			if (code === "ENOENT" || code === "ENOTDIR" || code === "ELOOP") continue;
			throw error;
		}
		for (const item of names) {
			if (item.name === ".disabled" || skipSystem && item.name === ".system") continue;
			const path = join(area, item.name);
			let target;
			try {
				target = await stat(path);
			} catch (error) {
				const code = error instanceof Error && "code" in error ? error.code : void 0;
				if (code === "ENOENT" || code === "ENOTDIR" || code === "ELOOP") continue;
				throw error;
			}
			if (!target.isDirectory() && (!target.isFile() || !item.name.endsWith(".md"))) continue;
			const markdown = target.isFile() ? path : join(path, "SKILL.md");
			let content;
			try {
				content = await readFile(markdown);
			} catch (error) {
				const code = error instanceof Error && "code" in error ? error.code : void 0;
				if (code === "ENOENT" || code === "ENOTDIR" || code === "ELOOP") continue;
				throw error;
			}
			let parsed;
			try {
				parsed = parseSkillMarkdown(decodeUtf8(content));
			} catch {
				continue;
			}
			if (parsed.name === name$1) throw new Error(`skill name conflicts with existing entry: ${name$1}`);
		}
	}
}
async function extractArchive(files, target) {
	await mkdir(target, {
		recursive: true,
		mode: 448
	});
	const skillPath = Object.keys(files).find((path) => path === "SKILL.md" || path.endsWith("/SKILL.md"));
	if (skillPath === void 0) throw new Error("archive must contain SKILL.md");
	const prefix = skillPath === "SKILL.md" ? "" : skillPath.slice(0, -8);
	for (const [path, bytes] of Object.entries(files)) {
		if (path.endsWith("/")) continue;
		const relative$1 = prefix !== "" && path.startsWith(prefix) ? path.slice(prefix.length) : path;
		if (relative$1 === "") throw new Error("archive contains invalid path");
		validateZipPath(relative$1);
		const destination = join(target, relative$1);
		await mkdir(join(destination, ".."), {
			recursive: true,
			mode: 448
		});
		await writeFile(destination, bytes, { mode: 384 });
	}
}

//#endregion
//#region src/host/index.ts
const Config = z.object({
	dshHome: z.string(),
	agentsHome: z.string(),
	maxCompressedUploadBytes: z.natural().min(1).default(5 * 1024 * 1024),
	maxArchiveEntries: z.natural().min(1).default(256),
	maxExtractedBytes: z.natural().min(1).default(20 * 1024 * 1024)
});
const CHANNEL = "/skill-manager";
const brandWorkspaceId = (value) => value;
const errorResult = (_code, message) => ({
	ok: false,
	error: {
		code: "internal",
		message,
		details: {}
	}
});
function resolveSkillManagerHomes(config, env = process.env) {
	return {
		dshHome: resolveDshHome(config.dshHome, env),
		agentsHome: resolve(config.agentsHome ?? env.DSH_AGENTS_HOME ?? join(homedir(), ".agents"))
	};
}
/** Host plugin for local skill catalog management over a loopback RPC channel. */
function apply(ctx, config = {}) {
	const { dshHome, agentsHome } = resolveSkillManagerHomes(config);
	const limits = {
		maxCompressedBytes: config.maxCompressedUploadBytes ?? 5 * 1024 * 1024,
		maxEntries: config.maxArchiveEntries ?? 256,
		maxExtractedBytes: config.maxExtractedBytes ?? 20 * 1024 * 1024
	};
	let invalidateProvider;
	ctx.skills.registerProvider((control) => {
		invalidateProvider = control.invalidate;
		return {
			name: "dsh-skill-manager",
			list: async () => [],
			get: async () => void 0
		};
	});
	const invalidateSkills = () => {
		invalidateProvider?.();
	};
	ctx.inject(["connection"], (connectionCtx) => {
		connectionCtx.connection.rpc.handle(CHANNEL, async (endpoint, payload) => {
			try {
				if (endpoint === "list") return await list(ctx, payload, dshHome, agentsHome);
				if (endpoint === "toggle") return await toggle(ctx, payload, dshHome, agentsHome, invalidateSkills);
				if (endpoint === "upload") return await upload(ctx, payload, dshHome, agentsHome, limits, invalidateSkills);
				return errorResult("NOT_FOUND", "unknown skill-manager endpoint");
			} catch (error) {
				return errorResult("INVALID_REQUEST", error instanceof Error ? error.message : "skill manager request failed");
			}
		}, { authority: "loopback" });
	});
}
async function list(ctx, payload, dshHome, agentsHome) {
	const request = parseList(payload);
	const workspace = request.workspaceId === void 0 ? void 0 : ctx.workspaceRegistry.get(brandWorkspaceId(request.workspaceId));
	if (request.workspaceId !== void 0 && workspace === void 0) return errorResult("WORKSPACE_NOT_FOUND", "workspace was not found");
	return {
		ok: true,
		value: {
			...await discoverSkills(workspace === void 0 ? {
				dshHome,
				agentsHome
			} : {
				workspacePath: workspace.path,
				dshHome,
				agentsHome
			}),
			...workspace === void 0 ? {} : { workspaceId: workspace.id }
		}
	};
}
async function toggle(ctx, payload, dshHome, agentsHome, invalidateSkills) {
	const request = parseToggle(payload);
	const workspace = request.workspaceId === void 0 ? void 0 : ctx.workspaceRegistry.get(brandWorkspaceId(request.workspaceId));
	if (request.workspaceId !== void 0 && workspace === void 0) return errorResult("WORKSPACE_NOT_FOUND", "workspace was not found");
	const entry = (await discoverSkills(workspace === void 0 ? {
		dshHome,
		agentsHome
	} : {
		workspacePath: workspace.path,
		dshHome,
		agentsHome
	})).entries.find((candidate) => candidate.entryId === request.entryId);
	if (entry === void 0) return errorResult("ENTRY_NOT_FOUND", "skill entry was not found in a fresh snapshot");
	if (entry.source.startsWith("project-") && workspace === void 0) return errorResult("WORKSPACE_REQUIRED", "project workspace is required for toggle");
	if (entry.active === request.enabled) return await list(ctx, request.workspaceId === void 0 ? {} : { workspaceId: workspace.id }, dshHome, agentsHome);
	if (!request.enabled && entry.path === join(entry.root, ".disabled", "SKILL.md")) await relocateLegacyRootFlatSkill(entry.root);
	else await relocateSkill(entry.root, entry.storageName, !request.enabled);
	invalidateSkills();
	return await list(ctx, request.workspaceId === void 0 ? {} : { workspaceId: workspace.id }, dshHome, agentsHome);
}
async function upload(ctx, payload, dshHome, agentsHome, limits, invalidateSkills) {
	const request = parseUpload(payload);
	const workspace = request.workspaceId === void 0 ? void 0 : ctx.workspaceRegistry.get(brandWorkspaceId(request.workspaceId));
	if (request.scope === "project" && workspace === void 0) return errorResult("WORKSPACE_REQUIRED", "project workspace is required for upload");
	await installUpload(request.scope === "project" ? join(await resolveProjectRoot(workspace.path), ".dsh", "skills") : join(dshHome, "skills"), request.filename, request.contentBase64, limits, { skipSystem: request.scope === "global" });
	invalidateSkills();
	return await list(ctx, request.workspaceId === void 0 ? {} : { workspaceId: workspace.id }, dshHome, agentsHome);
}
function parseList(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("payload must be an object");
	const workspaceId = value.workspaceId;
	if (workspaceId !== void 0 && typeof workspaceId !== "string") throw new Error("workspaceId must be a string");
	return workspaceId === void 0 ? {} : { workspaceId };
}
function parseToggle(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("payload must be an object");
	const record = value;
	if (typeof record.entryId !== "string" || typeof record.enabled !== "boolean") throw new Error("toggle payload is invalid");
	if (record.workspaceId !== void 0 && typeof record.workspaceId !== "string") throw new Error("workspaceId must be a string");
	return {
		entryId: record.entryId,
		enabled: record.enabled,
		...record.workspaceId === void 0 ? {} : { workspaceId: record.workspaceId }
	};
}
function parseUpload(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("payload must be an object");
	const record = value;
	if (record.scope !== "project" && record.scope !== "global" || typeof record.filename !== "string" || typeof record.contentBase64 !== "string") throw new Error("upload payload is invalid");
	if (record.workspaceId !== void 0 && typeof record.workspaceId !== "string") throw new Error("workspaceId must be a string");
	return {
		scope: record.scope,
		filename: record.filename,
		contentBase64: record.contentBase64,
		...record.workspaceId === void 0 ? {} : { workspaceId: record.workspaceId }
	};
}

//#endregion
//#region src/index.ts
const name = "dsh-skill-manager";
const inject = [
	"connection",
	"workspaceRegistry",
	"skills"
];

//#endregion
export { Config, apply, inject, name };
