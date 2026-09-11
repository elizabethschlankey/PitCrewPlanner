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
const INCLUDE_RE = /<!--\s*include:\s*([\w.\-]+)\s*-->/g;

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
const body = resolveIncludes(template, []);
const banner = '<!-- GENERATED FILE. Do not edit directly -- edit index.template.html and partials/*.html, then run `node build.js`. -->\n';

fs.writeFileSync(OUTPUT_FILE, banner + body);

const partialCount = fs.readdirSync(PARTIALS_DIR).filter(f => f.endsWith('.html')).length;
console.log(`Built index.html from index.template.html + ${partialCount} partials.`);
