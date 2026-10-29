"use client";
import { useEffect, useRef, useState } from "react";
import { api, errorText, utcFromKst } from "../lib/api";
import type { ManagedPerformance, Venue, Sale } from "../lib/types";
import { Field, Notice, Panel, values } from "./ui";
export function Management({ role }: { role: "SELLER" | "ADMIN" }) {
  const [venues, setVenues] = useState<Venue[]>([]),
    [performances, setPerformances] = useState<ManagedPerformance[]>([]),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const flight = useRef(false);
  async function refresh() {
    if (role === "SELLER") {
      const [v, p] = await Promise.all([api.venues(), api.managed()]);
      setVenues(v.items);
      setPerformances(p.items);
    } else setPerformances((await api.reviews()).items);
  }
  useEffect(() => {
    refresh()
      .catch((e) => setError(errorText(e)))
      .finally(() => setLoading(false));
  }, [role]);
  async function action(task: () => Promise<void>, message: string) {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
      await refresh();
      setNotice(message);
    } catch (e) {
      setError(errorText(e));
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  function submit(
    e: React.FormEvent<HTMLFormElement>,
    task: (d: Record<string, string>) => Promise<unknown>,
    message: string,
  ) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = values(form);
    void action(async () => {
      await task(data);
      form.reset();
    }, message);
  }
  return (
    <>
      <Notice error={error} notice={notice} />
      <Panel
        title={role === "SELLER" ? "판매자 작업 공간" : "관리자 공연 검수"}
      >
        <p className="muted">
          {role === "SELLER"
            ? "본인 소유의 공연장과 공연을 관리합니다. 공연은 관리자 승인 후 공개됩니다."
            : "자신이 소유한 공연은 검수할 수 없습니다. 서버가 권한을 재검증합니다."}
        </p>
        <button
          disabled={busy}
          onClick={() => void action(refresh, "목록을 새로고침했습니다.")}
        >
          관리 목록 새로고침
        </button>
      </Panel>
      {loading ? (
        <p role="status">관리 정보를 불러오는 중…</p>
      ) : (
        <>
          {role === "SELLER" && (
            <div className="manage-grid">
              <Panel title="공연장 등록">
                <form
                  onSubmit={(e) =>
                    submit(
                      e,
                      (d) =>
                        api.createVenue({
                          name: d.name,
                          rows: Number(d.rows),
                          seatsPerRow: Number(d.seatsPerRow),
                        }),
                      "공연장이 등록되었습니다.",
                    )
                  }
                >
                  <Field label="공연장 이름" name="name" />
                  <Field
                    label="좌석 행 수"
                    name="rows"
                    type="number"
                    min={1}
                    max={26}
                    defaultValue="2"
                  />
                  <Field
                    label="행별 좌석 수"
                    name="seatsPerRow"
                    type="number"
                    min={1}
                    max={50}
                    defaultValue="5"
                  />
                  <button disabled={busy}>공연장 등록</button>
                </form>
                <h3>내 공연장</h3>
                {venues.length === 0 ? (
                  <p>등록된 공연장이 없습니다.</p>
                ) : (
                  <ul>
                    {venues.map((v) => (
                      <li key={v.id}>
                        {v.name} · {v.seats.length}석
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
              <Panel title="공연 등록">
                <form
                  onSubmit={(e) =>
                    submit(
                      e,
                      (d) =>
                        api.createPerformance({
                          title: d.title,
                          description: d.description,
                          venueId: Number(d.venueId),
                        }),
                      "공연이 등록되었습니다. 관리자 검수를 기다려 주세요.",
                    )
                  }
                >
                  <Field label="공연 제목" name="title" />
                  <label className="field">
                    공연 설명
                    <textarea name="description" required />
                  </label>
                  <div className="field">
                    <label htmlFor="seller-venue-choice">공연장 선택</label>
                    <select id="seller-venue-choice" name="venueId" required defaultValue="">
                      <option value="" disabled>
                        공연장을 선택하세요
                      </option>
                      {venues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button disabled={busy || venues.length === 0}>
                    공연 등록
                  </button>
                </form>
              </Panel>
            </div>
          )}
          <Panel title={role === "SELLER" ? "내 공연" : "검수 대상 공연"}>
            {performances.length === 0 ? (
              <p>공연이 없습니다.</p>
            ) : (
              <div className="managed-list">
                {performances.map((p) => (
                  <article className="managed-performance" key={p.id}>
                    <h3>{p.title}</h3>
                    <p>{p.description}</p>
                    <p>
                      공연 #{p.id} · 검수 {p.approvalStatus} · 판매{" "}
                      {p.saleStatus}
                    </p>
                    {role === "ADMIN" ? (
                      <div className="actions">
                        <button
                          disabled={busy}
                          onClick={() =>
                            void action(async () => {
                              await api.review(p.id, "APPROVED");
                            }, `${p.title} 승인 완료`)
                          }
                          aria-label={`${p.title} 승인`}
                        >
                          승인
                        </button>
                        <button
                          disabled={busy}
                          onClick={() =>
                            void action(async () => {
                              await api.review(p.id, "REJECTED");
                            }, `${p.title} 반려 완료`)
                          }
                          aria-label={`${p.title} 반려`}
                        >
                          반려
                        </button>
                      </div>
                    ) : (
                      <div className="manage-grid">
                        <form
                          aria-label={`${p.title} 회차 등록`}
                          onSubmit={(e) =>
                            submit(
                              e,
                              (d) =>
                                api.createSession(p.id, {
                                  startsAt: utcFromKst(d.startsAt)!,
                                  priceKrw: Number(d.priceKrw),
                                }),
                              "회차와 회차별 좌석이 등록되었습니다.",
                            )
                          }
                        >
                          <h4>회차 추가</h4>
                          <Field
                            label={`${p.title} 공연 시작 KST`}
                            name="startsAt"
                            type="datetime-local"
                          />
                          <Field
                            label={`${p.title} 회차 가격 KRW`}
                            name="priceKrw"
                            type="number"
                            min={0}
                          />
                          <button disabled={busy}>회차 등록</button>
                        </form>
                        <form
                          aria-label={`${p.title} 판매 정책`}
                          onSubmit={(e) => {
                            e.preventDefault();
                            const data = values(e.currentTarget);
                            if (
                              Boolean(data.startsAt) !== Boolean(data.endsAt)
                            ) {
                              setError(
                                "판매 시작과 종료를 모두 입력하거나 모두 비워 주세요.",
                              );
                              return;
                            }
                            const startsAt = utcFromKst(data.startsAt),
                              endsAt = utcFromKst(data.endsAt);
                            if (startsAt && endsAt && endsAt <= startsAt) {
                              setError("판매 종료는 시작보다 늦어야 합니다.");
                              return;
                            }
                            void action(async () => {
                              await api.sale(p.id, {
                                status: data.status as Sale["status"],
                                startsAt,
                                endsAt,
                              });
                            }, "전 회차 공통 판매 정책이 저장되었습니다.");
                          }}
                        >
                          <h4>공통 판매 정책</h4>
                          <div className="field">
                            <label htmlFor={`sale-status-${p.id}`}>{p.title} 판매 상태</label>
                            <select id={`sale-status-${p.id}`} name="status" defaultValue={p.saleStatus}>
                              <option value="PREPARING">
                                PREPARING · 준비
                              </option>
                              <option value="OPEN">OPEN · 판매</option>
                              <option value="CLOSED">CLOSED · 종료</option>
                            </select>
                          </div>
                          <Field
                            label={`${p.title} 판매 시작 KST`}
                            name="startsAt"
                            type="datetime-local"
                            required={false}
                          />
                          <Field
                            label={`${p.title} 판매 종료 KST`}
                            name="endsAt"
                            type="datetime-local"
                            required={false}
                          />
                          <p className="muted">
                            기간을 모두 비우면 OPEN 상태에서 무기한 판매합니다.
                            관리자 승인은 별도로 필요합니다.
                          </p>
                          <button disabled={busy}>판매 정책 저장</button>
                        </form>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </Panel>
        </>
      )}
    </>
  );
}
