import { describe, expect, it } from "vitest";
import { getRequestId } from "@/lib/request-id";

describe("getRequestId", () => {
  it("应该优先使用合法的请求 ID", () => {
    const request = new Request("http://localhost/api/test", {
      headers: {
        "x-request-id": "postman-test-001",
      },
    });

    expect(getRequestId(request)).toBe("postman-test-001");
  });

  it("没有请求 ID 时应该自动生成 UUID", () => {
    const request = new Request("http://localhost/api/test");

    const requestId = getRequestId(request);

    expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("非法请求 ID 应该被替换", () => {
    const request = new Request("http://localhost/api/test", {
      headers: {
        "x-request-id": "bad id with spaces",
      },
    });

    const requestId = getRequestId(request);

    expect(requestId).not.toBe("bad id with spaces");
  });
});
