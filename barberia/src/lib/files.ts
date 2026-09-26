import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.join(process.cwd(), "storage");

const types: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function saveImage(file: File, folder: string): Promise<string> {
  const extension = types[file.type];
  if (!extension) throw new Error("La imagen tiene que ser JPG, PNG o WEBP.");
  if (file.size <= 0) throw new Error("La imagen está vacía.");
  if (file.size > 4 * 1024 * 1024) throw new Error("La imagen pasa de 4 MB.");
  const name = `${crypto.randomUUID()}.${extension}`;
  const dir = path.join(root, folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `${folder}/${name}`;
}

export async function readStored(parts: string[]): Promise<{ bytes: Buffer; type: string } | null> {
  if (parts.some((part) => part.includes("..") || part.includes("/") || part.includes("\\"))) return null;
  const target = path.resolve(root, ...parts);
  const storageRoot = path.resolve(root);
  if (!target.startsWith(`${storageRoot}${path.sep}`)) return null;
  try {
    const bytes = await readFile(target);
    const extension = path.extname(target).toLowerCase();
    const type =
      extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : extension === ".svg" ? "image/svg+xml" : "image/jpeg";
    return { bytes, type };
  } catch {
    return null;
  }
}
