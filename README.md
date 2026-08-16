# DSH Skill Manager

English | [中文](README.zh.md)

DSH Skill Manager adds a visual Skills page to DSH Web. It finds local project and global Skills, shows which copy is active, uploads new Skills, and lets you enable or disable them without moving files by hand.

![DSH Skill Manager preview](docs/images/skill-manager.png)

The screenshot uses an isolated demo environment and contains no personal Skill data.

## What it does

- Finds Skills already installed in the standard DSH project and global directories.
- Separates project Skills from global Skills.
- Searches by name, description, source, or path.
- Uploads a single `SKILL.md` or a ZIP bundle with scripts, templates, and multiple `references/` files.
- Enables or disables a Skill while preserving its files and assets.
- Marks invalid or shadowed entries so name and frontmatter problems are visible.

## Requirements

- macOS, Linux, or Windows with Node.js `^22.19.0 || >=24.0.0`.
- DSH Web. This release is tested with `@deepseek-ai/dsh@0.1.0-rc.6`.
- No global pnpm installation is required; the commands below download a temporary pnpm runner through `npx`.

## Install

### 1. Add the plugin to the Web profile

Run this command in Terminal:

```sh
npx -y -p pnpm@11.19.0 -p @deepseek-ai/dsh \
  -c 'dsh plugin --profile web add github:ZzzzzzzLL/dsh-skill-manager --config.auto-install-peers=false'
```

The command downloads this GitHub repository, builds the plugin, and adds it to the DSH `web` profile. It does not require a clone of the DSH source repository.

### 2. Start DSH Web

```sh
npx @deepseek-ai/dsh web --port 3080
```

Open the address printed by DSH, normally [http://127.0.0.1:3080](http://127.0.0.1:3080). If port 3080 is occupied, use another port such as `--port 3081`.

### 3. Open the manager

In DSH Web, select **Settings → Skills**. Use the **Project** tab for the selected Workspace or the **Global** tab for Skills available to every Workspace.

## Everyday use

### Upload a Skill

Choose **Upload Skill** and select one of these formats:

- A UTF-8 `.md` file containing valid Skill frontmatter.
- A `.zip` bundle containing exactly one `SKILL.md` at the archive root or one directory below it.

A ZIP bundle can contain any number of ordinary resource files within the configured limits. A typical bundle looks like this:

```text
my-skill/
├── SKILL.md
├── scripts/
│   └── run.sh
└── references/
    ├── api.md
    ├── examples.md
    └── guides/
        └── advanced.md
```

The manager preserves the complete directory tree, including every file under `references/`. By default, an upload is limited to a 5 MiB ZIP, 256 entries, and 20 MiB after extraction.

### Enable or disable a Skill

Select **Disable** to keep a Skill on disk but remove it from normal DSH discovery. Select **Enable** to restore it. The manager refreshes its list after its own changes; use **Refresh** after another program changes Skill files.

### Understand Project and Global

- **Project** reads `<project>/.dsh/skills` and `<project>/.agents/skills`. The nearest parent containing `.git` is treated as the project root.
- **Global** reads `$DSH_HOME/skills` and `$DSH_AGENTS_HOME/skills`; their defaults are `~/.dsh/skills` and `~/.agents/skills`.

## Update or remove

Update the GitHub installation:

```sh
npx -y -p pnpm@11.19.0 -p @deepseek-ai/dsh \
  -c 'dsh plugin --profile web update dsh-skill-manager'
```

Remove the plugin without deleting your Skills:

```sh
npx -y -p pnpm@11.19.0 -p @deepseek-ai/dsh \
  -c 'dsh plugin --profile web remove dsh-skill-manager'
```

## Security and limits

The management API accepts loopback browser connections only. The Host resolves Workspace ids and owns filesystem paths; the browser cannot choose an arbitrary destination directory. Uploads validate UTF-8, ZIP paths, entry counts, extracted sizes, Skill frontmatter, and active or disabled name conflicts before publication.

Operations are serialized inside one DSH Host process. Another process can still modify the same directory concurrently, so review unexpected conflicts and press **Refresh** before retrying. Custom provider roots and bundled system Skills are displayed only through their existing providers and are not managed by this plugin.

## Development

Clone this repository, use Node.js `^22.19.0 || >=24.0.0`, then run:

```sh
npx -y pnpm@11.19.0 install
npx -y pnpm@11.19.0 run build
```

The package builds separate Host and browser bundles and can be linked into a Web profile with `dsh plugin --profile web add link:/absolute/path/to/dsh-skill-manager`.

## License

[MIT](LICENSE)
