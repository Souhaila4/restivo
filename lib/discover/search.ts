/**
 * Customer-side restaurant search, kept free of imports so node:test can run
 * it directly. Customers filter by name or city only.
 */

export type Searchable = {
  name: string;
  city: string | null;
};

const COMBINING_MARKS = /[̀-ͯ]/g;

function normalize(value: string): string {
  return value.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase().trim();
}

/** Empty query matches everything. Accents and case are ignored. */
export function matchesQuery(restaurant: Searchable, query: string | undefined): boolean {
  const needle = normalize(query ?? "");
  if (needle === "") return true;
  return (
    normalize(restaurant.name).includes(needle) ||
    normalize(restaurant.city ?? "").includes(needle)
  );
}
