"use client";

import { Minus, Plus, Star } from "lucide-react";
import { MAX_LINE_QUANTITY } from "@/lib/orders/constants";
import type { Cart } from "@/lib/orders/cart";
import type { DiscoverMenu } from "@/lib/orders/types";

/**
 * The menu as a plain scrolling list. It is the accessible "View as list" form
 * of the menu; `onChange` makes the + / − steppers appear.
 */
export function MenuList({
  menu,
  currency,
  cart,
  onChange,
}: {
  menu: NonNullable<DiscoverMenu["menu"]>;
  currency: string;
  cart: Cart;
  onChange?: (menuItemId: string, delta: number) => void;
}) {
  return (
    <div className="space-y-5">
      {menu.categories.map((category) => (
        <section key={category.id} aria-labelledby={`cat-${category.id}`}>
          <h3 id={`cat-${category.id}`} className="mb-2 text-sm font-bold text-[#1A1A1A]">
            {category.name}
          </h3>
          <ul className="divide-y divide-[#F2ECE4] rounded-2xl border border-[#E8E2D7] bg-white">
            {category.items.map((item) => {
              const quantity = cart[item.id] ?? 0;
              const discounted = item.salePrice !== item.price;
              return (
                <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${item.isAvailable ? "text-[#1A1A1A]" : "text-[#9E988F]"}`}>
                      {item.name}
                      {item.isFeatured && item.isAvailable ? (
                        <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-[#EEF2E8] px-2 py-0.5 text-[10px] font-semibold text-[#55664A]">
                          <Star className="h-2.5 w-2.5" aria-hidden="true" />
                          Featured
                        </span>
                      ) : null}
                      {!item.isAvailable ? (
                        <span className="ml-2 rounded-full bg-[#F1EEE8] px-2 py-0.5 text-[10px] font-semibold text-[#6B6661]">
                          Unavailable
                        </span>
                      ) : null}
                      {item.isAvailable && item.promotionLabel ? (
                        <span className="ml-2 rounded-full bg-[#FBEAE5] px-2 py-0.5 text-[10px] font-semibold text-[#B55234]">
                          {item.promotionLabel}
                        </span>
                      ) : null}
                    </p>
                    {item.description ? <p className="mt-0.5 text-xs text-[#736D65]">{item.description}</p> : null}
                    <p className="mt-1 text-xs text-[#524D48]">
                      {discounted && item.isAvailable ? (
                        <>
                          <span className="mr-1.5 text-[#9E988F] line-through">{item.price}</span>
                          <span className="font-semibold">{item.salePrice}</span>
                        </>
                      ) : (
                        <span className="font-semibold">{item.price}</span>
                      )}{" "}
                      {currency}
                    </p>
                  </div>

                  {onChange && item.isAvailable ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`Remove one ${item.name}`}
                        disabled={quantity === 0}
                        onClick={() => onChange(item.id, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D8D2C5] text-[#423E3A] hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-[#B55234] disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Add one ${item.name}`}
                        disabled={quantity >= MAX_LINE_QUANTITY}
                        onClick={() => onChange(item.id, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#B55234] text-white hover:bg-[#9E4328] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B55234] disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
