"use client";
import { useEffect, useState } from "react";
import { getCatalog, formatKrw, type Performance } from "../lib/catalog";
type State = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; items: Performance[] };
export function Catalog() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });
    getCatalog(controller.signal).then(data => { if (!controller.signal.aborted) setState({ kind: "ready", items: data.items }); }).catch(error => { if (!controller.signal.aborted) setState({ kind: "error", message: error instanceof Error ? error.message : "공연을 불러올 수 없습니다." }); });
    return () => controller.abort();
  }, [attempt]);
  if (state.kind === "loading") return <p role="status" className="py-16 text-stone-600">공연을 불러오는 중입니다…</p>;
  if (state.kind === "error") return <section role="alert" className="rounded-2xl border border-orange-200 bg-white p-8"><h2 className="text-xl font-bold">잠시 연결이 끊겼어요</h2><p className="my-4">{state.message}</p><button onClick={() => setAttempt(x => x + 1)} className="rounded-full bg-stone-900 px-6 py-3 text-white">다시 시도</button></section>;
  return <section aria-labelledby="catalog-title"><div className="mb-6 flex items-end justify-between"><h2 id="catalog-title" className="text-2xl font-semibold">공연 둘러보기</h2><span className="text-sm text-stone-600">{state.items.length}개 공연</span></div>{state.items.length === 0 ? <p role="status" className="rounded-2xl border border-dashed border-stone-300 px-6 py-16 text-center text-stone-600">아직 공개된 공연이 없습니다. 다음 무대를 기다려 주세요.</p> : <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{state.items.map((p, i) => <li key={p.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white"><div aria-hidden="true" className="flex h-40 items-end bg-stone-800 p-6 text-5xl font-bold text-orange-200">{String(i+1).padStart(2,"0")}</div><div className="p-6"><p className="mb-2 text-sm text-stone-500">{p.venueName}</p><h3 className="text-xl font-semibold">{p.title}</h3><p className="mt-6 font-medium">{formatKrw(p.minPriceKrw)}{p.minPriceKrw !== p.maxPriceKrw ? ` – ${formatKrw(p.maxPriceKrw)}` : ""}</p></div></li>)}</ul>}</section>;
}
