export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Legacy product URLs used /product?id=<product-id>.
  // Permanently consolidate them onto the clean product path.
  if (url.pathname === "/product" || url.pathname === "/product/") {
    const id = url.searchParams.get("id");

    if (id && /^[a-z0-9-]+$/.test(id)) {
      return Response.redirect(
        new URL("/product/" + encodeURIComponent(id), url).toString(),
        301
      );
    }
  }

  return context.next();
}
