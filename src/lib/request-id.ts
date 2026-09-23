import crypto from "node:crypto";

export function getRequestId(request: Request): string {
  const incomingId = request.headers.get("x-request-id");

  if (incomingId && incomingId.length <= 100) {
    return incomingId;
  }

  return crypto.randomUUID();
}
