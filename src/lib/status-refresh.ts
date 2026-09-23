type RpcError = { code?: string; message?: string };

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, string>,
  ) => PromiseLike<{ error: RpcError | null }>;
};

function isMissingRpc(error: RpcError, fn: string): boolean {
  const message = error.message ?? "";
  return (
    error.code === "PGRST202" ||
    message.includes(fn) ||
    /could not find the function/i.test(message) ||
    /schema cache/i.test(message)
  );
}

/** `ok` si la función corrió, `missing` si la migración 005 aún no está aplicada. */
export async function tryRpc(
  supabase: RpcClient,
  fn: string,
  args: Record<string, string>,
): Promise<"ok" | "missing" | "error"> {
  const { error } = await supabase.rpc(fn, args);
  if (!error) return "ok";
  if (isMissingRpc(error, fn)) return "missing";
  return "error";
}
