import fs from "node:fs/promises";
import path from "node:path";

const output = path.join(process.cwd(), "dist", "public");
await fs.rm(path.join(output, "__manus__"), { recursive: true, force: true });
await fs.rm(path.join(output, ".gitkeep"), { force: true });
console.log("Removed Manus-only files from the static Pages artifact.");
