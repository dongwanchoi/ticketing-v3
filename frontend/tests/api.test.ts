import { afterEach, describe, expect, it, vi } from "vitest";
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
describe("session API transport with mocked fetch", () => {
  it("fetches CSRF, refreshes after login and logout, never stores auth client-side", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        json({ token: "before", headerName: "X-CSRF-TOKEN" }),
      )
      .mockResolvedValueOnce(
        json({ id: 1, email: "buyer@example.test", role: "BUYER" }),
      )
      .mockResolvedValueOnce(
        json({ token: "after-login", headerName: "X-CSRF-TOKEN" }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        json({ token: "after-logout", headerName: "X-CSRF-TOKEN" }),
      );
    vi.stubGlobal("fetch", fetcher);
    const { api } = await import("../lib/api");
    await api.login({ email: "buyer@example.test", password: "test-password" });
    await api.logout();
    expect(fetcher.mock.calls.map((c) => c[0])).toEqual([
      "/api/auth/csrf",
      "/api/auth/login",
      "/api/auth/csrf",
      "/api/auth/logout",
      "/api/auth/csrf",
    ]);
    expect(fetcher.mock.calls[1][1]).toMatchObject({
      credentials: "same-origin",
      headers: { "X-CSRF-TOKEN": "before" },
    });
    expect(fetcher.mock.calls[3][1]).toMatchObject({
      credentials: "same-origin",
      headers: { "X-CSRF-TOKEN": "after-login" },
    });
  });
  it("transmits exact idempotency key and server-owned pricing is never sent", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        json({ token: "csrf", headerName: "X-CSRF-TOKEN" }),
      )
      .mockResolvedValueOnce(json({ id: 9 }));
    vi.stubGlobal("fetch", fetcher);
    const { api } = await import("../lib/api");
    await api.hold({ sessionId: 2, seatIds: [3] }, "stable-key");
    expect(fetcher.mock.calls[1]).toEqual([
      "/api/holds",
      expect.objectContaining({
        method: "POST",
        headers: {
          "X-CSRF-TOKEN": "csrf",
          "Content-Type": "application/json",
          "Idempotency-Key": "stable-key",
        },
        body: '{"sessionId":2,"seatIds":[3]}',
      }),
    ]);
  });
  it("preserves server error code for user-visible ownership/conflict errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          json({ code: "FORBIDDEN", message: "Not owner" }, 403),
        ),
    );
    const { api } = await import("../lib/api");
    await expect(api.getHold(1)).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
      message: "Not owner",
    });
  });
  it("converts KST form dates to UTC without browser timezone dependence", async () => {
    const { utcFromKst, kst } = await import("../lib/api");
    expect(utcFromKst("2027-01-01T19:00")).toBe("2027-01-01T10:00:00.000Z");
    expect(utcFromKst("")).toBeNull();
    expect(kst("2027-01-01T10:00:00Z")).toContain("KST");
  });
  it("keeps successful logout authoritative when token refresh fails and reacquires before next mutation", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(json({token:"before",headerName:"X-CSRF-TOKEN"}))
      .mockResolvedValueOnce(new Response(null,{status:204}))
      .mockRejectedValueOnce(new TypeError("refresh disconnected"))
      .mockResolvedValueOnce(json({token:"fresh",headerName:"X-CSRF-TOKEN"}))
      .mockResolvedValueOnce(json({id:2,email:"new@example.test",role:"BUYER"}));
    vi.stubGlobal("fetch",fetcher);
    const {api}=await import("../lib/api");
    await expect(api.logout()).resolves.toBeUndefined();
    await api.register({email:"new@example.test",password:"test-password"});
    expect(fetcher.mock.calls.map(c=>c[0])).toEqual(["/api/auth/csrf","/api/auth/logout","/api/auth/csrf","/api/auth/csrf","/api/auth/register"]);
    expect(fetcher.mock.calls[4][1]).toMatchObject({headers:{"X-CSRF-TOKEN":"fresh"}});
  });
  it("keeps successful login identity when follow-up CSRF fetch fails", async () => {
    const user={id:1,email:"buyer@example.test",role:"BUYER"};
    vi.stubGlobal("fetch",vi.fn().mockResolvedValueOnce(json({token:"before",headerName:"X-CSRF-TOKEN"})).mockResolvedValueOnce(json(user)).mockRejectedValueOnce(new TypeError("refresh disconnected")));
    const {api}=await import("../lib/api");
    await expect(api.login({email:user.email,password:"test-password"})).resolves.toEqual(user);
  });

});
