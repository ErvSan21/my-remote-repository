import { readStored } from "@/lib/files";
import { auth } from "@/auth";

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (path[0] === "comprobantes") {
    const session = await auth();
    if (!session?.user?.id) return new Response("Entra para ver este comprobante.", { status: 401 });
  }
  const file = await readStored(path);
  if (!file) return new Response("No encontramos el archivo.", { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.type,
      "Cache-Control": path[0] === "comprobantes" ? "private, no-store" : "public, max-age=3600",
    },
  });
}
