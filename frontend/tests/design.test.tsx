import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Dialog, Poster } from "../components/ui";
import { groupSeats, SeatMap } from "../components/seat-map";
afterEach(cleanup);
const seats = [
  { seatId: 19, label: "A-1", priceKrw: 17000, status: "AVAILABLE" as const },
  { seatId: 23, label: "A-3", priceKrw: 18000, status: "HELD" as const },
  { seatId: 42, label: "B-2", priceKrw: 25000, status: "AVAILABLE" as const },
  {
    seatId: 55,
    label: "Wheelchair",
    priceKrw: 25000,
    status: "BOOKED" as const,
  },
];
describe("reference-based presentation without invented inventory", () => {
  it("groups only existing server-labelled rows and preserves IDs, gaps and fallback order", () => {
    const groups = groupSeats(seats);
    expect(groups.map(([row]) => row)).toEqual(["A", "B", "좌석"]);
    expect(groups.flatMap(([, items]) => items).map((s) => s.seatId)).toEqual([
      19, 23, 42, 55,
    ]);
    expect(groups[0][1].map((s) => s.label)).toEqual(["A-1", "A-3"]);
    expect(groups.flatMap(([, items]) => items).map((s) => s.priceKrw)).toEqual(
      [17000, 18000, 25000, 25000],
    );
  });
  it("arrow keyboard navigation skips unavailable seats and selection sends exact server ID", () => {
    const toggle = vi.fn();
    render(
      <SeatMap
        seats={seats}
        selected={[]}
        disabled={false}
        onToggle={toggle}
      />,
    );
    const first = screen.getByRole("button", { name: "좌석 A-1 AVAILABLE" }),
      second = screen.getByRole("button", { name: "좌석 B-2 AVAILABLE" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(document.activeElement).toBe(second);
    fireEvent.click(second);
    expect(toggle).toHaveBeenCalledWith(42);
    expect(
      (
        screen.getByRole("button", {
          name: "좌석 A-3 HELD",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.keyDown(second, { key: "Home" });
    expect(document.activeElement).toBe(first);
  });
  it("marks absent poster honestly and fetches no third-party image", () => {
    const { container } = render(<Poster id={42} />);
    expect(
      screen.getByRole("img", { name: "공식 포스터 미등록" }),
    ).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
  });
  it("auth dialog focuses input, traps keyboard, closes with Escape and restores opener focus", () => {
    function Example() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>로그인 열기</button>
          {open && (
            <Dialog title="로그인" onClose={() => setOpen(false)}>
              <label>
                이메일
                <input />
              </label>
              <button>로그인</button>
            </Dialog>
          )}
        </>
      );
    }
    render(<Example />);
    const opener = screen.getByRole("button", { name: "로그인 열기" });
    opener.focus();
    fireEvent.click(opener);
    const email = screen.getByLabelText("이메일");
    expect(document.activeElement).toBe(email);
    const close = screen.getByRole("button", { name: "대화상자 닫기" });
    close.focus();
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "로그인" }),
    );
    fireEvent.keyDown(email, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
