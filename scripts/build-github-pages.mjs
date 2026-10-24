import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const assetDirectory = path.join(projectRoot, "client", "public", "site-assets");
const manifestFile = path.join(projectRoot, "client", "src", "static-asset-manifest.json");

const mediaTypes = {
  png: ["image/png", "images"],
  jpg: ["image/jpeg", "images"],
  jpeg: ["image/jpeg", "images"],
  webp: ["image/webp", "images"],
  gif: ["image/gif", "images"],
  svg: ["image/svg+xml", "images"],
  mp3: ["audio/mpeg", "audio"],
  wav: ["audio/wav", "audio"],
  m4a: ["audio/mp4", "audio"],
  ogg: ["audio/ogg", "audio"],
  mp4: ["video/mp4", "video"],
  webm: ["video/webm", "video"],
  pdf: ["application/pdf", "episodes"],
  ttf: ["font/ttf", "fonts"],
  otf: ["font/otf", "fonts"],
  woff: ["font/woff", "fonts"],
  woff2: ["font/woff2", "fonts"],
};

await fs.mkdir(assetDirectory, { recursive: true });
const entries = await fs.readdir(assetDirectory, { withFileTypes: true });
const assets = [];

for (const entry of entries) {
  if (!entry.isFile() || entry.name.startsWith(".")) continue;
  const extension = path.extname(entry.name).slice(1).toLowerCase();
  const type = mediaTypes[extension];
  if (!type) {
    console.warn(`Skipping unsupported asset type: ${entry.name}`);
    continue;
  }
  const stat = await fs.stat(path.join(assetDirectory, entry.name));
  const [mimeType, category] = type;
  assets.push({ filename: entry.name, category, mimeType, sizeBytes: stat.size });
}

assets.sort((a, b) => a.filename.localeCompare(b.filename));
await fs.writeFile(manifestFile, `${JSON.stringify(assets, null, 2)}\n`, "utf8");
console.log(`Indexed ${assets.length} asset(s) from client/public/site-assets.`);
