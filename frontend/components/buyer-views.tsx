"use client";
import { formatKrw } from "../lib/catalog";
import { kst } from "../lib/api";
import type { BuyerState } from "./use-buyer";
import { Empty, Loading, Panel, Poster, Status } from "./ui";
import { SeatMap } from "./seat-map";
type Props = { state: BuyerState };
export function Discovery({
  state: s,
  compact = false,
}: Props & { compact?: boolean }) {
  return (
    <>
      <section
        className={"discovery-hero" + (compact ? " compact-search" : "")}
        aria-labelledby="discovery-title"
      >
        {!compact && (
          <>
            <p className="eyebrow">
              <span className="eyebrow-dot" />
              DISCOVER YOUR MOMENT
            </p>
            <h1 id="discovery-title">어떤 공연을 찾고 계신가요?</h1>
            <p className="lead">
              좋아하는 공연을 찾고, 나만의 특별한 순간을 준비하세요.
            </p>
          </>
        )}
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            void s.search();
          }}
        >
          <label className="search-field">
            <span className="sr-only">공연 검색</span>
            <span aria-hidden="true" className="search-symbol">
              ⌕
            </span>
            <input
              type="search"
              aria-label="공연 검색"
              value={s.query}
              onChange={(e) => s.setQuery(e.target.value)}
              placeholder="공연명을 검색해 보세요"
            />
          </label>
          <button disabled={s.busy}>검색</button>
        </form>
        {!compact && (
          <div className="discovery-notes">
            <span>회차별 좌석 선택</span>
            <span>한 번에 최대 4석</span>
            <span>선점 유효 시간 5분</span>
          </div>
        )}
      </section>
      {!compact && (
        <section
          className="discovery-results"
          aria-labelledby="performances-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">EXPLORE</p>
              <h2 id="performances-title">공연 둘러보기</h2>
            </div>
            <span className="result-count">{s.items.length}개 공연</span>
          </div>
          {s.loading ? (
            <>
              <Loading>공연을 불러오는 중…</Loading>
              <div className="poster-skeletons" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
            </>
          ) : s.items.length === 0 ? (
            <Empty title="공개된 공연이 없습니다.">
              검색어를 바꾸거나 잠시 후 다시 확인해 주세요.
            </Empty>
          ) : (
            <ul className="performance-grid">
              {s.items.map((p) => (
                <li key={p.id} className="performance-card">
                  <button
                    className="performance-card-button"
                    type="button"
                    disabled={s.busy}
                    onClick={() => void s.pickPerformance(p.id)}
                    aria-label={`${p.title} 상세 보기`}
                  >
                    <Poster id={p.id} />
                    <div className="performance-card-content">
                      <span className="eyebrow">LIVE PERFORMANCE</span>
                      <h3>{p.title}</h3>
                      <p className="venue-name">{p.venueName}</p>
                      <div className="performance-card-footer">
                        <span>
                          {formatKrw(p.minPriceKrw)}
                          {p.minPriceKrw !== p.maxPriceKrw
                            ? ` – ${formatKrw(p.maxPriceKrw)}`
                            : ""}
                        </span>
                        <span aria-hidden="true">↗</span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <aside className="discovery-guide">
            <div>
              <p className="eyebrow">BOOKING GUIDE</p>
              <h3>관람일과 예매 시간은 다릅니다</h3>
              <p>
                회차와 좌석을 확인하고 선점한 뒤, 유효 시간 안에 모의 결제를
                완료해 주세요.
              </p>
            </div>
            <span className="guide-pill">선택 → 선점 → 예매 확정</span>
          </aside>
        </section>
      )}
    </>
  );
}
export function ActiveHolds({ state: s }: Props) {
  if (!s.activeHolds.length && !s.restoring)
    return (
      <div className="holds-empty">
        <span>진행 중인 선점이 없습니다.</span>
        <button
          className="text-button"
          disabled={s.busy || s.restoring}
          onClick={() => void s.refreshHolds()}
        >
          진행 중인 선점 새로고침
        </button>
      </div>
    );
  return (
    <Panel title="진행 중인 선점" className="active-holds">
      {s.restoring ? (
        <Loading>서버의 선점을 확인하는 중…</Loading>
      ) : (
        <ul className="hold-restore-list">
          {s.activeHolds.map((h) => (
            <li key={h.id}>
              <div>
                <Status value="ACTIVE" />
                <strong>
                  선점 #{h.id} <span>· 회차 #{h.sessionId}</span>
                </strong>
                <small>
                  {formatKrw(h.totalKrw)} · 만료 {kst(h.expiresAt)}
                </small>
              </div>
              <button
                className="button-outline"
                disabled={s.busy}
                onClick={() => void s.restoreHold(h.id)}
                aria-label={`선점 ${h.id} 복원`}
              >
                선점 복원 <span aria-hidden="true">↗</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        className="text-button"
        disabled={s.busy || s.restoring}
        onClick={() => void s.refreshHolds()}
      >
        진행 중인 선점 새로고침
      </button>
    </Panel>
  );
}
export function Detail({ state: s }: Props) {
  const d = s.detail!;
  return (
    <>
      <div className="breadcrumbs">
        <button className="text-button" onClick={s.back}>
          공연 목록으로
        </button>
        <span>/</span>
        <span>공연 상세</span>
      </div>
      <div className="performance-detail-grid">
        <div>
          <div className="performance-overview">
            <Poster id={d.id} large />
            <div>
              <p className="eyebrow">LIVE PERFORMANCE</p>
              <h1>{d.title}</h1>
              <dl className="performance-facts">
                <div>
                  <dt>공연장</dt>
                  <dd>{d.venueName}</dd>
                </div>
                <div>
                  <dt>회차</dt>
                  <dd>{d.sessions.length}개 회차</dd>
                </div>
                <div>
                  <dt>안내</dt>
                  <dd>개별 좌석은 로그인 후 확인할 수 있습니다.</dd>
                </div>
              </dl>
              <span className="info-pill">모의 결제 전용 · 실제 청구 없음</span>
            </div>
          </div>
          <Panel title="공연 소개">
            <p className="description">
              {d.description.trim() || "공연 소개가 아직 등록되지 않았습니다."}
            </p>
          </Panel>
          <div className="detail-guidance">
            <h3>예매 전 확인해 주세요</h3>
            <p>
              좌석 선택만으로는 좌석이 확보되지 않습니다. 선점 이후 5분 안에
              모의 결제를 완료해야 예매가 확정됩니다. 모든 관람 일정은 KST
              기준입니다.
            </p>
          </div>
        </div>
        <Panel title="공연 회차" className="session-picker">
          <p className="eyebrow">BOOK YOUR MOMENT</p>
          <p className="muted">원하는 관람 일정을 선택하세요.</p>
          {!s.user && (
            <p className="notice">
              좌석 조회와 예매는 로그인 후 이용할 수 있습니다.
            </p>
          )}
          {!d.sessions.length ? (
            <Empty title="등록된 회차가 없습니다.">
              일정이 등록되면 이곳에서 확인할 수 있습니다.
            </Empty>
          ) : (
            <ul className="session-list">
              {d.sessions.map((session) => (
                <li
                  key={session.id}
                  className={
                    s.sessionId === session.id ? "session-selected" : ""
                  }
                >
                  <time dateTime={session.startsAt}>
                    {kst(session.startsAt)}
                  </time>
                  <div className="session-meta">
                    <span>잔여 {session.remainingSeats}석</span>
                    <strong>
                      {formatKrw(session.minPriceKrw)}
                      {session.minPriceKrw !== session.maxPriceKrw
                        ? ` – ${formatKrw(session.maxPriceKrw)}`
                        : ""}
                    </strong>
                  </div>
                  <button
                    className="button-outline"
                    disabled={!s.user || s.busy || !!s.active}
                    onClick={() => void s.loadSeats(session.id)}
                    aria-label={`회차 ${session.id} 좌석 조회`}
                  >
                    좌석 조회 <span aria-hidden="true">→</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="form-hint">
            가격과 잔여 수는 서버 조회 기준이며, 선점 시 다시 확인됩니다.
          </p>
        </Panel>
      </div>
    </>
  );
}
export function Booking({ state: s }: Props) {
  const selected = s.seats.filter((x) => s.selected.includes(x.seatId));
  return (
    <section className="booking-workspace" aria-label="좌석 선택 및 예매">
      <div className="section-heading">
        <div>
          <p className="eyebrow">RESERVE YOUR MOMENT</p>
          <h2>예매 진행</h2>
        </div>
        <ol className="booking-steps" aria-label="예매 진행 단계">
          <li className={s.hold ? "step-complete" : "step-current"}>
            1 좌석 선택
          </li>
          <li
            className={
              s.active ? "step-current" : s.hold ? "step-complete" : ""
            }
          >
            2 좌석 선점
          </li>
          <li className={s.hold?.status === "CONFIRMED" ? "step-complete" : ""}>
            3 예매 확정
          </li>
        </ol>
      </div>
      <div className="booking-grid">
        {s.sessionId && s.user && (
          <Panel title="좌석 선택" className="seat-panel">
            <div className="seat-panel-top">
              <p>회차 #{s.sessionId} · 한 번에 최대 4석 · 선점 유효 시간 5분</p>
              <button
                className="text-button"
                disabled={s.busy || !!s.active}
                onClick={() => void s.loadSeats(s.sessionId!)}
              >
                좌석 새로고침
              </button>
            </div>
            {!s.seats.length ? (
              <Empty title="좌석이 없습니다." />
            ) : (
              <SeatMap
                seats={s.seats}
                selected={s.selected}
                disabled={s.busy || !!s.active}
                onToggle={s.toggle}
              />
            )}
          </Panel>
        )}
        <div className="checkout-column">
          <Panel title="선택한 좌석" className="selection-summary">
            <div className="summary-count">
              선택 <strong>{s.selected.length}/4석</strong>
            </div>
            {selected.length ? (
              <ul className="selected-seats">
                {selected.map((seat) => (
                  <li key={seat.seatId}>
                    <span>{seat.label}</span>
                    <strong>{formatKrw(seat.priceKrw)}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">
                좌석 배치도에서 원하는 자리를 선택해 주세요.
              </p>
            )}
            <div className="summary-total">
              <span>선택 좌석 합계</span>
              <strong>
                {formatKrw(selected.reduce((sum, x) => sum + x.priceKrw, 0))}
              </strong>
            </div>
            <button
              className="full-width"
              disabled={s.busy || !!s.active || !s.selected.length}
              onClick={() => void s.createHold()}
            >
              선택 좌석 선점
            </button>
            <p className="form-hint">
              최종 금액과 선점 만료시간은 서버가 확정합니다.
            </p>
          </Panel>
          {s.hold && (
            <Panel
              title="선점 및 모의 결제"
              className={
                "payment-panel" +
                (s.remaining < 60 && s.active ? " timer-urgent" : "")
              }
            >
              <div className="payment-status">
                <Status value={s.hold.status} />
                <span>선점 #{s.hold.id}</span>
              </div>
              <p className="hold-seat-ids">
                좌석 ID: {s.hold.seatIds.join(", ")}
              </p>
              <div className="server-total">
                <span>서버 확정 금액</span>
                <strong>{formatKrw(s.hold.totalKrw)}</strong>
              </div>
              <div
                className="hold-timer"
                role="timer"
                aria-label="선점 남은 시간"
              >
                {s.active
                  ? `남은 시간 ${Math.floor(s.remaining / 60)}분 ${s.remaining % 60}초`
                  : s.hold.status === "ACTIVE"
                    ? "선점 시간이 만료되었습니다. 서버 상태를 확인하세요."
                    : `선점 상태: ${s.hold.status}`}
              </div>
              {s.active && (
                <div className="timer-track" aria-hidden="true">
                  <span
                    style={{
                      width: `${Math.max(0, Math.min(100, (s.remaining / 300) * 100))}%`,
                    }}
                  />
                </div>
              )}
              <p className="form-hint">만료: {kst(s.hold.expiresAt)}</p>
              <div className="payment-actions">
                <button
                  disabled={s.successDisabled}
                  onClick={() => void s.pay("SUCCESS")}
                >
                  모의 결제 성공 · 예매 확정
                </button>
                <button
                  className="button-outline"
                  disabled={s.failureDisabled}
                  onClick={() => void s.pay("FAILURE")}
                >
                  모의 결제 실패
                </button>
                <div className="actions">
                  <button
                    className="text-button"
                    disabled={s.busy || s.hold.status === "CONFIRMED"}
                    onClick={() => void s.release()}
                  >
                    선점 해제
                  </button>
                  <button
                    className="text-button"
                    disabled={s.busy}
                    onClick={() => void s.checkHold()}
                  >
                    선점 상태 확인
                  </button>
                </div>
              </div>
              <p className="form-hint">
                실제 결제가 발생하지 않으며 카드 정보를 입력하지 않습니다.
              </p>
              {s.hold.paymentStatus === "FAILED" && !s.payment && (
                <p className="payment-failed">
                  이 선점은 모의 결제 실패 이력이 있어 새 결제 시도를 제공하지
                  않습니다. 선점 해제는 가능합니다.
                </p>
              )}
              {s.payment && (
                <div
                  className={
                    s.payment.status === "SUCCESS"
                      ? "payment-complete"
                      : "payment-failed"
                  }
                  role="status"
                >
                  <span aria-hidden="true">
                    {s.payment.status === "SUCCESS" ? "✓" : "!"}
                  </span>
                  <p>
                    결제 #{s.payment.id}:{" "}
                    {s.payment.status === "SUCCESS"
                      ? `예매 확정 #${s.payment.reservationId}`
                      : "결제 실패 · 새 결제 재시도 미지원"}
                  </p>
                  {s.payment.status === "SUCCESS" && (
                    <small>상단의 내 예매에서 티켓 정보를 확인하세요.</small>
                  )}
                </div>
              )}
            </Panel>
          )}
        </div>
      </div>
    </section>
  );
}
export function History({ state: s }: Props) {
  return (
    <div className="history-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">MY MOMENTS</p>
          <h1>내 예매 내역</h1>
          <p className="muted">확정된 예매와 관람 정보를 확인하세요.</p>
        </div>
        <button
          className="button-outline"
          disabled={s.busy}
          onClick={() => void s.refreshHistory()}
        >
          예매 내역 새로고침
        </button>
      </div>
      {s.loading ? (
        <Loading>예매 내역을 불러오는 중…</Loading>
      ) : !s.reservations.length ? (
        <Empty title="확정된 예매가 없습니다.">
          마음에 드는 공연을 찾아 새로운 순간을 준비해 보세요.
        </Empty>
      ) : (
        <ul className="reservation-list">
          {s.reservations.map((r) => (
            <li key={r.id} className="reservation-ticket">
              <div className="ticket-mark" aria-hidden="true">
                M
              </div>
              <div className="ticket-information">
                <Status value="CONFIRMED" />
                <h3>{r.performanceTitle}</h3>
                <p>{kst(r.startsAt)}</p>
                <p>좌석: {r.seatLabels.join(", ")}</p>
              </div>
              <div className="ticket-total">
                <span>예매 #{r.id}</span>
                <strong>{formatKrw(r.totalKrw)}</strong>
                <small>모의 결제 · 실제 청구 없음</small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
