import { Unzip, UnzipInflate } from 'fflate'
import { parse as parseYaml } from 'yaml'

const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export interface ParsedSkillMarkdown {
  readonly name: string
  readonly description: string
  readonly body: string
}

export interface UploadLimits {
  readonly maxCompressedBytes: number
  readonly maxEntries: number
  readonly maxExtractedBytes: number
}

/** Parse and validate the required YAML frontmatter of one UTF-8 SKILL.md. */
export function parseSkillMarkdown(input: string): ParsedSkillMarkdown {
  if (!input.startsWith('---')) throw new Error('SKILL.md requires YAML frontmatter')
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/.exec(input)
  if (match === null) throw new Error('SKILL.md frontmatter is malformed')
  const frontmatter = match[1]
  const body = match[2]
  if (frontmatter === undefined || body === undefined) throw new Error('SKILL.md frontmatter is malformed')
  const data = parseYaml(frontmatter) as unknown
  if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new Error('SKILL.md frontmatter must be a mapping')
  const record = data as Record<string, unknown>
  const name = record.name
  const description = record.description
  if (typeof name !== 'string' || !SKILL_NAME.test(name)) throw new Error('SKILL.md name must be kebab-case')
  if (typeof description !== 'string' || description.length === 0) throw new Error('SKILL.md description must be nonempty')
  validateInvocationFields(record)
  return { name, description, body }
}

function validateInvocationFields(data: Record<string, unknown>): void {
  rejectLegacyInvocationKey(data, 'disableModelInvocation', 'disable-model-invocation')
  rejectLegacyInvocationKey(data, 'modelInvocable', 'disable-model-invocation')
  rejectLegacyInvocationKey(data, 'userInvocable', 'user-invocable')
  parseFrontmatterBoolean(data, 'disable-model-invocation')
  parseFrontmatterBoolean(data, 'user-invocable')
}

function rejectLegacyInvocationKey(data: Record<string, unknown>, legacy: string, canonical: string): void {
  if (Object.hasOwn(data, legacy)) throw new Error(`frontmatter field "${legacy}" is unsupported; use "${canonical}"`)
}

function parseFrontmatterBoolean(data: Record<string, unknown>, key: string): boolean | undefined {
  if (!Object.hasOwn(data, key)) return undefined
  const value = data[key]
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1') return true
  if (value === 0 || value === '0') return false
  if (typeof value === 'string') {
    switch (value.toLowerCase()) {
      case 'true':
      case 'yes':
      case 'on':
        return true
      case 'false':
      case 'no':
      case 'off':
        return false
    }
  }
  throw new TypeError(`frontmatter field "${key}" must be a boolean`)
}

/** Validate a base64 archive and its ZIP central-directory bounds before inflate. */
export function validateUploadArchive(bytes: Uint8Array, limits: UploadLimits): Record<string, Uint8Array> {
  if (bytes.byteLength > limits.maxCompressedBytes) throw new Error('compressed upload exceeds limit')
  const declared = inspectZipCentralDirectory(bytes)
  if (declared.length > limits.maxEntries) throw new Error('zip entry count exceeds limit')
  let declaredTotal = 0
  const canonicalNames = new Set<string>()
  for (const item of declared) {
    validateZipPath(item.name)
    const canonicalName = item.name.normalize('NFC').toLowerCase()
    if (canonicalNames.has(canonicalName)) throw new Error(`zip contains canonical path collision: ${item.name}`)
    canonicalNames.add(canonicalName)
    if (item.mode !== undefined && (item.mode & 0xf000) !== 0 && (item.mode & 0xf000) !== 0x4000 && (item.mode & 0xf000) !== 0x8000) throw new Error('zip contains a suspicious file mode')
    declaredTotal += item.uncompressedSize
    if (declaredTotal > limits.maxExtractedBytes) throw new Error('declared extracted bytes exceed limit')
  }
  return unzipStreaming(bytes, declared, limits)
}

interface DeclaredZipEntry { readonly name: string; readonly uncompressedSize: number; readonly mode?: number }

/** Read only ZIP central-directory metadata so declared bombs fail before inflate. */
function inspectZipCentralDirectory(bytes: Uint8Array): DeclaredZipEntry[] {
  if (bytes.byteLength < 22) throw new Error('upload is not a valid zip archive')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const start = Math.max(0, bytes.byteLength - 65_557)
  let eocd = -1
  for (let offset = bytes.byteLength - 22; offset >= start; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) { eocd = offset; break }
  }
  if (eocd < 0) throw new Error('upload is not a valid zip archive')
  if (view.getUint16(eocd + 4, true) !== 0 || view.getUint16(eocd + 6, true) !== 0
    || view.getUint16(eocd + 8, true) !== view.getUint16(eocd + 10, true)) {
    throw new Error('multi-disk zip archives are not supported')
  }
  const count = view.getUint16(eocd + 10, true)
  const centralSize = view.getUint32(eocd + 12, true)
  const centralOffset = view.getUint32(eocd + 16, true)
  if (centralOffset + centralSize > bytes.byteLength) throw new Error('zip central directory is truncated')
  const result: DeclaredZipEntry[] = []
  let offset = centralOffset
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > bytes.byteLength || view.getUint32(offset, true) !== 0x02014b50) throw new Error('zip central directory is malformed')
    const uncompressedSize = view.getUint32(offset + 24, true)
    const externalAttributes = view.getUint32(offset + 38, true)
    const mode = (externalAttributes >>> 16) & 0xffff
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const end = offset + 46 + nameLength + extraLength + commentLength
    if (end > bytes.byteLength) throw new Error('zip central directory is truncated')
    const name = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(offset + 46, offset + 46 + nameLength))
    result.push({ name, uncompressedSize, ...(mode === 0 ? {} : { mode }) })
    offset = end
  }
  if (offset > centralOffset + centralSize) throw new Error('zip central directory is malformed')
  return result
}

