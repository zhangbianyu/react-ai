import crypto from "node:crypto";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;

export function getRequestId(request: Request): string {
  const incomingId = request.headers.get("x-request-id");

  if (incomingId && REQUEST_ID_PATTERN.test(incomingId)) {
    return incomingId;
  }

  return crypto.randomUUID();
}
