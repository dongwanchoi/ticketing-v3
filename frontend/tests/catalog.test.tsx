import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Catalog } from "../components/catalog";
import { getCatalog } from "../lib/catalog";
const fixture = { items: [{id: 1, title: "가을의 무대", venueName: "V3 홀", minPriceKrw: 10000, maxPriceKrw: 30000}] };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function reply(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: {"Content-Type": "application/json"} }); }
describe("public catalog with explicit mock responses", () => {
  it("shows loading before response", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<Catalog />);
    expect(screen.getByRole("status").textContent).toContain("불러오는 중");
  });
  it("renders contract data and KRW range", async () => {
    const fetcher = vi.fn().mockResolvedValue(reply(fixture)); vi.stubGlobal("fetch", fetcher);
    render(<Catalog />);
    expect(await screen.findByText("가을의 무대")).toBeTruthy();
    expect(screen.getByText("10,000원 – 30,000원")).toBeTruthy();
    expect(fetcher).toHaveBeenCalledWith("/api/performances", expect.objectContaining({credentials: "same-origin"}));
  });
  it("renders an honest empty state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({items: []})));
    render(<Catalog />);
    expect(await screen.findByText(/아직 공개된 공연/)).toBeTruthy();
  });
  it("handles server failure and retries", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(reply({code: "INTERNAL_ERROR", message: "internal"}, 500)).mockResolvedValueOnce(reply(fixture));
    vi.stubGlobal("fetch", fetcher); render(<Catalog />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "다시 시도"}));
    expect(await screen.findByText("가을의 무대")).toBeTruthy();
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });
  it("rejects malformed contracts rather than displaying fabricated data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({items: [{...fixture.items[0], minPriceKrw: -1}]})));
    await expect(getCatalog()).rejects.toThrow("형식");
  });
  it("handles network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network unavailable")));
    render(<Catalog />);
    expect((await screen.findByRole("alert")).textContent).toContain("Network unavailable");
  });
});
