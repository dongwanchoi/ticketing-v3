import type * as T from "./types";
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
let csrf: T.Csrf | undefined;
async function request<R>(
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
): Promise<R> {
  const headers: Record<string, string> = {};
  if (method !== "GET") {
    if (!csrf) await refreshCsrf();
    headers[csrf!.headerName] = csrf!.token;
  }
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (key) headers["Idempotency-Key"] = key;
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({
        code: "NETWORK_ERROR",
        message: "요청을 처리하지 못했습니다.",
      }));
    throw new ApiError(
      response.status,
      error.code ?? "UNKNOWN",
      error.message ?? "요청에 실패했습니다.",
    );
  }
  return response.status === 204 ? (undefined as R) : response.json();
}
export async function refreshCsrf() {
  csrf = await request<T.Csrf>("/auth/csrf");
  return csrf;
}
export const api = {
  me: () => request<T.User>("/auth/me"),
  register: (body: T.Credentials) =>
    request<T.User>("/auth/register", "POST", body),
  login: async (body: T.Credentials) => {
    const user = await request<T.User>("/auth/login", "POST", body);
    csrf = undefined;
    await refreshCsrf();
    return user;
  },
  logout: async () => {
    await request<void>("/auth/logout", "POST");
    csrf = undefined;
    await refreshCsrf();
  },
  performances: (q = "") =>
    request<{ items: T.Performance[] }>(
      "/performances?q=" + encodeURIComponent(q),
    ),
  detail: (id: number) => request<T.PerformanceDetail>(`/performances/${id}`),
  seats: (id: number) =>
    request<{ items: T.SessionSeat[] }>(`/sessions/${id}/seats`),
  hold: (body: T.CreateHold, key: string) =>
    request<T.Hold>("/holds", "POST", body, key),
  getHold: (id: number) => request<T.Hold>(`/holds/${id}`),
  release: (id: number) => request<void>(`/holds/${id}`, "DELETE"),
  pay: (id: number, body: T.Pay, key: string) =>
    request<T.Payment>(`/holds/${id}/payments`, "POST", body, key),
  reservations: () => request<{ items: T.Reservation[] }>("/reservations"),
  venues: () => request<{ items: T.Venue[] }>("/seller/venues"),
  createVenue: (body: T.CreateVenue) =>
    request<T.Venue>("/seller/venues", "POST", body),
  managed: () =>
    request<{ items: T.ManagedPerformance[] }>("/seller/performances"),
  createPerformance: (body: T.CreatePerformance) =>
    request<T.ManagedPerformance>("/seller/performances", "POST", body),
  createSession: (id: number, body: T.CreateSession) =>
    request<T.Session>(`/seller/performances/${id}/sessions`, "POST", body),
  sale: (id: number, body: T.Sale) =>
    request<T.Sale>(`/seller/performances/${id}/sale`, "PUT", body),
  reviews: () =>
    request<{ items: T.ManagedPerformance[] }>("/admin/performances"),
  review: (id: number, decision: T.Review["decision"]) =>
    request<T.ManagedPerformance>(`/admin/performances/${id}/review`, "POST", {
      decision,
    }),
};
export function errorText(e: unknown) {
  return e instanceof ApiError
    ? `${e.message} (${e.code})`
    : "네트워크 연결을 확인하고 다시 시도해 주세요.";
}
export function kst(value: string) {
  return (
    new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Seoul",
    }).format(new Date(value)) + " KST"
  );
}
// datetime-local values are explicitly interpreted in KST, independent of browser timezone.
export function utcFromKst(value: string) {
  return value ? new Date(value + ":00+09:00").toISOString() : null;
}
