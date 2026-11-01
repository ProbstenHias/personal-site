#!/usr/bin/env bash
set -euo pipefail
hugo --gc --minify
node <<'JS'
const fs = require('node:fs');
const assert = require('node:assert/strict');
for (const file of ['public/index.html', 'public/posts/grpc-load-balancing-kubernetes/index.html']) {
  assert.ok(fs.existsSync(file), `${file} must exist`);
  const html = fs.readFileSync(file, 'utf8');
  assert.match(html, /data-demo=["']?grpc-load-balancing-kubernetes/, `${file} must embed the post demo`);
  assert.match(html, /src=["']?[^\s>"']*demo\.[a-f0-9]+\.js/, `${file} must load fingerprinted demo.js`);
}
console.log('PASS: homepage and post embed the fingerprinted page-bundle demo');
JS
