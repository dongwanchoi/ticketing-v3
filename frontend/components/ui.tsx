"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
export function Field({
  label,
  name,
  type = "text",
  required = true,
  min,
  max,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  defaultValue?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        min={min}
        max={max}
        defaultValue={defaultValue}
        autoComplete={
          type === "password"
            ? "current-password"
            : type === "email"
              ? "email"
              : undefined
        }
      />
    </div>
  );
}
export function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <section className={"panel " + className} aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}
export function Notice({ error, notice }: { error?: string; notice?: string }) {
  return (
    <>
      {error && (
        <p role="alert" className="error">
          <span aria-hidden="true">!</span>
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="notice">
          <span aria-hidden="true">✓</span>
          {notice}
        </p>
      )}
    </>
  );
}
const statusLabels: Record<string, string> = {
  PENDING: "검수 대기",
  APPROVED: "승인 완료",
  REJECTED: "반려",
  PREPARING: "판매 준비",
  OPEN: "판매 설정 OPEN",
  CLOSED: "판매 종료",
  CONFIRMED: "예매 확정",
  ACTIVE: "선점 중",
  RELEASED: "선점 해제",
  EXPIRED: "선점 만료",
  FAILED: "결제 실패",
  SUCCESS: "결제 성공",
};
export function Status({ value }: { value: string }) {
  return (
    <span className={"status-badge status-" + value.toLowerCase()}>
      {statusLabels[value] ?? value}
    </span>
  );
}
export function Loading({ children }: { children: ReactNode }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" aria-hidden="true" />
      {children}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-symbol" aria-hidden="true">
        ⌕
      </span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
export function Poster({
  id = 0,
  large = false,
}: {
  id?: number;
  large?: boolean;
}) {
  return (
    <div
      role="img"
      aria-label="공식 포스터 미등록"
      className={`poster-art poster-tone-${id % 3}${large ? " poster-large" : ""}`}
    >
      <span className="poster-orbit orbit-one" />
      <span className="poster-orbit orbit-two" />
      <div className="poster-wordmark">
        MOMENT
        <span />
        <small>공식 포스터 준비 중</small>
      </div>
      <span className="poster-footnote">LIVE PERFORMANCE</span>
    </div>
  );
}
export function Dialog({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    id = useId(),
    opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    opener.current = document.activeElement as HTMLElement;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first =
      ref.current?.querySelector<HTMLElement>("input") ??
      ref.current?.querySelector<HTMLElement>('button,[tabindex="0"]');
    first?.focus();
    const inert: [HTMLElement, boolean][] = [];
    let branch = ref.current?.parentElement;
    while (branch && branch.parentElement) {
      for (const sibling of Array.from(branch.parentElement.children)) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          inert.push([sibling, sibling.inert]);
          sibling.inert = true;
        }
      }
      if (branch.parentElement === document.body) break;
      branch = branch.parentElement;
    }
    return () => {
      for (const [node, value] of inert) node.inert = value;
      document.body.style.overflow = before;
      opener.current?.focus();
    };
  }, []);
  return (
    <div
      className="dialog-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className="dialog"
        onKeyDown={(e) => {
          if (e.key === "Escape" && !busy) {
            e.preventDefault();
            onClose();
          }
          if (e.key === "Tab") {
            const nodes = Array.from(
              ref.current?.querySelectorAll<HTMLElement>(
                'input:not(:disabled),button:not(:disabled),a[href],select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
              ) ?? [],
            ).sort((a, b) =>
              a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
                ? -1
                : 1,
            );
            const first = nodes[0],
              last = nodes[nodes.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">MOMENT · TICKETING V3</p>
            <h2 id={id}>{title}</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="대화상자 닫기"
            disabled={busy}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function values(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form)) as Record<string, string>;
}
