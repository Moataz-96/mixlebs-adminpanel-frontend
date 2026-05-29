// Aggregated i18n message catalogs.
//
// Every domain drops a file in ./catalogs/<domain>.ts that default-exports a
// { en, ar } Catalog. They are auto-discovered here via Vite's import.meta.glob
// (eager) and deep-merged — so adding a screen's strings never means editing a
// shared file. Keys are dot-addressed: t("products.title").

export type Dict = { [key: string]: string | Dict };
export interface Catalog {
  en: Dict;
  ar: Dict;
}

function deepMerge(target: Dict, src: Dict): Dict {
  for (const key of Object.keys(src)) {
    const sv = src[key];
    const tv = target[key];
    if (sv && typeof sv === "object" && tv && typeof tv === "object") {
      deepMerge(tv as Dict, sv as Dict);
    } else {
      target[key] = sv as string | Dict;
    }
  }
  return target;
}

const modules = import.meta.glob<{ default: Catalog }>("./catalogs/*.{ts,tsx}", {
  eager: true,
});

export const messages: { en: Dict; ar: Dict } = { en: {}, ar: {} };

for (const mod of Object.values(modules)) {
  const cat = mod.default;
  if (!cat) continue;
  if (cat.en) deepMerge(messages.en, cat.en);
  if (cat.ar) deepMerge(messages.ar, cat.ar);
}

export function lookup(dict: Dict, key: string): string | undefined {
  const val = key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") return (acc as Dict)[part];
    return undefined;
  }, dict);
  return typeof val === "string" ? val : undefined;
}
