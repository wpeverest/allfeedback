/**
 * Common block registration entry point.
 *
 * Every block exports { metadata, Edit } from its barrel (./slug/index.ts).
 * This file imports them all and registers in one place.
 *
 * To add a new block:
 *   1. Create resources/scripts/blocks/{slug}/Edit.tsx + index.ts
 *   2. Add one import line below
 *
 * Webpack builds this as a single "blocks" bundle.
 * Each block.json references it via editorScript.
 */

import { registerBlockType } from '@wordpress/blocks';

// ── Block imports — one line per block ───────────────────────────────────
import * as survey from './survey';
// import * as rating from './rating';

// ── Register all ─────────────────────────────────────────────────────────
const blocks = [ survey ];

blocks.forEach( ( { metadata, Edit } ) => {
	registerBlockType( metadata.name, {
		edit: Edit,
		save: () => null, // all blocks are dynamic (PHP render callback)
	} );
} );
