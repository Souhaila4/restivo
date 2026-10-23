import Link from "next/link";
import { MapPin } from "lucide-react";
import type { DiscoverRestaurantSummary } from "@/lib/discover/types";

export function DiscoverRestaurantCard({ restaurant }: { restaurant: DiscoverRestaurantSummary }) {
  return (
    <Link
      href={`/mainpage/explore/${restaurant.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#E8E2D7] bg-white shadow-2xs transition-all duration-300 hover:shadow-md"
    >
      <div className="relative h-40 w-full overflow-hidden bg-[#ECE7DC]">
        {restaurant.coverUrl ? (
          // Cover URLs come from arbitrary hosts, so next/image cannot optimise them.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.coverUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-extrabold text-[#B55234]/40">
            {restaurant.name.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[15px] font-bold text-[#1A1A1A] transition-colors group-hover:text-[#B55234]">
          {restaurant.name}
        </h3>
        {restaurant.city ? (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-[#7A746B]">
            <MapPin className="h-3 w-3 text-[#9E988F]" />
            {restaurant.city}
          </p>
        ) : null}
        {restaurant.description ? (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#6B6661]">{restaurant.description}</p>
        ) : null}
        <span className="mt-4 inline-flex w-fit rounded-full bg-[#B55234] px-3.5 py-1.5 text-xs font-medium text-white shadow-2xs">
          View restaurant
        </span>
      </div>
    </Link>
  );
}
