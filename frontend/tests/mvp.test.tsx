import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { api, ApiError } from "../lib/api";
import { Workspace } from "../components/workspace";
import { Buyer } from "../components/buyer";
import { Management } from "../components/management";
vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return {
    ...actual,
    api: Object.fromEntries(Object.keys(actual.api).map((k) => [k, vi.fn()])),
  };
});
const buyer = { id: 1, email: "buyer@example.test", role: "BUYER" as const };
const perf = {
  id: 11,
  title: "테스트 공연",
  venueName: "V3 홀",
  minPriceKrw: 10000,
  maxPriceKrw: 10000,
};
const session = {
  id: 21,
  startsAt: "2027-01-01T10:00:00Z",
  remainingSeats: 5,
  minPriceKrw: 10000,
  maxPriceKrw: 10000,
};
const seats = Array.from({ length: 5 }, (_, i) => ({
  seatId: i + 1,
  label: `A${i + 1}`,
  priceKrw: 10000,
  status: "AVAILABLE" as const,
}));
const managed = {
  id: 11,
  title: "테스트 공연",
  description: "설명",
  venueId: 31,
  approvalStatus: "PENDING" as const,
  saleStatus: "PREPARING" as const,
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.performances).mockResolvedValue({ items: [perf] });
  vi.mocked(api.detail).mockResolvedValue({
    ...perf,
    description: "공연 설명",
    sessions: [session],
  });
  vi.mocked(api.seats).mockResolvedValue({ items: seats });
  vi.mocked(api.reservations).mockResolvedValue({ items: [] });
  vi.mocked(api.holds).mockResolvedValue({ items: [] });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
