import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const root = new URL("../public/observatory/", import.meta.url);
const manifest = JSON.parse(await fs.readFile(new URL("assets-manifest.json", root), "utf8"));
assert.ok(manifest.assets.length >= 31, "Runtime manifest is complete");
for (const asset of manifest.assets) {
  assert.ok(!asset.file.includes("..") && !asset.file.startsWith("/"), "Relative asset path");
  const bytes = await fs.readFile(new URL(asset.file, root));
  assert.equal(bytes.length, asset.bytes, asset.file + " byte length");
  assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256, asset.file + " hash");
  assert.ok(asset.source && asset.licence && asset.attribution, asset.file + " provenance");
}
console.log(manifest.assets.length + " runtime files match their recorded hashes and provenance");
