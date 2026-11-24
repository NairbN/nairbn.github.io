# Heisenberg Lab

The showcase site for a self-hosted homelab: one Proxmox host, a handful of containers and VMs, local LLM inference on a 32 GB GPU, and AI agents that run it behind guardrails. Live at <https://nairbn.github.io/>.

The lab's guests are shown as a periodic table: each one has an ID, a two-letter symbol, a name and a role, plus a live status dot. One guest is deliberately shown as top secret.

## How it is built

A static [Astro](https://astro.build) site, plain CSS and a little vanilla TypeScript. No UI kit, no tracking, no third-party requests: fonts (Inter and JetBrains Mono) are self-hosted.

One codebase produces two builds, chosen with `BUILD_TARGET`:

| Command | Output | What it is |
|---|---|---|
| `npm run build:public` | `dist-public/` | This public showcase |
| `npm run build:internal` | `dist-internal/` | A denser dashboard for use on a private network |

Both share the same design tokens, components and rendering code. Each build only contains its own pages.

```sh
npm install
npm run dev:public      # http://localhost:4321
npm run dev:internal
npm run build           # both targets
```

Requires Node 20 or newer (Astro is pinned to 5.x for that reason).

## Data flow

The public page ships with a baked-in snapshot of the lab's status, so it always renders. In the browser it then tries to fetch a fresher snapshot and refreshes it every few minutes while the tab is visible. The live copy is validated field by field before use: if the fetch fails or anything is malformed, the baked snapshot stays on screen.

```
lab  ->  sanitizer (allowlist)  ->  leak check  ->  published branch  ->  browser
```

The live snapshot is produced inside the lab by an allowlist-based sanitizer, scanned by a leak check, and pushed out to a branch of this repository. Nothing on the internet connects into the lab. Fields that could identify or expose the lab are never part of the public schema.

All values from the snapshot are escaped or checked against fixed lists before they reach the page.

## Leak check

Before anything is published (this repository included), a leak check scans the output for private addresses, internal hostnames, secret-looking strings and fields that must not appear in the public schema, and blocks the publish if it finds one. The sample data here is fictional and uses reserved example values (RFC 5737 addresses in `192.0.2.0/24`, RFC 2606 `.example` hostnames) so that the same scanner passes on this repository.

## Content

- `src/content/case-studies/*.md`: case studies (frontmatter: `title`, `summary`, `order`, `stack`, optional `metric`)
- `src/content/lessons/*.md`: lessons learned (frontmatter: `title`, `date`, `summary`)
- `src/content/timeline.json`: build timeline
- `src/data/*.mock.json`: fictional sample data used for development and as the baked fallback

## Accessibility and motion

Dark by default, with a light theme that follows the system or a toggle. Status is always shown as a dot and a word, never colour alone. All motion is off under `prefers-reduced-motion`.

## Credits

Designed and built by [Brian Nguyen](https://github.com/NairbN).