async function selectSeats() {
  fireEvent.click(
    await screen.findByRole("button", { name: "테스트 공연 상세 보기" }),
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "회차 21 좌석 조회" }),
  );
  await screen.findByRole("button", { name: "좌석 A1 AVAILABLE" });
}
describe("MVP frontend using explicit API mocks", () => {
  it("keeps seat details inaccessible to a guest", async () => {
    render(<Buyer user={null} history={false} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "테스트 공연 상세 보기" }),
    );
    const button = await screen.findByRole("button", {
      name: "회차 21 좌석 조회",
    });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(api.seats).not.toHaveBeenCalled();
  });
  it("enforces max4 selected seats then sends only session/seat IDs and stable key", async () => {
    vi.mocked(api.hold).mockResolvedValue({
      id: 41,
      sessionId: 21,
      seatIds: [1, 2, 3, 4],
      status: "ACTIVE",
      totalKrw: 40000,
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    });
    render(<Buyer user={buyer} history={false} />);
    await selectSeats();
    for (let i = 1; i <= 4; i++)
      fireEvent.click(
        screen.getByRole("button", { name: `좌석 A${i} AVAILABLE` }),
      );
    expect(
      (
        screen.getByRole("button", {
          name: "좌석 A5 AVAILABLE",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "선택 좌석 선점" }));
    await screen.findByRole("timer");
    expect(api.hold).toHaveBeenCalledWith(
      { sessionId: 21, seatIds: [1, 2, 3, 4] },
      expect.any(String),
    );
  });
  it("confirms simulated payment and displays server reservation", async () => {
    const hold = {
      id: 41,
      sessionId: 21,
      seatIds: [1],
      status: "ACTIVE" as const,
      totalKrw: 10000,
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    };
    vi.mocked(api.hold).mockResolvedValue(hold);
    vi.mocked(api.pay).mockResolvedValue({
      id: 51,
      holdId: 41,
      status: "SUCCESS",
      reservationId: 61,
      amountKrw: 10000,
    });
    vi.mocked(api.getHold).mockResolvedValue({ ...hold, status: "CONFIRMED" });
    render(<Buyer user={buyer} history={false} />);
    await selectSeats();
    fireEvent.click(screen.getByRole("button", { name: "좌석 A1 AVAILABLE" }));
    fireEvent.click(screen.getByRole("button", { name: "선택 좌석 선점" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "모의 결제 성공 · 예매 확정" }),
    );
    await screen.findByText("결제 #51: 예매 확정 #61");
    expect(api.pay).toHaveBeenCalledWith(
      41,
      { outcome: "SUCCESS" },
      expect.any(String),
    );
  });
  it("reuses hold idempotency key on ambiguous network failure", async () => {
    vi.mocked(api.hold).mockRejectedValue(new TypeError("network"));
    render(<Buyer user={buyer} history={false} />);
    await selectSeats();
    fireEvent.click(screen.getByRole("button", { name: "좌석 A1 AVAILABLE" }));
    fireEvent.click(screen.getByRole("button", { name: "선택 좌석 선점" }));
    await screen.findByRole("alert");
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "선택 좌석 선점",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "선택 좌석 선점" }));
    await waitFor(() => expect(api.hold).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.hold).mock.calls[0][1]).toBe(
      vi.mocked(api.hold).mock.calls[1][1],
    );
  });
  it("renders reservation history with KST and server prices", async () => {
    vi.mocked(api.reservations).mockResolvedValue({
      items: [
        {
          id: 61,
          performanceTitle: "예매 공연",
          sessionId: 21,
          startsAt: session.startsAt,
          seatLabels: ["A1"],
          totalKrw: 10000,
          status: "CONFIRMED",
        },
      ],
    });
    render(<Buyer user={buyer} history />);
    expect(await screen.findByText("예매 공연")).toBeTruthy();
    expect(screen.getByText(/KST/)).toBeTruthy();
    expect(screen.getByText("10,000원")).toBeTruthy();
  });
  it("registration never supplies a role and logs in after signup", async () => {
    vi.mocked(api.me).mockRejectedValue(
      new ApiError(401, "UNAUTHENTICATED", "login"),
    );
    vi.mocked(api.register).mockResolvedValue(buyer);
    vi.mocked(api.login).mockResolvedValue(buyer);
    render(<Workspace />);
    fireEvent.change(await screen.findByLabelText("이메일"), {
      target: { value: buyer.email },
    });
    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: "test-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "회원가입" }));
    expect(await screen.findByText(/buyer@example.test · BUYER/)).toBeTruthy();
    expect(api.register).toHaveBeenCalledWith({
      email: buyer.email,
      password: "test-password",
    });
    expect(screen.queryByRole("button", { name: "판매자 관리" })).toBeNull();
    expect(screen.queryByRole("button", { name: "관리자 검수" })).toBeNull();
  });
  it("seller creates physical venue with row count and seats per row", async () => {
    vi.mocked(api.venues).mockResolvedValue({ items: [] });
    vi.mocked(api.managed).mockResolvedValue({ items: [] });
    vi.mocked(api.createVenue).mockResolvedValue({
      id: 31,
      name: "새 홀",
      seats: [],
    });
    render(<Management role="SELLER" />);
    fireEvent.change(await screen.findByLabelText("공연장 이름"), {
      target: { value: "새 홀" },
    });
    fireEvent.change(screen.getByLabelText("좌석 행 수"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("행별 좌석 수"), {
      target: { value: "8" },
    });
    fireEvent.click(screen.getByRole("button", { name: "공연장 등록" }));
    await waitFor(() =>
      expect(api.createVenue).toHaveBeenCalledWith({
        name: "새 홀",
        rows: 3,
        seatsPerRow: 8,
      }),
    );
  });
  it("rejects one-sided sale dates without calling API", async () => {
    vi.mocked(api.venues).mockResolvedValue({ items: [] });
    vi.mocked(api.managed).mockResolvedValue({ items: [managed] });
    render(<Management role="SELLER" />);
    const form = await screen.findByRole("form", {
      name: "테스트 공연 판매 정책",
    });
    fireEvent.change(within(form).getByLabelText("테스트 공연 판매 시작 KST"), {
      target: { value: "2027-01-01T09:00" },
    });
    fireEvent.submit(form);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(api.sale).not.toHaveBeenCalled();
  });
  it("admin sends review decision, no client owner or role overrides", async () => {
    vi.mocked(api.reviews).mockResolvedValue({ items: [managed] });
    vi.mocked(api.review).mockResolvedValue({
      ...managed,
      approvalStatus: "APPROVED",
    });
    render(<Management role="ADMIN" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "테스트 공연 승인" }),
    );
    await waitFor(() =>
      expect(api.review).toHaveBeenCalledWith(11, "APPROVED"),
    );
  });
  it("failed simulation disables new payments but permits explicit release", async () => {
    const hold = {
      id: 41,
      sessionId: 21,
      seatIds: [1],
      status: "ACTIVE" as const,
      totalKrw: 10000,
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    };
    vi.mocked(api.hold).mockResolvedValue(hold);
    vi.mocked(api.pay).mockResolvedValue({
      id: 51,
      holdId: 41,
      status: "FAILED",
      reservationId: null,
      amountKrw: 10000,
    });
    vi.mocked(api.getHold)
      .mockResolvedValueOnce(hold)
      .mockResolvedValueOnce({ ...hold, status: "RELEASED" });
    vi.mocked(api.release).mockResolvedValue(undefined);
    render(<Buyer user={buyer} history={false} />);
    await selectSeats();
    fireEvent.click(screen.getByRole("button", { name: "좌석 A1 AVAILABLE" }));
    fireEvent.click(screen.getByRole("button", { name: "선택 좌석 선점" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "모의 결제 실패" }),
    );
    await screen.findByText(/결제 #51/);
    expect(
      (
        screen.getByRole("button", {
          name: "모의 결제 성공 · 예매 확정",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "선점 해제" }));
    await waitFor(() => expect(api.release).toHaveBeenCalledWith(41));
  });
  it("expired hold cannot be paid from the browser", async () => {
    vi.mocked(api.hold).mockResolvedValue({
      id: 41,
      sessionId: 21,
      seatIds: [1],
      status: "ACTIVE",
      totalKrw: 10000,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    render(<Buyer user={buyer} history={false} />);
    await selectSeats();
    fireEvent.click(screen.getByRole("button", { name: "좌석 A1 AVAILABLE" }));
    fireEvent.click(screen.getByRole("button", { name: "선택 좌석 선점" }));
    await screen.findByRole("timer");
    expect(
      (
        screen.getByRole("button", {
          name: "모의 결제 성공 · 예매 확정",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(api.pay).not.toHaveBeenCalled();
  });
  it("retains the new hold key after an expired hold when the new response is lost", async () => {
    vi.mocked(api.hold)
      .mockResolvedValueOnce({
        id: 41,
        sessionId: 21,
        seatIds: [1],
        status: "EXPIRED",
        totalKrw: 10000,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      })
      .mockRejectedValue(new TypeError("response lost"));
    render(<Buyer user={buyer} history={false} />);
    await selectSeats();
    const select = () =>
      fireEvent.click(
        screen.getByRole("button", { name: "좌석 A1 AVAILABLE" }),
      );
    const submit = () =>
      fireEvent.click(screen.getByRole("button", { name: "선택 좌석 선점" }));
    select();
    submit();
    await screen.findByRole("timer");
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "좌석 A1 AVAILABLE",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    select();
    submit();
    await screen.findByRole("alert");
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "선택 좌석 선점",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    submit();
    await waitFor(() => expect(api.hold).toHaveBeenCalledTimes(3));
    const calls = vi.mocked(api.hold).mock.calls;
    expect(calls[0][1]).not.toBe(calls[1][1]);
    expect(calls[1][1]).toBe(calls[2][1]);
  });

  it("exposes exact stable venue and sale select labels independent of option text", async () => {
    vi.mocked(api.venues).mockResolvedValue({
      items: [{ id: 31, name: "옵션 공연장", seats: [] }],
    });
    vi.mocked(api.managed).mockResolvedValue({ items: [managed] });
    render(<Management role="SELLER" />);
    const venue = await screen.findByLabelText("공연장 선택", { exact: true });
    expect(venue.tagName).toBe("SELECT");
    expect(screen.getByRole("combobox", { name: "공연장 선택" })).toBe(venue);
    const sale = screen.getByLabelText("테스트 공연 판매 상태", {
      exact: true,
    });
    expect(
      screen.getByRole("combobox", { name: "테스트 공연 판매 상태" }),
    ).toBe(sale);
    fireEvent.change(venue, { target: { value: "31" } });
    fireEvent.change(sale, { target: { value: "OPEN" } });
    expect((venue as HTMLSelectElement).value).toBe("31");
    expect((sale as HTMLSelectElement).value).toBe("OPEN");
  });

  it("does not let a slower initial catalog replace a newer search result", async () => {
    let completeInitial!: (value: { items: (typeof perf)[] }) => void;
    vi.mocked(api.performances)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          completeInitial = resolve;
        }),
      )
      .mockResolvedValueOnce({
        items: [{ ...perf, id: 12, title: "검색 결과 공연" }],
      });
    render(<Buyer user={buyer} history={false} />);
    fireEvent.change(screen.getByLabelText("공연 검색"), {
      target: { value: "검색 결과" },
    });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    expect(
      await screen.findByRole("button", { name: "검색 결과 공연 상세 보기" }),
    ).toBeTruthy();
    await act(async () => completeInitial({ items: [perf] }));
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    expect(
      screen.queryByRole("button", { name: "테스트 공연 상세 보기" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "검색 결과 공연 상세 보기" }),
    ).toBeTruthy();
  });

  it("removes stale authenticated identity when logout confirms an expired session", async () => {
    vi.mocked(api.me).mockResolvedValue(buyer);
    vi.mocked(api.logout).mockRejectedValue(
      new ApiError(401, "UNAUTHENTICATED", "Login required"),
    );
    render(<Workspace />);
    fireEvent.click(await screen.findByRole("button", { name: "로그아웃" }));
    expect(await screen.findByRole("button", { name: "로그인" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "내 예매" })).toBeNull();
    expect(screen.getByText("로그인 세션이 만료되었습니다.")).toBeTruthy();
  });

  it("lists all own active server holds and explicitly restores without extending expiry or auto-paying", async () => {
    const expiry = new Date(Date.now() + 120000).toISOString();
    const hold = {
      id: 41,
      sessionId: 21,
      seatIds: [1],
      status: "ACTIVE" as const,
      totalKrw: 10000,
      expiresAt: expiry,
    };
    vi.mocked(api.holds).mockResolvedValue({
      items: [hold, { ...hold, id: 42, seatIds: [2] }],
    });
    vi.mocked(api.getHold).mockResolvedValue(hold);
    render(<Buyer user={buyer} history={false} />);
    expect(
      await screen.findByRole("button", { name: "선점 41 복원" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "선점 42 복원" })).toBeTruthy();
    expect(api.getHold).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "선점 41 복원" }));
    await screen.findByRole("timer");
    expect(api.getHold).toHaveBeenCalledWith(41);
    expect(api.seats).toHaveBeenCalledWith(21);
    expect(api.hold).not.toHaveBeenCalled();
    expect(api.pay).not.toHaveBeenCalled();
    expect(screen.getByText(/서버의 선점을 복원했습니다/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "선점 42 복원" })).toBeTruthy();
  });
  it("does not query private active holds for guests", async () => {
    render(<Buyer user={null} history={false} />);
    await screen.findByRole("button", { name: "테스트 공연 상세 보기" });
    expect(api.holds).not.toHaveBeenCalled();
  });

  it("keeps failed-payment holds nonretryable after server restoration while permitting release", async () => {
    const hold = {
      id: 41,
      sessionId: 21,
      seatIds: [1],
      status: "ACTIVE" as const,
      paymentStatus: "FAILED" as const,
      totalKrw: 10000,
      expiresAt: new Date(Date.now() + 120000).toISOString(),
    };
    vi.mocked(api.holds).mockResolvedValue({ items: [hold] });
    vi.mocked(api.getHold).mockResolvedValue(hold);
    render(<Buyer user={buyer} history={false} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "선점 41 복원" }),
    );
    await screen.findByRole("timer");
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "선점 해제" }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
    expect(
      (
        screen.getByRole("button", {
          name: "모의 결제 성공 · 예매 확정",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: "모의 결제 실패",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(api.pay).not.toHaveBeenCalled();
    expect(screen.getByText(/모의 결제 실패 이력이/)).toBeTruthy();
  });
  it("does not let the initial history read overwrite an explicit newer refresh", async () => {
    let completeInitial!: (value: {
      items: import("../lib/types").Reservation[];
    }) => void;
    const reservation = {
      id: 61,
      performanceTitle: "새 예매 내역",
      sessionId: 21,
      startsAt: session.startsAt,
      seatLabels: ["A1"],
      totalKrw: 10000,
      status: "CONFIRMED" as const,
    };
    vi.mocked(api.reservations)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          completeInitial = resolve;
        }),
      )
      .mockResolvedValueOnce({ items: [reservation] });
    render(<Buyer user={buyer} history />);
    fireEvent.click(screen.getByRole("button", { name: "예매 내역 새로고침" }));
    await screen.findByText("새 예매 내역");
    await act(async () => completeInitial({ items: [] }));
    expect(screen.getByText("새 예매 내역")).toBeTruthy();
    expect(screen.queryByText("확정된 예매가 없습니다.")).toBeNull();
  });

  it("does not let an older hold-list response hide a newly created hold", async () => {
    let completeList!: (value: {
      items: import("../lib/types").Hold[];
    }) => void;
    vi.mocked(api.holds).mockReturnValue(
      new Promise((resolve) => {
        completeList = resolve;
      }),
    );
    vi.mocked(api.hold).mockResolvedValue({
      id: 41,
      sessionId: 21,
      seatIds: [1],
      status: "ACTIVE",
      totalKrw: 10000,
      expiresAt: new Date(Date.now() + 120000).toISOString(),
    });
    render(<Buyer user={buyer} history={false} />);
    await selectSeats();
    fireEvent.click(screen.getByRole("button", { name: "좌석 A1 AVAILABLE" }));
    fireEvent.click(screen.getByRole("button", { name: "선택 좌석 선점" }));
    await screen.findByRole("button", { name: "선점 41 복원" });
    await act(async () => completeList({ items: [] }));
    expect(screen.getByRole("button", { name: "선점 41 복원" })).toBeTruthy();
  });
});
