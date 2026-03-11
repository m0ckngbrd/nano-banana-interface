import fs from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';

const outputDir = path.resolve('public/icons');
const sizes = [16, 32, 48, 128];

const setPixel = (png, x, y, [r, g, b, a]) => {
  const idx = (png.width * y + x) << 2;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = a;
};

const blend = (base, overlay, alpha) => {
  const inverse = 1 - alpha;
  return Math.round(base * inverse + overlay * alpha);
};

const createIcon = (size) => {
  const png = new PNG({ width: size, height: size });
  const center = (size - 1) / 2;
  const outerRadius = size * 0.46;
  const innerRadius = size * 0.25;
  const bananaRadius = size * 0.18;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const gradient = Math.max(0, Math.min(1, distance / outerRadius));
      let color = [
        blend(55, 15, gradient),
        blend(65, 23, gradient),
        blend(81, 42, gradient),
        255,
      ];

      if (distance <= outerRadius) {
        color = [
          blend(129, 79, gradient),
          blend(140, 70, gradient),
          blend(248, 59, gradient),
          255,
        ];
      }

      const bananaCenterX = center + size * 0.07;
      const bananaCenterY = center - size * 0.03;
      const bananaDx = x - bananaCenterX;
      const bananaDy = y - bananaCenterY;
      const bananaDistance = Math.sqrt(bananaDx * bananaDx + bananaDy * bananaDy);
      const bananaCutoutDx = x - (bananaCenterX - size * 0.1);
      const bananaCutoutDy = y - (bananaCenterY + size * 0.05);
      const bananaCutoutDistance = Math.sqrt(bananaCutoutDx * bananaCutoutDx + bananaCutoutDy * bananaCutoutDy);

      const inBanana = bananaDistance < bananaRadius && bananaCutoutDistance > bananaRadius * 0.86;
      if (inBanana) {
        color = [250, 220, 95, 255];
      }

      const stem = x > center + size * 0.14 && x < center + size * 0.22 && y < center - size * 0.1;
      if (stem) {
        color = [104, 75, 42, 255];
      }

      setPixel(png, x, y, color);
    }
  }

  return PNG.sync.write(png);
};

await fs.mkdir(outputDir, { recursive: true });

await Promise.all(
  sizes.map(async (size) => {
    const filePath = path.join(outputDir, `icon-${size}.png`);
    await fs.writeFile(filePath, createIcon(size));
  }),
);
