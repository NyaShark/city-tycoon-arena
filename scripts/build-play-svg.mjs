import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const baseUrl =
  process.env.PLAY_BASE_URL ||
  "https://gcore.jsdelivr.net/gh/NyaShark/city-tycoon-arena@main/";
const html = await readFile(join(root, "index.html"), "utf8");
const withBase = html.replace("<head>", `<head>\n    <base href="${baseUrl}" />`);
const srcdoc = withBase
  .replaceAll("&", "&amp;")
  .replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1440 900">
  <foreignObject width="1440" height="900">
    <iframe xmlns="http://www.w3.org/1999/xhtml" width="1440" height="900" srcdoc="${srcdoc}" style="border:0;display:block;width:100vw;height:100vh;background:#ebe4d7"></iframe>
  </foreignObject>
</svg>
`;

await writeFile(join(root, "play.svg"), svg, "utf8");
console.log(`Built play.svg with base ${baseUrl}`);
