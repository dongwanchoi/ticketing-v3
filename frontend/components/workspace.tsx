"use client";
import { useEffect, useState } from "react";
import { api, ApiError, errorText } from "../lib/api";
import type { User } from "../lib/types";
import { Dialog, Field, Loading, Notice, values } from "./ui";
import { Buyer } from "./buyer";
import { Management } from "./management";
export function Workspace() {
  const [user, setUser] = useState<User | null>(null),
    [checking, setChecking] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [tab, setTab] = useState("browse"),
    [authOpen, setAuthOpen] = useState(false);
  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401))
          setError(errorText(e));
      })
      .finally(() => setChecking(false));
  }, []);
  async function authenticate(form: HTMLFormElement, register: boolean) {
    setBusy(true);
    setError("");
    setNotice("");
    const data = values(form);
    try {
      const credentials = { email: data.email, password: data.password };
      if (register) await api.register(credentials);
      setUser(await api.login(credentials));
      form.reset();
      setAuthOpen(false);
      setNotice(register ? "가입 및 로그인되었습니다." : "로그인되었습니다.");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await api.logout();
      setUser(null);
      setTab("browse");
      setNotice("로그아웃되었습니다.");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setUser(null);
        setTab("browse");
        setNotice("로그인 세션이 만료되었습니다.");
      } else setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const isOperator = tab === "seller" || tab === "admin";
  return (
    <>
      <a className="skip-link" href="#main-content">
        본문으로 바로가기
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a href="/" className="brand" aria-label="MOMENT Ticketing V3 홈">
            <span className="brand-mark" aria-hidden="true">
              M
            </span>
            <span>
              MOMENT<small>TICKETING V3</small>
            </span>
          </a>
          <nav aria-label="주요 메뉴">
            <button
              className="nav-button"
              aria-pressed={tab === "browse"}
              onClick={() => setTab("browse")}
            >
              공연 탐색
            </button>
            {user && (
              <button
                className="nav-button"
                aria-pressed={tab === "history"}
                onClick={() => setTab("history")}
              >
                내 예매
              </button>
            )}
            {user?.role === "SELLER" && (
              <button
                className="nav-button"
                aria-pressed={tab === "seller"}
                onClick={() => setTab("seller")}
              >
                판매자 관리
              </button>
            )}
            {user?.role === "ADMIN" && (
              <button
                className="nav-button"
                aria-pressed={tab === "admin"}
                onClick={() => setTab("admin")}
              >
                관리자 검수
              </button>
            )}
          </nav>
          <div className="header-auth">
            {checking ? (
              <span className="muted" role="status">
                로그인 상태 확인 중…
              </span>
            ) : user ? (
              <div className="account">
                <span className="account-label" title={user.email}>
                  {user.email} · {user.role}
                </span>
                <button
                  className="button-outline button-small"
                  disabled={busy}
                  onClick={() => void logout()}
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <>
                <button
                  className="text-button"
                  aria-label="로그인 열기"
                  onClick={() => {
                    setError("");
                    setAuthOpen(true);
                  }}
                >
                  로그인
                </button>
                <button
                  className="button-outline button-small"
                  aria-label="회원가입 열기"
                  onClick={() => {
                    setError("");
                    setAuthOpen(true);
                  }}
                >
                  회원가입
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main
        id="main-content"
        className={"shell" + (isOperator ? " operator-shell" : "")}
      >
        <Notice error={authOpen ? "" : error} notice={notice} />
        {tab === "seller" && user?.role === "SELLER" ? (
          <Management role="SELLER" />
        ) : tab === "admin" && user?.role === "ADMIN" ? (
          <Management role="ADMIN" />
        ) : (
          <Buyer
            key={user?.id ?? "guest"}
            user={user}
            history={tab === "history"}
          />
        )}
      </main>
      <footer className="site-footer">
        <div>
          <a href="/" className="footer-brand">
            MOMENT
          </a>
          <span>공연 정보를 정확히 확인하고, 원하는 순간을 선택하세요.</span>
          <small>모의 결제 전용 · 실제 청구 없음 · 모든 일시는 KST 기준</small>
        </div>
      </footer>
      {authOpen && !user && (
        <Dialog
          title="로그인 / 회원가입"
          busy={busy}
          onClose={() => setAuthOpen(false)}
        >
          <p className="muted">MOMENT에서 나만의 순간을 이어가세요.</p>
          <Notice error={error} />
          <form
            className="auth-form"
            aria-busy={busy}
            onSubmit={(e) => {
              e.preventDefault();
              void authenticate(e.currentTarget, false);
            }}
          >
            <Field label="이메일" name="email" type="email" />
            <Field label="비밀번호" name="password" type="password" />
            <div className="auth-actions">
              <button disabled={busy}>{busy ? "처리 중…" : "로그인"}</button>
              <button
                type="button"
                className="button-outline"
                disabled={busy}
                onClick={(e) => {
                  const form = e.currentTarget.form!;
                  if (form.reportValidity()) void authenticate(form, true);
                }}
              >
                회원가입
              </button>
            </div>
            <p className="form-hint">
              회원가입은 구매자 계정으로 진행됩니다. 비밀번호는 8자 이상, UTF-8
              기준 최대 72바이트입니다.
            </p>
            {busy && <Loading>안전하게 연결하고 있습니다.</Loading>}
          </form>
        </Dialog>
      )}
    </>
  );
}
