import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const input = path.resolve("public/imagenes/favicon.png");
const output = path.resolve("public/imagenes/favicon-transparent.png");

if (!fs.existsSync(input)) {
  console.error("No se encontró:", input);
  process.exit(1);
}

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const max = Math.max(r, g, b);
  if (max < 55) {
    data[i + 3] = 0;
    continue;
  }
  if (max < 80 && r < 70 && g < 70 && b < 70) {
    data[i + 3] = Math.min(data[i + 3], Math.round((max - 55) * 8));
  }
}

await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(output);
console.log("Generado:", output);
