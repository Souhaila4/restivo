"use client";

import { useEffect, useState } from "react";
import { Loader2, SearchX, UtensilsCrossed } from "lucide-react";
import { apiListDiscoverRestaurants } from "@/lib/discover/client";
import type { DiscoverRestaurantSummary } from "@/lib/discover/types";
import { useRequireSignIn } from "../_lib/useRequireSignIn";
import { useMainpage } from "./MainpageProvider";
import { DiscoverRestaurantCard } from "./DiscoverRestaurantCard";

const SEARCH_DELAY_MS = 300;

type Load =
  | { state: "loading" }
  | { state: "error"; key: string; message: string }
  | { state: "ready"; key: string; restaurants: DiscoverRestaurantSummary[] };

/** Published restaurants from the database, filtered by the shared search box. */
export function RestaurantsBrowser() {
  const { searchQuery } = useMainpage();
  const { signedIn, getFreshAccessToken } = useRequireSignIn();
  const [result, setResult] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);

  // A result only counts for the search it answered; while a newer search is
  // pending the previous list stays on screen instead of flashing a spinner.
  const key = `${searchQuery}|${attempt}`;
  const load: Load =
    result.state === "loading" || result.key === key || result.state === "ready"
      ? result
      : { state: "loading" };

  useEffect(() => {
    if (!signedIn) return undefined;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const token = await getFreshAccessToken();
        if (!token) return;
        const restaurants = await apiListDiscoverRestaurants(token, searchQuery, controller.signal);
        if (!controller.signal.aborted) setResult({ state: "ready", key, restaurants });
      } catch (err) {
        if (controller.signal.aborted) return;
        setResult({
          state: "error",
          key,
          message: err instanceof Error ? err.message : "Could not load restaurants.",
        });
      }
    }, SEARCH_DELAY_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [signedIn, searchQuery, attempt, key, getFreshAccessToken]);

  if (load.state === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#736D65]" role="status">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading restaurants…
      </div>
    );
  }

  if (load.state === "error") {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center" role="alert">
        <p className="text-sm text-[#B55234]">{load.message}</p>
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          className="rounded-full border border-[#D8D2C5] px-4 py-1.5 text-xs font-medium text-[#423E3A] hover:bg-black/5"
        >
          Try again
        </button>
      </div>
    );
  }

  if (load.restaurants.length === 0) {
    const searching = searchQuery.trim() !== "";
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5ECE5] text-[#B55234]">
          {searching ? <SearchX className="h-6 w-6" /> : <UtensilsCrossed className="h-6 w-6" />}
        </div>
        <p className="text-base font-bold text-[#1A1A1A]">
          {searching ? "No restaurant matches your search" : "No restaurant is open for booking yet"}
        </p>
        <p className="mt-1 max-w-sm text-sm text-[#736D65]">
          {searching
            ? "Try another name or city."
            : "Restaurants appear here as soon as they publish their floor plan."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
      {load.restaurants.map((restaurant) => (
        <DiscoverRestaurantCard key={restaurant.id} restaurant={restaurant} />
      ))}
    </div>
  );
}
