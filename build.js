#!/usr/bin/env node
/* ---------------------------------------------------------------
   Stitches index.template.html + partials/*.html into index.html.
   No dependencies, no bundler — just string concatenation, so the
   generated file behaves exactly like the old hand-written one
   (same IDs, same load order, works with a plain double-click,
   no local server required).

   Edit index.template.html and/or partials/*.html, then run:
     node build.js
   Never hand-edit index.html — it's overwritten every run.
---------------------------------------------------------------- */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PARTIALS_DIR = path.join(ROOT, 'partials');
const TEMPLATE_FILE = path.join(ROOT, 'index.template.html');
const OUTPUT_FILE = path.join(ROOT, 'index.html');
const VERSION_FILE = path.join(ROOT, 'version.json');
const INCLUDE_RE = /<!--\s*include:\s*([\w.\-]+)\s*-->/g;

// Bump this before deploying a change you want every already-open tab to
// pick up, not just someone's next fresh visit — see js/update-check.js.
// Any string works; a date is easiest to reason about. It's stamped onto
// every local <script>/<link> URL in index.template.html as a ?v=
// cache-busting query string (each one already ends in the __V__ token —
// copy that pattern onto any NEW <script>/<link> tag you add), and
// written to version.json, which open tabs poll to notice a new deploy
// exists. The _headers file is what makes this actually matter: it tells
// Netlify to let browsers cache js/css forever, safe only because this
// version bump is what changes their URL whenever they actually change.
const ASSET_VERSION = '2026-09-24';

function resolveIncludes(content, chain) {
  return content.replace(INCLUDE_RE, (match, name) => {
    if (chain.includes(name)) {
      throw new Error(`build.js: circular include: ${chain.concat(name).join(' -> ')}`);
    }
    const file = path.join(PARTIALS_DIR, name);
    if (!fs.existsSync(file)) {
      throw new Error(`build.js: partial not found: partials/${name} (included from ${chain[chain.length - 1] || 'index.template.html'})`);
    }
    const partial = fs.readFileSync(file, 'utf8');
    return resolveIncludes(partial, chain.concat(name));
  });
}

const template = fs.readFileSync(TEMPLATE_FILE, 'utf8');
const resolved = resolveIncludes(template, []);
const body = resolved.split('__V__').join(ASSET_VERSION);
const banner = '<!-- GENERATED FILE. Do not edit directly -- edit index.template.html and partials/*.html, then run `node build.js`. -->\n';

fs.writeFileSync(OUTPUT_FILE, banner + body);
fs.writeFileSync(VERSION_FILE, JSON.stringify({version: ASSET_VERSION}) + '\n');

const partialCount = fs.readdirSync(PARTIALS_DIR).filter(f => f.endsWith('.html')).length;
console.log(`Built index.html from index.template.html + ${partialCount} partials. Asset version: ${ASSET_VERSION}`);
