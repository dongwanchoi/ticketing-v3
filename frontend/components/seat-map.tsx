"use client";
import { useRef } from "react";
import type { SessionSeat } from "../lib/types";
import { formatKrw } from "../lib/catalog";
// Only presentation grouping is inferred from server labels; IDs, order, price and state remain authoritative.
export function groupSeats(seats: SessionSeat[]) {
  const rows = new Map<string, SessionSeat[]>();
  for (const seat of seats) {
    const match = seat.label.match(/^(.+?)[-\s]?(\d+)$/);
    const row = match ? match[1].replace(/[-\s]+$/, "") : "좌석";
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row)!.push(seat);
  }
  return [...rows.entries()];
}
export function SeatMap({
  seats,
  selected,
  disabled,
  onToggle,
}: {
  seats: SessionSeat[];
  selected: number[];
  disabled: boolean;
  onToggle: (id: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <>
      <div className="seat-legend" aria-label="좌석 상태 안내">
        <span>
          <i className="legend-available" />
          선택 가능
        </span>
        <span>
          <i className="legend-selected" />
          선택됨
        </span>
        <span>
          <i className="legend-held" />
          선점 중
        </span>
        <span>
          <i className="legend-booked" />
          예매 완료
        </span>
      </div>
      <div
        className="seat-scroll"
        tabIndex={0}
        role="region"
        aria-label="좌석 배치도 가로 스크롤"
      >
        <p className="stage">
          STAGE<small>무대를 바라보는 방향</small>
        </p>
        <div
          ref={ref}
          className="seat-grid"
          aria-label="좌석 배치도"
          onKeyDown={(e) => {
            if (
              !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key) ||
              !(e.target instanceof HTMLButtonElement)
            )
              return;
            const enabled = Array.from(
                ref.current?.querySelectorAll<HTMLButtonElement>(
                  "button:not(:disabled)",
                ) ?? [],
              ),
              index = enabled.indexOf(e.target);
            if (index < 0) return;
            e.preventDefault();
            const next =
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? enabled.length - 1
                  : Math.max(
                      0,
                      Math.min(
                        enabled.length - 1,
                        index + (e.key === "ArrowRight" ? 1 : -1),
                      ),
                    );
            enabled[next]?.focus();
          }}
        >
          {groupSeats(seats).map(([row, items]) => (
            <div
              className="seat-row"
              role="group"
              aria-label={`${row}행`}
              key={row}
            >
              <span className="row-label" aria-hidden="true">
                {row}
              </span>
              <div className="seat-row-buttons">
                {items.map((s) => (
                  <button
                    key={s.seatId}
                    type="button"
                    className={`seat seat-${s.status.toLowerCase()}`}
                    aria-label={`좌석 ${s.label} ${s.status}`}
                    aria-pressed={selected.includes(s.seatId)}
                    disabled={
                      disabled ||
                      s.status !== "AVAILABLE" ||
                      (!selected.includes(s.seatId) && selected.length >= 4)
                    }
                    title={`${s.label} · ${formatKrw(s.priceKrw)} · ${s.status}`}
                    onClick={() => onToggle(s.seatId)}
                  >
                    {s.label}
                    <small>
                      {s.status === "AVAILABLE"
                        ? selected.includes(s.seatId)
                          ? "선택됨"
                          : "선택 가능"
                        : s.status === "HELD"
                          ? "선점 중"
                          : "예매 완료"}
                    </small>
                  </button>
                ))}
              </div>
              <span className="row-label" aria-hidden="true">
                {row}
              </span>
            </div>
          ))}
        </div>
        <p className="seat-map-help">
          좌석 선택 후 선점해야 자리가 확보됩니다. 방향키·Home·End로 선택 가능한
          좌석 사이를 이동할 수 있습니다.
        </p>
      </div>
    </>
  );
}
