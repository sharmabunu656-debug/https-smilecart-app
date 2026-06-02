import { createFileRoute } from "@tanstack/react-router";

const publicTextFiles = import.meta.glob<string>("../../public/**/*", {
  eager: true,
  import: "default",
  query: "?raw",
});

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

export const Route = createFileRoute("/$")({
  server: {
    handlers: {
      GET: async ({ request }) => servePublicFile(request, false),
      HEAD: async ({ request }) => servePublicFile(request, true),
    },
  },
});

function servePublicFile(request: Request, headOnly: boolean) {
  const url = new URL(request.url);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname.includes("\0") || pathname.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const file = publicTextFiles[`../../public${pathname}`];
  if (typeof file !== "string") {
    return new Response("Not found", { status: 404 });
  }

  return new Response(headOnly ? null : file, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": getContentType(pathname),
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function getContentType(pathname: string) {
  const match = pathname.match(/(\.[^.\/]+)$/);
  return match ? (contentTypes[match[1].toLowerCase()] ?? "text/plain; charset=utf-8") : "text/plain; charset=utf-8";
}