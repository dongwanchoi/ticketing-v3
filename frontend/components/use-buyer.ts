"use client";
import { useEffect, useRef, useState } from "react";
import { api, errorText } from "../lib/api";
import type {
  User,
  Performance,
  PerformanceDetail,
  SessionSeat,
  Hold,
  Payment,
  Reservation,
} from "../lib/types";
export function useBuyer({
  user,
  history,
}: {
  user: User | null;
  history: boolean;
}) {
  const [bookingVisible, setBookingVisible] = useState(false);
  const [showCheckoutHold, setShowCheckoutHold] = useState(false);
  const [items, setItems] = useState<Performance[]>([]),
    [query, setQuery] = useState(""),
    [detail, setDetail] = useState<PerformanceDetail | null>(null),
    [sessionId, setSessionId] = useState<number | null>(null),
    [seats, setSeats] = useState<SessionSeat[]>([]),
    [selected, setSelected] = useState<number[]>([]),
    [hold, setHold] = useState<Hold | null>(null),
    [activeHolds, setActiveHolds] = useState<Hold[]>([]),
    [restoring, setRestoring] = useState(false),
    [payment, setPayment] = useState<Payment | null>(null),
    [reservations, setReservations] = useState<Reservation[]>([]),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [now, setNow] = useState(Date.now());
  const readVersion = useRef(0),
    holdsVersion = useRef(0);
  const flight = useRef(false),
    holdRequest = useRef<{
      fingerprint: string;
      key: string;
      completed: boolean;
    } | null>(null),
    paymentRequest = useRef<{
      outcome: "SUCCESS" | "FAILURE";
      key: string;
    } | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let alive = true;
    const version = ++readVersion.current;
    setLoading(true);
    setError("");
    (history
      ? api.reservations().then((r) => {
          if (alive && version === readVersion.current)
            setReservations(r.items);
        })
      : api.performances().then((r) => {
          if (alive && version === readVersion.current) setItems(r.items);
        })
    )
      .catch((e) => {
        if (alive && version === readVersion.current) setError(errorText(e));
      })
      .finally(() => {
        if (alive && version === readVersion.current) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [history]);
  useEffect(() => {
    let alive = true;
    if (!user) {
      setActiveHolds([]);
      return;
    }
    const version = ++holdsVersion.current;
    setRestoring(true);
    api
      .holds()
      .then((result) => {
        if (alive && version === holdsVersion.current)
          setActiveHolds(result.items);
      })
      .catch((e) => {
        if (alive && version === holdsVersion.current) setError(errorText(e));
      })
      .finally(() => {
        if (alive && version === holdsVersion.current) setRestoring(false);
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);
  async function restoreHold(id: number) {
    await action(async () => {
      const result = await api.getHold(id); // ownership/expiry are revalidated by server
      setHold(result);
      setShowCheckoutHold(true);
      setBookingVisible(true);
      setPayment(null);
      holdRequest.current = null;
      paymentRequest.current = null;
      setDetail(null);
      if (result.status !== "ACTIVE")
        setActiveHolds((current) => current.filter((h) => h.id !== id));
      await loadSeats(result.sessionId);
      setNotice(
        result.status === "ACTIVE"
          ? "서버의 선점을 복원했습니다. 기존 만료 시간은 유지됩니다."
          : "선점이 만료되거나 종료되었습니다.",
      );
    });
  }
  async function action(task: () => Promise<void>) {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
      flight.current = false;
    }
  }
  async function loadSeats(id: number) {
    const result = await api.seats(id);
    setSeats(result.items);
    setBookingVisible(true);
    setSessionId(id);
    setSelected([]);
  }
  async function pickPerformance(id: number) {
    await action(async () => {
      const result = await api.detail(id);
      setDetail(result);
      setBookingVisible(false);
      setSessionId(null);
      setSeats([]);
      setSelected([]);
    });
  }
  async function createHold() {
    if (!sessionId) return;
    await action(async () => {
      const body = { sessionId, seatIds: [...selected].sort((a, b) => a - b) },
        fingerprint = JSON.stringify(body);
      if (
        holdRequest.current?.fingerprint !== fingerprint ||
        holdRequest.current.completed
      )
        holdRequest.current = {
          fingerprint,
          key: crypto.randomUUID(),
          completed: false,
        };
      const result = await api.hold(body, holdRequest.current.key);
      holdRequest.current.completed = true;
      setHold(result);
      setShowCheckoutHold(true);
      ++holdsVersion.current;
      setRestoring(false);
      setActiveHolds((current) => [
        ...current.filter((h) => h.id !== result.id),
        result,
      ]);
      setPayment(null);
      paymentRequest.current = null;
      setNotice("좌석이 선점되었습니다. 만료 전에 모의 결제를 완료하세요.");
      await loadSeats(sessionId);
    });
  }
  async function pay(outcome: "SUCCESS" | "FAILURE") {
    if (!hold) return;
    await action(async () => {
      if (!paymentRequest.current)
        paymentRequest.current = { outcome, key: crypto.randomUUID() };
      const pending = paymentRequest.current;
      const result = await api.pay(
        hold.id,
        { outcome: pending.outcome },
        pending.key,
      );
      setPayment(result);
      setHold((current) =>
        current ? { ...current, paymentStatus: result.status } : current,
      );
      if (result.status === "SUCCESS") {
        setHold((current) =>
          current ? { ...current, status: "CONFIRMED" } : current,
        );
        ++holdsVersion.current;
        setRestoring(false);
        setActiveHolds((current) => current.filter((h) => h.id !== hold.id));
      }
      setHold(await api.getHold(hold.id));
      if (sessionId) await loadSeats(sessionId);
      setNotice(
        result.status === "SUCCESS"
          ? "예매가 확정되었습니다. 내 예매에서 확인하세요."
          : "모의 결제가 실패했습니다. 이 선점의 새 결제 시도는 제공하지 않습니다.",
      );
    });
  }
  function toggle(id: number) {
    if (hold && hold.status !== "ACTIVE") {
      setShowCheckoutHold(false);
      setNotice("");
    }
    setSelected((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : current.length < 4
          ? [...current, id]
          : current,
    );
  }
  const remaining = hold
    ? Math.max(0, Math.ceil((new Date(hold.expiresAt).getTime() - now) / 1000))
    : 0;
  const active = hold?.status === "ACTIVE" && remaining > 0;
  async function search() {
    await action(async () => {
      const version = ++readVersion.current;
      setLoading(true);
      try {
        const result = await api.performances(query);
        if (version === readVersion.current) {
          setItems(result.items);
          setBookingVisible(false);
          setDetail(null);
          setSessionId(null);
          setSeats([]);
          setSelected([]);
        }
      } finally {
        if (version === readVersion.current) setLoading(false);
      }
    });
  }
  async function refreshHistory() {
    await action(async () => {
      const version = ++readVersion.current;
      setLoading(true);
      try {
        const result = await api.reservations();
        if (version === readVersion.current) setReservations(result.items);
      } finally {
        if (version === readVersion.current) setLoading(false);
      }
    });
  }
  async function refreshHolds() {
    await action(async () => {
      const version = ++holdsVersion.current;
      setRestoring(true);
      try {
        const result = await api.holds();
        if (version === holdsVersion.current) setActiveHolds(result.items);
      } finally {
        if (version === holdsVersion.current) setRestoring(false);
      }
    });
  }
  async function release() {
    if (!hold) return;
    await action(async () => {
      await api.release(hold.id);
      ++holdsVersion.current;
      setRestoring(false);
      setActiveHolds((current) => current.filter((h) => h.id !== hold.id));
      setHold((current) =>
        current
          ? { ...current, status: remaining > 0 ? "RELEASED" : "EXPIRED" }
          : current,
      );
      setHold(await api.getHold(hold.id));
      if (holdRequest.current?.completed) holdRequest.current = null;
      if (sessionId) await loadSeats(sessionId);
      setNotice("선점이 해제되었습니다.");
    });
  }
  async function checkHold() {
    if (!hold) return;
    await action(async () => {
      setHold(await api.getHold(hold.id));
      if (sessionId) await loadSeats(sessionId);
    });
  }
  return {
    bookingVisible,
    user,
    history,
    items,
    query,
    setQuery,
    detail,
    sessionId,
    seats,
    selected,
    hold,
    checkoutHold: showCheckoutHold ? hold : null,
    activeHolds,
    restoring,
    payment,
    reservations,
    busy,
    loading,
    error,
    notice,
    remaining,
    active,
    restoreHold,
    pickPerformance,
    createHold,
    pay,
    toggle,
    search,
    refreshHistory,
    refreshHolds,
    release,
    checkHold,
    loadSeats: (id: number) =>
      action(async () => {
        await loadSeats(id);
        if (hold && hold.status !== "ACTIVE") setShowCheckoutHold(false);
      }),
    back: () => {
      setBookingVisible(false);
      setDetail(null);
      setSessionId(null);
      setSeats([]);
      setSelected([]);
    },
    successDisabled:
      busy ||
      !active ||
      !!payment ||
      !!hold?.paymentStatus ||
      paymentRequest.current?.outcome === "FAILURE",
    failureDisabled:
      busy ||
      !active ||
      !!payment ||
      !!hold?.paymentStatus ||
      paymentRequest.current?.outcome === "SUCCESS",
  };
}
export type BuyerState = ReturnType<typeof useBuyer>;
