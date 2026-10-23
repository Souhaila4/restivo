"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock, Loader2, MapPin, Phone } from "lucide-react";
import { ApiError } from "@/contexts/AuthContext";
import { apiGetDiscoverRestaurant } from "@/lib/discover/client";
import type { DiscoverHours, DiscoverRestaurantDetail } from "@/lib/discover/types";
import { ReservationFlow } from "../../_components/ReservationFlow";
import { useRequireSignIn } from "../../_lib/useRequireSignIn";

type Load =
  | { state: "loading" }
  | { state: "missing"; key: string }
  | { state: "error"; key: string; message: string }
  | { state: "ready"; key: string; restaurant: DiscoverRestaurantDetail };

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Stored 0 = Sunday; show the week starting on Monday.
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function RestaurantDetailPage() {
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = params.restaurantId;
  const { signedIn, getFreshAccessToken } = useRequireSignIn();
  const [result, setResult] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const key = `${restaurantId}|${attempt}`;
  const load: Load = result.state !== "loading" && result.key === key ? result : { state: "loading" };

  useEffect(() => {
    if (!signedIn) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const token = await getFreshAccessToken();
        if (!token) return;
        const restaurant = await apiGetDiscoverRestaurant(token, restaurantId);
        if (cancelled) return;
        setResult({ state: "ready", key, restaurant });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setResult({ state: "missing", key });
        } else {
          setResult({
            state: "error",
            key,
            message: err instanceof Error ? err.message : "Could not load this restaurant.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [signedIn, restaurantId, attempt, key, getFreshAccessToken]);

  return (
    <div className="mt-3">
      <Link
        href="/mainpage/explore"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#B55234] hover:text-[#9E4328]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All restaurants
      </Link>

      {load.state === "loading" ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#736D65]" role="status">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading restaurant…
        </div>
      ) : null}

      {load.state === "missing" ? (
        <div className="py-16 text-center">
          <p className="text-base font-bold text-[#1A1A1A]">This restaurant is not available</p>
          <p className="mt-1 text-sm text-[#736D65]">It may have been unpublished or removed.</p>
        </div>
      ) : null}

      {load.state === "error" ? (
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
      ) : null}

      {load.state === "ready" ? (
        <RestaurantDetail restaurant={load.restaurant} />
      ) : null}
    </div>
  );
}

function RestaurantDetail({ restaurant }: { restaurant: DiscoverRestaurantDetail }) {
  return (
    <div className="space-y-6 pb-4">
      <header className="overflow-hidden rounded-2xl border border-[#E8E2D7] bg-white">
        {restaurant.coverUrl ? (
          // Cover URLs come from arbitrary hosts, so next/image cannot optimise them.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={restaurant.coverUrl} alt="" className="h-44 w-full object-cover sm:h-56" />
        ) : null}
        <div className="p-5">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1A1A1A] sm:text-3xl">{restaurant.name}</h1>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#6B6661]">
            {restaurant.address || restaurant.city ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-[#9E988F]" />
                {[restaurant.address, restaurant.city].filter(Boolean).join(", ")}
              </span>
            ) : null}
            {restaurant.phone ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-[#9E988F]" />
                {restaurant.phone}
              </span>
            ) : null}
          </div>
          {restaurant.description ? (
            <p className="mt-3 text-sm leading-relaxed text-[#524D48]">{restaurant.description}</p>
          ) : null}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 space-y-8">
          <Suspense fallback={null}>
            <ReservationFlow key={restaurant.id} restaurant={restaurant} />
          </Suspense>
        </div>

        <aside aria-labelledby="hours-title">
          <h2 id="hours-title" className="mb-3 flex items-center gap-1.5 text-base font-bold text-[#1A1A1A] sm:text-lg">
            <Clock className="h-4 w-4 text-[#B55234]" />
            Opening hours
          </h2>
          <HoursList hours={restaurant.hours} />
        </aside>
      </div>
    </div>
  );
}

function HoursList({ hours }: { hours: DiscoverHours[] }) {
  if (hours.length === 0) {
    return <p className="text-sm text-[#736D65]">Opening hours are not available.</p>;
  }
  const byDay = new Map(hours.map((day) => [day.dayOfWeek, day]));
  return (
    <ul className="divide-y divide-[#F2ECE4] rounded-2xl border border-[#E8E2D7] bg-white text-sm">
      {DISPLAY_ORDER.map((dayOfWeek) => {
        const day = byDay.get(dayOfWeek);
        const closed = !day || day.isClosed || !day.openTime || !day.closeTime;
        return (
          <li key={dayOfWeek} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="font-medium text-[#1A1A1A]">{DAY_NAMES[dayOfWeek]}</span>
            <span className={closed ? "text-[#9E988F]" : "text-[#524D48]"}>
              {closed ? "Closed" : `${day.openTime} – ${day.closeTime}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