/** Validate a single uploaded file or archive path. */
export function validateZipPath(name: string): void {
  if (name.includes('\\') || name.includes('\0') || name.startsWith('/') || /^[A-Za-z]:/.test(name)) throw new Error(`unsafe zip path: ${name}`)
  const parts = name.endsWith('/') ? name.slice(0, -1).split('/') : name.split('/')
  if (parts.length === 0 || parts.some(part => part === '..' || part === '.' || part === '')) throw new Error(`unsafe zip path: ${name}`)
  for (const part of parts) {
    if (part.includes(':') || /[. ]$/.test(part) || /^(?:CON|PRN|AUX|NUL|CLOCK\$|COM[1-9]|LPT[1-9])(?:\..*)?$/i.test(part)) {
      throw new Error(`unsafe zip path: ${name}`)
    }
  }
}

/** Inflate a ZIP incrementally so the actual extracted-byte bound is enforced while data arrives. */
function unzipStreaming(bytes: Uint8Array, declared: readonly DeclaredZipEntry[], limits: UploadLimits): Record<string, Uint8Array> {
  const files: Record<string, Uint8Array> = Object.create(null) as Record<string, Uint8Array>
  const declaredByName = new Map<string, DeclaredZipEntry>()
  for (const item of declared) {
    if (declaredByName.has(item.name)) throw new Error(`zip contains duplicate entry: ${item.name}`)
    declaredByName.set(item.name, item)
  }
  const seen = new Set<string>()
  let total = 0
  let failure: Error | undefined
  const unzip = new Unzip(file => {
    if (failure !== undefined) return
    const expected = declaredByName.get(file.name)
    if (expected === undefined || seen.has(file.name)) {
      failure = new Error('zip entry metadata does not match central directory')
      throw failure
    }
    seen.add(file.name)
    validateZipPath(file.name)
    const originalSize = (file as unknown as { originalSize?: unknown }).originalSize
    if (typeof originalSize === 'number' && originalSize !== expected.uncompressedSize) {
      failure = new Error('zip entry original size does not match central directory')
      throw failure
    }
    const chunks: Uint8Array[] = []
    let actual = 0
    file.ondata = (error, data, final) => {
      if (error !== null) {
        failure = error instanceof Error ? error : new Error(String(error))
        throw failure
      }
      actual += data.byteLength
      total += data.byteLength
      if (actual > limits.maxExtractedBytes || total > limits.maxExtractedBytes) {
        failure = new Error('actual extracted bytes exceed limit')
        throw failure
      }
      chunks.push(data.slice())
      if (final) {
        const output = new Uint8Array(actual)
        let offset = 0
        for (const chunk of chunks) {
          output.set(chunk, offset)
          offset += chunk.byteLength
        }
        files[file.name] = output
      }
    }
    file.start()
  })
  unzip.register(UnzipInflate)
  const chunkSize = 8 * 1024
  for (let offset = 0; offset < bytes.byteLength; offset += chunkSize) {
    const end = Math.min(bytes.byteLength, offset + chunkSize)
    unzip.push(bytes.subarray(offset, end), end === bytes.byteLength)
    if (failure !== undefined) throw failure
  }
  if (seen.size !== declaredByName.size) throw new Error('zip entry count does not match central directory')
  return files
}

/** Decode canonical base64 without accepting whitespace or alternate alphabets. */
export function decodeCanonicalBase64(value: string): Uint8Array {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new Error('contentBase64 is not canonical base64')
  const bytes = Buffer.from(value, 'base64')
  if (bytes.toString('base64') !== value) throw new Error('contentBase64 is not canonical base64')
  return new Uint8Array(bytes)
}

/** Decode one UTF-8 SKILL.md and reject replacement characters. */
export function decodeUtf8(bytes: Uint8Array): string {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  if (text.includes('\uFFFD')) throw new Error('SKILL.md is not valid UTF-8')
  return text
}

/** Return the single valid SKILL.md path accepted by archive layout rules. */
export function skillMarkdownPath(files: Record<string, Uint8Array>): string {
  const paths = Object.keys(files).filter(path => path.endsWith('/SKILL.md') || path === 'SKILL.md')
  if (paths.length !== 1) throw new Error('archive must contain exactly one SKILL.md')
  const path = paths[0]
  if (path === undefined) throw new Error('archive must contain exactly one SKILL.md')
  const depth = path.split('/').length
  if (depth > 2) throw new Error('SKILL.md must be at the archive root or one directory deep')
  if (depth === 2) {
    const prefix = path.slice(0, path.lastIndexOf('/') + 1)
    if (Object.keys(files).some(candidate => candidate !== path && !candidate.startsWith(prefix))) throw new Error('archive files must share SKILL.md top-level directory')
  }
  return path
}

/** Convert an archive SKILL.md to validated metadata. */
export function parseArchiveSkill(files: Record<string, Uint8Array>): ParsedSkillMarkdown {
  const path = skillMarkdownPath(files)
  const bytes = files[path]
  if (bytes === undefined) throw new Error('archive SKILL.md content is missing')
  return parseSkillMarkdown(decodeUtf8(bytes))
}
