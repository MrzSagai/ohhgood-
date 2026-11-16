/* /product?id=<id> (legacy) -> /product/<id>; bare /product -> catalog. */
export async function onRequest({ request }) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const target = id && /^[a-z0-9-]+$/.test(id) ? "/product/" + encodeURIComponent(id) : "/#featured";
  return Response.redirect(new URL(target, url.origin).toString(), 301);
}
