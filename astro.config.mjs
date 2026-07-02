// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import { rehypeBaseLinks } from './src/plugins/rehype-base-links.mjs';

const base = '/gilli-tech';

// https://astro.build/config
export default defineConfig({
	site: 'https://davidkabera.github.io',
	base,
	markdown: {
		rehypePlugins: [() => rehypeBaseLinks(base)],
	},
	vite: {
		server: {
			watch: {
				usePolling: true,
			},
		},
	},
	integrations: [
		starlight({
			title: 'Gillytech',
			description: 'Architecture documentation for Gillytech — a collaborative STEM reasoning platform for CBC classrooms.',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/gillytech/gillytech' }],
			sidebar: [
				{
					label: 'Requirements',
					items: [
						{ label: 'Case Study', slug: 'requirements/case-study' },
						{ label: 'ASR Mapping', slug: 'requirements/asr' },
						{ label: 'Acceptance Criteria', slug: 'requirements/ac' },
						{ label: 'SRS', slug: 'requirements/srs' },
					],
				},
				{
					label: 'Architecture',
					items: [
						{ label: 'Architectural Style', slug: 'architecture/as' },
						{ label: 'System Model (C4)', slug: 'architecture/model' },
					],
				},
				{
					label: 'ADRs',
					items: [
						{ label: 'ADR-001', slug: 'adrs/adr-001' },
						{ label: 'ADR-002', slug: 'adrs/adr-002' },
						{ label: 'ADR-003', slug: 'adrs/adr-003' },
						{ label: 'ADR-004', slug: 'adrs/adr-004' },
						{ label: 'ADR-005', slug: 'adrs/adr-005' },
					],
				},
			],
		}),
	],
});
