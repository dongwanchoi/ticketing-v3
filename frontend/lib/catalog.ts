export type Performance = {
  id: number;
  title: string;
  venueName: string;
  minPriceKrw: number;
  maxPriceKrw: number;
};
export type CatalogResponse = { items: Performance[] };
function isPerformance(value: unknown): value is Performance {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "number" &&
    Number.isSafeInteger(p.id) &&
    typeof p.title === "string" &&
    typeof p.venueName === "string" &&
    typeof p.minPriceKrw === "number" &&
    Number.isInteger(p.minPriceKrw) &&
    p.minPriceKrw >= 0 &&
    typeof p.maxPriceKrw === "number" &&
    Number.isInteger(p.maxPriceKrw) &&
    p.maxPriceKrw >= p.minPriceKrw
  );
}
export async function getCatalog(
  signal?: AbortSignal,
): Promise<CatalogResponse> {
  const response = await fetch("/api/performances", {
    signal,
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(
      "공연 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== "object" ||
    !Array.isArray((data as CatalogResponse).items) ||
    !(data as CatalogResponse).items.every(isPerformance)
  )
    throw new Error("공연 정보 형식이 올바르지 않습니다.");
  return data as CatalogResponse;
}
export function formatKrw(amount: number): string {
  return `${new Intl.NumberFormat("ko-KR").format(amount)}원`;
}
