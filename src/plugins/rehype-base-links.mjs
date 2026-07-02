import { visit } from 'unist-util-visit';

/**
 * Starlight/Astro's `base` config prefixes assets and Starlight's own
 * generated links (sidebar, pagination) automatically, but it does NOT
 * rewrite root-absolute links written directly in Markdown/MDX content
 * (e.g. `[ADR-002](/adrs/adr-002/)`). This is documented, intentional
 * Starlight behaviour — see https://github.com/withastro/starlight/discussions/3660 —
 * because Starlight can't tell whether a root-absolute link is meant to
 * stay inside the site's base path or deliberately point above it.
 *
 * Every internal cross-reference link in this project's content (ADRs,
 * ASR mapping, case study, etc.) was written as a root-absolute path on
 * the assumption base is `/`. Rather than hand-editing every link for a
 * single deployment target, this plugin rewrites them at build time:
 * any `href` starting with `/` that isn't already prefixed with `base`
 * and isn't protocol-relative (`//`) gets `base` prepended.
 *
 * @param {string} base e.g. '/gillytech-docs'
 */
export function rehypeBaseLinks(base) {
	const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;

	return (tree) => {
		if (!normalizedBase) return;

		visit(tree, 'element', (node) => {
			if (node.tagName !== 'a' || !node.properties) return;
			const href = node.properties.href;
			if (typeof href !== 'string') return;

			// Skip external, protocol-relative, hash-only, and already-prefixed links
			if (
				href.startsWith('//') ||
				href.startsWith('http://') ||
				href.startsWith('https://') ||
				href.startsWith('#') ||
				href.startsWith(normalizedBase + '/') ||
				href === normalizedBase
			) {
				return;
			}

			if (href.startsWith('/')) {
				node.properties.href = normalizedBase + href;
			}
		});
	};
}
