/* Internal files are not part of the public site. Returning 404 keeps notes and tooling private. */
export const onRequest = () => new Response("Not found", { status: 404, headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } });
