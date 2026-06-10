import fs from "node:fs";
import path from "node:path";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const src = path.resolve("public/imagenes/favicon.png");
const outDir = path.resolve("electron/icons");
const outIco = path.join(outDir, "icon.ico");
const outPng = path.join(outDir, "icon.png");
const sizes = [16, 32, 48, 64, 128, 256];

if (!fs.existsSync(src)) {
  console.error("No se encontró el favicon:", src);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const pngBuffers = await Promise.all(
  sizes.map((size) =>
    sharp(src)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer(),
  ),
);

fs.writeFileSync(outPng, pngBuffers[pngBuffers.length - 1]);

const ico = await pngToIco(pngBuffers);
fs.writeFileSync(outIco, ico);
console.log("Icono de escritorio generado:", outIco);
