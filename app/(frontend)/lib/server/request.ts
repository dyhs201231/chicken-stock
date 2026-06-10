import { headers } from "next/headers";

export async function getRequestOrigin() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (!host) {
    throw new Error("REQUEST_HOST_MISSING");
  }

  return `${protocol}://${host}`;
}

export async function getRequestCookieHeader() {
  const requestHeaders = await headers();

  return requestHeaders.get("cookie");
}
