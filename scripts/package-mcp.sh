#!/bin/sh
set -eu
output=${1:-/app/dist/cio-assistant.mcpb}
case "$output" in /*) ;; *) output="$(pwd)/$output";; esac
stage=$(mktemp -d)
trap 'rmdir "$stage" 2>/dev/null || true' EXIT
./node_modules/.bin/esbuild mcp/server.ts --bundle --platform=node --target=node20 --format=cjs --outfile="$stage/server.cjs"
cp mcp/manifest.json "$stage/manifest.json"
mkdir -p "$(dirname "$output")"
(
  cd "$stage"
  zip -q "$output" manifest.json server.cjs
  unlink manifest.json
  unlink server.cjs
)
