"use client";
import { useEffect, useRef, useState } from "react";
import { api, errorText, utcFromKst } from "../lib/api";
import type { ManagedPerformance, Venue, Sale } from "../lib/types";
import {
  Dialog,
  Empty,
  Field,
  Loading,
  Notice,
  Panel,
  Status,
  values,
} from "./ui";
export function Management({ role }: { role: "SELLER" | "ADMIN" }) {
  const [venues, setVenues] = useState<Venue[]>([]),
    [performances, setPerformances] = useState<ManagedPerformance[]>([]),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [step, setStep] = useState<"venues" | "performances" | "schedule">(
      "venues",
    ),
    [selectedId, setSelectedId] = useState<number | null>(null),
    [confirmation, setConfirmation] = useState<{
      performance: ManagedPerformance;
      decision: "APPROVED" | "REJECTED";
    } | null>(null);
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
    const form = e.currentTarget,
      data = values(form);
    void action(async () => {
      await task(data);
      form.reset();
    }, message);
  }
  const selected =
    performances.find((p) => p.id === selectedId) ?? performances[0];
  const operator = role === "SELLER" ? "SELLER WORKSPACE" : "REVIEW CONSOLE";
  return (
    <div className="management-experience">
      <div className="operator-heading">
        <div>
          <p className="eyebrow">{operator}</p>
          <h1>{role === "SELLER" ? "판매자 작업 공간" : "관리자 공연 검수"}</h1>
          <p>
            {role === "SELLER"
              ? "공연의 시작부터 판매 설정까지, 한 곳에서 관리하세요."
              : "공연 정보를 살펴보고 승인과 반려를 결정하세요."}
          </p>
        </div>
        <button
          className="button-outline"
          disabled={busy}
          onClick={() => void action(refresh, "목록을 새로고침했습니다.")}
        >
          관리 목록 새로고침
        </button>
      </div>
      <Notice error={error} notice={notice} />
      <div className="operator-stats">
        <div>
          <span>등록 공연</span>
          <strong>{performances.length}</strong>
        </div>
        <div>
          <span>검수 대기</span>
          <strong>
            {performances.filter((p) => p.approvalStatus === "PENDING").length}
          </strong>
        </div>
        <div>
          <span>{role === "SELLER" ? "내 공연장" : "승인 완료"}</span>
          <strong>
            {role === "SELLER"
              ? venues.length
              : performances.filter((p) => p.approvalStatus === "APPROVED")
                  .length}
          </strong>
        </div>
      </div>
      {role === "SELLER" && (
        <nav className="workflow-nav" aria-label="판매자 업무 단계">
          <button
            aria-pressed={step === "venues"}
            onClick={() => setStep("venues")}
          >
            <span aria-hidden="true">01</span>공연장 관리
          </button>
          <button
            aria-pressed={step === "performances"}
            onClick={() => setStep("performances")}
          >
            <span aria-hidden="true">02</span>공연 등록 관리
          </button>
          <button
            aria-pressed={step === "schedule"}
            onClick={() => setStep("schedule")}
          >
            <span aria-hidden="true">03</span>회차·판매 관리
          </button>
        </nav>
      )}
      {loading ? (
        <Loading>관리 정보를 불러오는 중…</Loading>
      ) : (
        <>
          {role === "SELLER" && step === "venues" && (
            <div className="operator-form-grid">
              <Panel title="공연장 등록">
                <p className="form-intro">
                  실제 좌석을 생성합니다. 행과 좌석 수를 확인해 주세요.
                </p>
                <form
                  onSubmit={(e) =>
                    submit(
                      e,
                      async (d) => {
                        await api.createVenue({
                          name: d.name,
                          rows: Number(d.rows),
                          seatsPerRow: Number(d.seatsPerRow),
                        });
                        setStep("performances");
                      },
                      "공연장이 등록되었습니다.",
                    )
                  }
                >
                  <Field label="공연장 이름" name="name" />
                  <div className="form-two-columns">
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
                  </div>
                  <button disabled={busy}>공연장 등록</button>
                </form>
              </Panel>
              <Panel title="내 공연장">
                {!venues.length ? (
                  <Empty title="등록된 공연장이 없습니다.">
                    먼저 공연장을 등록해 운영을 시작하세요.
                  </Empty>
                ) : (
                  <ul className="venue-list">
                    {venues.map((v) => (
                      <li key={v.id}>
                        <div>
                          <span className="venue-symbol" aria-hidden="true">
                            ▤
                          </span>
                          <strong>{v.name}</strong>
                        </div>
                        <span>{v.seats.length}석</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          )}
          {role === "SELLER" && step === "performances" && (
            <div className="operator-form-grid">
              <Panel title="공연 등록">
                <p className="form-intro">
                  새 공연은 검수 대기로 등록됩니다. 관리자 승인 후 공개됩니다.
                </p>
                <form
                  onSubmit={(e) =>
                    submit(
                      e,
                      async (d) => {
                        const result = await api.createPerformance({
                          title: d.title,
                          description: d.description,
                          venueId: Number(d.venueId),
                        });
                        setSelectedId(result.id);
                        setStep("schedule");
                      },
                      "공연이 등록되었습니다. 관리자 검수를 기다려 주세요.",
                    )
                  }
                >
                  <Field label="공연 제목" name="title" />
                  <div className="field">
                    <label htmlFor="performance-description">공연 설명</label>
                    <textarea
                      id="performance-description"
                      name="description"
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="seller-venue-choice">공연장 선택</label>
                    <select
                      id="seller-venue-choice"
                      name="venueId"
                      required
                      defaultValue=""
                    >
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
                  <button disabled={busy || !venues.length}>공연 등록</button>
                  {!venues.length && (
                    <p className="form-hint">
                      공연장 관리에서 먼저 공연장을 등록해 주세요.
                    </p>
                  )}
                </form>
              </Panel>
              <Panel title="등록 전 확인">
                <ol className="operator-checklist">
                  <li>공연장과 물리 좌석을 먼저 준비하세요.</li>
                  <li>공연 제목과 소개를 정확하게 입력하세요.</li>
                  <li>회차와 회차별 가격을 등록하세요.</li>
                  <li>전 회차 공통 판매 정책을 설정하세요.</li>
                </ol>
                <p className="form-hint">
                  공연을 등록하면 관리자 검수 목록에 표시됩니다. 별도 요청 없이
                  검수 상태를 확인해 주세요.
                </p>
              </Panel>
            </div>
          )}
          {((role === "SELLER" && step === "schedule") || role === "ADMIN") && (
            <div className="record-workspace">
              <Panel
                title={role === "SELLER" ? "내 공연" : "검수 대상 공연"}
                className="record-list-panel"
              >
                {!performances.length ? (
                  <Empty title="공연이 없습니다.">
                    공연이 등록되면 목록에서 확인할 수 있습니다.
                  </Empty>
                ) : (
                  <ul className="record-list">
                    {performances.map((p) => (
                      <li key={p.id}>
                        <button
                          className={
                            "record-button" +
                            (selected?.id === p.id ? " record-selected" : "")
                          }
                          aria-label={`${p.title} 관리 보기`}
                          aria-pressed={selected?.id === p.id}
                          onClick={() => setSelectedId(p.id)}
                        >
                          <span className="record-title">{p.title}</span>
                          <span className="record-meta">공연 #{p.id}</span>
                          <Status value={p.approvalStatus} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
              {selected && (
                <Panel
                  key={selected.id}
                  title={selected.title}
                  className="record-detail"
                >
                  <div className="record-detail-header">
                    <span>
                      공연 #{selected.id} · 공연장 #{selected.venueId}
                    </span>
                    <div className="actions">
                      <Status value={selected.approvalStatus} />
                      <Status value={selected.saleStatus} />
                    </div>
                  </div>
                  <h3>공연 소개</h3>
                  <p className="description">
                    {selected.description || "등록된 소개가 없습니다."}
                  </p>
                  {role === "ADMIN" ? (
                    <div className="review-controls">
                      <h3>검수 결정</h3>
                      <p>
                        자신이 소유한 공연은 검수할 수 없습니다. 서버가 권한을
                        재검증합니다.
                      </p>
                      <div className="actions">
                        <button
                          disabled={busy}
                          aria-label={`${selected.title} 승인`}
                          onClick={() =>
                            setConfirmation({
                              performance: selected,
                              decision: "APPROVED",
                            })
                          }
                        >
                          승인
                        </button>
                        <button
                          className="button-danger-outline"
                          disabled={busy}
                          aria-label={`${selected.title} 반려`}
                          onClick={() =>
                            setConfirmation({
                              performance: selected,
                              decision: "REJECTED",
                            })
                          }
                        >
                          반려
                        </button>
                      </div>
                      <p className="form-hint">
                        검수 결정 전 공연 정보와 선택한 대상을 다시 확인해
                        주세요.
                      </p>
                    </div>
                  ) : (
                    <div className="schedule-forms">
                      <form
                        aria-label={`${selected.title} 회차 등록`}
                        onSubmit={(e) =>
                          submit(
                            e,
                            (d) =>
                              api.createSession(selected.id, {
                                startsAt: utcFromKst(d.startsAt)!,
                                priceKrw: Number(d.priceKrw),
                              }),
                            "회차와 회차별 좌석이 등록되었습니다.",
                          )
                        }
                      >
                        <div className="form-section-heading">
                          <span>01</span>
                          <h3>회차 추가</h3>
                        </div>
                        <Field
                          label={`${selected.title} 공연 시작 KST`}
                          name="startsAt"
                          type="datetime-local"
                        />
                        <Field
                          label={`${selected.title} 회차 가격 KRW`}
                          name="priceKrw"
                          type="number"
                          min={0}
                        />
                        <button disabled={busy}>회차 등록</button>
                      </form>
                      <form
                        aria-label={`${selected.title} 판매 정책`}
                        onSubmit={(e) => {
                          e.preventDefault();
                          const data = values(e.currentTarget);
                          if (Boolean(data.startsAt) !== Boolean(data.endsAt)) {
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
                            await api.sale(selected.id, {
                              status: data.status as Sale["status"],
                              startsAt,
                              endsAt,
                            });
                          }, "전 회차 공통 판매 정책이 저장되었습니다.");
                        }}
                      >
                        <div className="form-section-heading">
                          <span>02</span>
                          <h3>공통 판매 정책</h3>
                        </div>
                        <div className="field">
                          <label htmlFor={`sale-status-${selected.id}`}>
                            {selected.title} 판매 상태
                          </label>
                          <select
                            key={selected.id}
                            id={`sale-status-${selected.id}`}
                            name="status"
                            defaultValue={selected.saleStatus}
                          >
                            <option value="PREPARING">PREPARING · 준비</option>
                            <option value="OPEN">OPEN · 판매</option>
                            <option value="CLOSED">CLOSED · 종료</option>
                          </select>
                        </div>
                        <Field
                          label={`${selected.title} 판매 시작 KST`}
                          name="startsAt"
                          type="datetime-local"
                          required={false}
                        />
                        <Field
                          label={`${selected.title} 판매 종료 KST`}
                          name="endsAt"
                          type="datetime-local"
                          required={false}
                        />
                        <p className="form-hint">
                          기간을 모두 비우면 OPEN 상태에서 무기한 판매합니다.
                          관리자 승인은 별도로 필요합니다. 현재 화면에는 기존
                          판매 기간이 표시되지 않습니다. 저장 전 기존 기간을
                          직접 확인해 주세요.
                        </p>
                        <button disabled={busy}>판매 정책 저장</button>
                      </form>
                    </div>
                  )}
                </Panel>
              )}
            </div>
          )}
        </>
      )}
      {confirmation && (
        <Dialog
          title={
            confirmation.decision === "APPROVED"
              ? "공연을 승인할까요?"
              : "공연을 반려할까요?"
          }
          busy={busy}
          onClose={() => setConfirmation(null)}
        >
          <h3>{confirmation.performance.title}</h3>
          <p className="muted">
            공연 #{confirmation.performance.id}의 검수 상태가 변경됩니다. 공연
            정보와 대상을 다시 확인해 주세요.
          </p>
          <div className="actions">
            <button
              className={
                confirmation.decision === "REJECTED" ? "button-danger" : ""
              }
              disabled={busy}
              onClick={() => {
                const current = confirmation;
                setConfirmation(null);
                void action(
                  async () => {
                    await api.review(current.performance.id, current.decision);
                  },
                  `${current.performance.title} ${current.decision === "APPROVED" ? "승인" : "반려"} 완료`,
                );
              }}
            >
              {confirmation.decision === "APPROVED" ? "승인 확정" : "반려 확정"}
            </button>
            <button
              className="button-outline"
              disabled={busy}
              onClick={() => setConfirmation(null)}
            >
              취소
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
