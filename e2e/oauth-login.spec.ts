import { test, expect } from "@playwright/test";

test.describe("OAuth Login Flow", () => {
  test("login page loads with all three OAuth buttons visible", async ({
    page,
  }) => {
    await page.goto("/login");

    const loginForm = page.locator("[data-testid='login-form']");
    await expect(loginForm).toBeVisible();

    const googleButton = page.locator("[data-testid='oauth-button-google']");
    const appleButton = page.locator("[data-testid='oauth-button-apple']");
    const githubButton = page.locator("[data-testid='oauth-button-github']");

    await expect(googleButton).toBeVisible();
    await expect(appleButton).toBeVisible();
    await expect(githubButton).toBeVisible();

    await expect(googleButton).toHaveText(/Entrar com Google/);
    await expect(appleButton).toHaveText(/Entrar com Apple/);
    await expect(githubButton).toHaveText(/Entrar com GitHub/);
  });

  test("clicking Google button initiates OAuth redirect to Supabase authorize endpoint", async ({
    page,
  }) => {
    await page.goto("/login");

    const supabaseAuthRequest = page.waitForRequest((request) => {
      const url = request.url();
      return url.includes("/auth/v1/authorize") && url.includes("provider=google");
    });

    await page.locator("[data-testid='oauth-button-google']").click();

    const request = await supabaseAuthRequest;
    const url = new URL(request.url());

    expect(url.pathname).toBe("/auth/v1/authorize");
    expect(url.searchParams.get("provider")).toBe("google");
    expect(url.searchParams.has("redirect_to")).toBe(true);
    expect(url.searchParams.get("redirect_to")).toContain("/auth/callback");
  });

  test("clicking Apple button initiates OAuth redirect to Supabase authorize endpoint", async ({
    page,
  }) => {
    await page.goto("/login");

    const supabaseAuthRequest = page.waitForRequest((request) => {
      const url = request.url();
      return url.includes("/auth/v1/authorize") && url.includes("provider=apple");
    });

    await page.locator("[data-testid='oauth-button-apple']").click();

    const request = await supabaseAuthRequest;
    const url = new URL(request.url());

    expect(url.pathname).toBe("/auth/v1/authorize");
    expect(url.searchParams.get("provider")).toBe("apple");
    expect(url.searchParams.has("redirect_to")).toBe(true);
    expect(url.searchParams.get("redirect_to")).toContain("/auth/callback");
  });

  test("clicking GitHub button initiates OAuth redirect to Supabase authorize endpoint", async ({
    page,
  }) => {
    await page.goto("/login");

    const supabaseAuthRequest = page.waitForRequest((request) => {
      const url = request.url();
      return url.includes("/auth/v1/authorize") && url.includes("provider=github");
    });

    await page.locator("[data-testid='oauth-button-github']").click();

    const request = await supabaseAuthRequest;
    const url = new URL(request.url());

    expect(url.pathname).toBe("/auth/v1/authorize");
    expect(url.searchParams.get("provider")).toBe("github");
    expect(url.searchParams.has("redirect_to")).toBe(true);
    expect(url.searchParams.get("redirect_to")).toContain("/auth/callback");
  });

  test("unauthenticated user visiting /dashboard is redirected to /login", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await page.waitForURL("**/login**");

    expect(page.url()).toContain("/login");

    const loginForm = page.locator("[data-testid='login-form']");
    await expect(loginForm).toBeVisible();
  });
});
