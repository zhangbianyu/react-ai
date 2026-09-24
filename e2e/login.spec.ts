import { test, expect } from "@playwright/test";

test("登录页面应该正常显示", async ({ page }) => {
  await page.goto("/login");

  await expect(page.locator("input[type=email]")).toBeVisible();

  await expect(page.locator("input[type=password]")).toBeVisible();

  await expect(page.locator("button[type=submit]")).toBeVisible();
});

test("未登录访问 API 应该被拒绝", async ({ request }) => {
  const response = await request.post("/api/agent", {
    data: {
      query: "请搜索 RAG",
    },
  });

  expect([401, 500]).toContain(response.status());
});
