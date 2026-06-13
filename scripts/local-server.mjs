import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT ?? 5173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") pathname = "/play.html";
    if (pathname.startsWith("/audio/")) pathname = "/public" + pathname;
    if (pathname.startsWith("/skin/")) pathname = "/public" + pathname;

    const file = resolve(root, pathname.slice(1));
    if (!file.startsWith(root)) {
      response.writeHead(403);
      response.end("forbidden");
      return;
    }

    const data = await readFile(file);
    response.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
    response.end(data);
  } catch {
    response.writeHead(404);
    response.end("not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`http://127.0.0.1:${port}/play.html`);
});
