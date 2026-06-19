import handler from "../../../products/Tsukiyomi-Platform/apps/server/api/index";

const PREFIX = "/products/tsukiyomi";

export default async function tsukiyomi(
  req: { url?: string },
  res: Parameters<typeof handler>[1],
) {
  const url = req.url || "/";
  if (url.startsWith(PREFIX)) {
    req.url = url.slice(PREFIX.length) || "/";
  }
  return handler(req, res);
}
