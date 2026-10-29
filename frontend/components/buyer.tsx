"use client";
import type { User } from "../lib/types";
import { useBuyer } from "./use-buyer";
import { Notice } from "./ui";
import {
  Discovery,
  Detail,
  ActiveHolds,
  Booking,
  History,
} from "./buyer-views";
export function Buyer({
  user,
  history,
}: {
  user: User | null;
  history: boolean;
}) {
  const state = useBuyer({ user, history });
  return (
    <div className="buyer-experience">
      <Notice error={state.error} notice={state.notice} />
      {history ? (
        <History state={state} />
      ) : (
        <>
          {user && <ActiveHolds state={state} />}
          <Discovery
            state={state}
            compact={!!state.detail || state.bookingVisible}
          />
          {state.detail && <Detail state={state} />}{" "}
          {state.bookingVisible && <Booking state={state} />}
        </>
      )}
    </div>
  );
}
