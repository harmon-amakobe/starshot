import fs from "node:fs/promises";
import { createHash } from "node:crypto";

const root = new URL("../public/observatory/", import.meta.url);
const textures = JSON.parse(await fs.readFile(new URL("planet-assets.json", root), "utf8"));
const old = JSON.parse(await fs.readFile(new URL("assets-manifest.json", root), "utf8"));
for (const asset of old.assets) {
  const bytes = await fs.readFile(new URL(asset.file, root));
  asset.sha256 = createHash("sha256").update(bytes).digest("hex");
  asset.bytes = bytes.length;
  const texture = textures.find(item => item.displayFile === asset.file);
  if (texture) {
    texture.displaySha256 = asset.sha256;
    texture.displayBytes = asset.bytes;
  }
}
await fs.writeFile(new URL("planet-assets.json", root), JSON.stringify(textures, null, 2) + "\n");
const textureManifest = old.assets.find(asset => asset.file === "planet-assets.json");
const bytes = await fs.readFile(new URL("planet-assets.json", root));
textureManifest.sha256 = createHash("sha256").update(bytes).digest("hex");
textureManifest.bytes = bytes.length;
await fs.writeFile(new URL("assets-manifest.json", root), JSON.stringify(old, null, 2) + "\n");
console.log("Updated runtime hashes. Review provenance before publishing changed assets.");
