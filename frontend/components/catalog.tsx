"use client";
import { useEffect, useState } from "react";
import { Poster } from "./ui";
import { getCatalog, formatKrw, type Performance } from "../lib/catalog";
type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; items: Performance[] };
export function Catalog() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });
    getCatalog(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ kind: "ready", items: data.items });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "공연을 불러올 수 없습니다.",
          });
      });
    return () => controller.abort();
  }, [attempt]);
  if (state.kind === "loading")
    return (
      <p role="status" className="loading-state">
        공연을 불러오는 중입니다…
      </p>
    );
  if (state.kind === "error")
    return (
      <section role="alert" className="panel">
        <h2 className="text-xl font-bold">잠시 연결이 끊겼어요</h2>
        <p className="my-4">{state.message}</p>
        <button
          onClick={() => setAttempt((x) => x + 1)}
          className="button-outline"
        >
          다시 시도
        </button>
      </section>
    );
  return (
    <section aria-labelledby="catalog-title">
      <div className="section-heading">
        <h2 id="catalog-title" className="text-2xl font-semibold">
          공연 둘러보기
        </h2>
        <span className="text-sm text-stone-600">
          {state.items.length}개 공연
        </span>
      </div>
      {state.items.length === 0 ? (
        <p role="status" className="empty-state">
          아직 공개된 공연이 없습니다. 다음 무대를 기다려 주세요.
        </p>
      ) : (
        <ul className="performance-grid">
          {state.items.map((p) => (
            <li key={p.id} className="performance-card">
              <Poster id={p.id} />
              <div className="performance-card-content">
                <p className="mb-2 text-sm text-stone-500">{p.venueName}</p>
                <h3 className="text-xl font-semibold">{p.title}</h3>
                <p className="mt-6 font-medium">
                  {formatKrw(p.minPriceKrw)}
                  {p.minPriceKrw !== p.maxPriceKrw
                    ? ` – ${formatKrw(p.maxPriceKrw)}`
                    : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
