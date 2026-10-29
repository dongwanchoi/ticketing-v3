"use client";
import { useEffect, useRef, useState } from "react";
import { api, errorText, kst } from "../lib/api";
import type {
  User,
  Performance,
  PerformanceDetail,
  SessionSeat,
  Hold,
  Payment,
  Reservation,
} from "../lib/types";
import { formatKrw } from "../lib/catalog";
import { Notice, Panel } from "./ui";
export function Buyer({
  user,
  history,
}: {
  user: User | null;
  history: boolean;
}) {
  const [items, setItems] = useState<Performance[]>([]),
    [query, setQuery] = useState(""),
    [detail, setDetail] = useState<PerformanceDetail | null>(null),
    [sessionId, setSessionId] = useState<number | null>(null),
    [seats, setSeats] = useState<SessionSeat[]>([]),
    [selected, setSelected] = useState<number[]>([]),
    [hold, setHold] = useState<Hold | null>(null),
    [payment, setPayment] = useState<Payment | null>(null),
    [reservations, setReservations] = useState<Reservation[]>([]),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [now, setNow] = useState(Date.now());
  const flight = useRef(false),
    holdRequest = useRef<{ fingerprint: string; key: string } | null>(null),
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
    setLoading(true);
    setError("");
    (history
      ? api.reservations().then((r) => {
          if (alive) setReservations(r.items);
        })
      : api.performances().then((r) => {
          if (alive) setItems(r.items);
        })
    )
      .catch((e) => {
        if (alive) setError(errorText(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [history]);
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
    setSessionId(id);
    setSelected([]);
  }
  async function pickPerformance(id: number) {
    await action(async () => {
      const result = await api.detail(id);
      setDetail(result);
      setSessionId(null);
      setSeats([]);
      setSelected([]);
    });
  }
  async function createHold() {
    if (!sessionId) return;
    await action(async () => {
      if (
        hold &&
        (hold.status !== "ACTIVE" ||
          new Date(hold.expiresAt).getTime() <= Date.now())
      )
        holdRequest.current = null;
      const body = { sessionId, seatIds: [...selected].sort((a, b) => a - b) },
        fingerprint = JSON.stringify(body);
      if (holdRequest.current?.fingerprint !== fingerprint)
        holdRequest.current = { fingerprint, key: crypto.randomUUID() };
      const result = await api.hold(body, holdRequest.current.key);
      setHold(result);
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
  return (
    <>
      <Notice error={error} notice={notice} />
      {history ? (
        <Panel title="내 예매 내역">
          {loading ? (
            <p role="status">예매 내역을 불러오는 중…</p>
          ) : reservations.length === 0 ? (
            <p>확정된 예매가 없습니다.</p>
          ) : (
            <ul className="cards">
              {reservations.map((r) => (
                <li className="card" key={r.id}>
                  <span className="badge">예매 확정 #{r.id}</span>
                  <h3>{r.performanceTitle}</h3>
                  <p>{kst(r.startsAt)}</p>
                  <p>좌석: {r.seatLabels.join(", ")}</p>
                  <strong>{formatKrw(r.totalKrw)}</strong>
                </li>
              ))}
            </ul>
          )}
          <button
            disabled={busy}
            onClick={() =>
              void action(async () =>
                setReservations((await api.reservations()).items),
              )
            }
          >
            예매 내역 새로고침
          </button>
        </Panel>
      ) : (
        <>
          <Panel title="공연 둘러보기">
            <form
              className="search"
              onSubmit={(e) => {
                e.preventDefault();
                void action(async () => {
                  setItems((await api.performances(query)).items);
                  setDetail(null);
                });
              }}
            >
              <label className="field">
                공연 검색
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="공연 제목"
                />
              </label>
              <button disabled={busy}>검색</button>
            </form>
            {loading ? (
              <p role="status">공연을 불러오는 중…</p>
            ) : items.length === 0 ? (
              <p>공개된 공연이 없습니다.</p>
            ) : (
              <ul className="cards">
                {items.map((p, i) => (
                  <li className="card" key={p.id}>
                    <div className="poster" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <p className="muted">{p.venueName}</p>
                    <h3>{p.title}</h3>
                    <p>
                      {formatKrw(p.minPriceKrw)} – {formatKrw(p.maxPriceKrw)}
                    </p>
                    <button
                      disabled={busy}
                      onClick={() => void pickPerformance(p.id)}
                      aria-label={`${p.title} 상세 보기`}
                    >
                      상세 보기
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {detail && (
            <Panel title={detail.title}>
              <p>{detail.venueName}</p>
              <p className="description">{detail.description}</p>
              <h3>공연 회차</h3>
              {!user && (
                <p className="notice">
                  좌석 조회와 예매는 로그인 후 이용할 수 있습니다.
                </p>
              )}
              {detail.sessions.length === 0 ? (
                <p>등록된 회차가 없습니다.</p>
              ) : (
                <ul className="session-list">
                  {detail.sessions.map((s) => (
                    <li key={s.id}>
                      <div>
                        <strong>{kst(s.startsAt)}</strong>
                        <p>
                          잔여 {s.remainingSeats}석 · {formatKrw(s.minPriceKrw)}{" "}
                          – {formatKrw(s.maxPriceKrw)}
                        </p>
                      </div>
                      <button
                        disabled={!user || busy || !!active}
                        onClick={() => void action(() => loadSeats(s.id))}
                        aria-label={`회차 ${s.id} 좌석 조회`}
                      >
                        좌석 조회
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
          {sessionId && user && (
            <Panel title="좌석 선택">
              <p>회차 #{sessionId} · 한 번에 최대 4석 · 선점 유효 시간 5분</p>
              <p className="stage">STAGE</p>
              {seats.length === 0 ? (
                <p>좌석이 없습니다.</p>
              ) : (
                <div className="seat-grid" aria-label="좌석 배치도">
                  {seats.map((s) => (
                    <button
                      key={s.seatId}
                      aria-label={`좌석 ${s.label} ${s.status}`}
                      aria-pressed={selected.includes(s.seatId)}
                      disabled={
                        busy ||
                        !!active ||
                        s.status !== "AVAILABLE" ||
                        (!selected.includes(s.seatId) && selected.length >= 4)
                      }
                      title={`${s.label} · ${formatKrw(s.priceKrw)} · ${s.status}`}
                      onClick={() => toggle(s.seatId)}
                    >
                      {s.label}
                      <small>{formatKrw(s.priceKrw)}</small>
                      <small>
                        {s.status === "AVAILABLE"
                          ? "선택 가능"
                          : s.status === "HELD"
                            ? "선점 중"
                            : "예매 완료"}
                      </small>
                    </button>
                  ))}
                </div>
              )}
              <p>
                선택 {selected.length}/4석 ·{" "}
                {formatKrw(
                  seats
                    .filter((s) => selected.includes(s.seatId))
                    .reduce((sum, s) => sum + s.priceKrw, 0),
                )}
              </p>
              <div className="actions">
                <button
                  disabled={busy || !!active || selected.length === 0}
                  onClick={() => void createHold()}
                >
                  선택 좌석 선점
                </button>
                <button
                  disabled={busy || !!active}
                  onClick={() => void action(() => loadSeats(sessionId))}
                >
                  좌석 새로고침
                </button>
              </div>
            </Panel>
          )}
          {hold && (
            <Panel title="선점 및 모의 결제">
              <p>
                선점 #{hold.id} · {hold.status}
              </p>
              <p>
                좌석 ID: {hold.seatIds.join(", ")} · 서버 확정 금액{" "}
                {formatKrw(hold.totalKrw)}
              </p>
              <p role="timer" aria-label="선점 남은 시간">
                {active
                  ? `남은 시간 ${Math.floor(remaining / 60)}분 ${remaining % 60}초`
                  : hold.status === "ACTIVE"
                    ? "선점 시간이 만료되었습니다. 서버 상태를 확인하세요."
                    : `선점 상태: ${hold.status}`}
              </p>
              <p>만료: {kst(hold.expiresAt)}</p>
              <p className="muted">
                실제 결제가 발생하지 않으며 카드 정보를 입력하지 않습니다.
              </p>
              <div className="actions">
                <button
                  disabled={
                    busy ||
                    !active ||
                    !!payment ||
                    paymentRequest.current?.outcome === "FAILURE"
                  }
                  onClick={() => void pay("SUCCESS")}
                >
                  모의 결제 성공 · 예매 확정
                </button>
                <button
                  disabled={
                    busy ||
                    !active ||
                    !!payment ||
                    paymentRequest.current?.outcome === "SUCCESS"
                  }
                  onClick={() => void pay("FAILURE")}
                >
                  모의 결제 실패
                </button>
                <button
                  disabled={busy || hold.status === "CONFIRMED"}
                  onClick={() =>
                    void action(async () => {
                      await api.release(hold.id);
                      setHold(await api.getHold(hold.id));
                      holdRequest.current = null;
                      if (sessionId) await loadSeats(sessionId);
                      setNotice("선점이 해제되었습니다.");
                    })
                  }
                >
                  선점 해제
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void action(async () => {
                      setHold(await api.getHold(hold.id));
                      if (sessionId) await loadSeats(sessionId);
                    })
                  }
                >
                  선점 상태 확인
                </button>
              </div>
              {payment && (
                <p role="status">
                  결제 #{payment.id}:{" "}
                  {payment.status === "SUCCESS"
                    ? `예매 확정 #${payment.reservationId}`
                    : "결제 실패 · 새 결제 재시도 미지원"}
                </p>
              )}
            </Panel>
          )}
        </>
      )}
    </>
  );
}
