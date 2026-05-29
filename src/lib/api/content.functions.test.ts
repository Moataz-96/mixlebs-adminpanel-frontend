import { describe, it, expect, vi, beforeEach } from "vitest";

// Integration test for the resources (content) server fns (list + create) plus
// the BE -> UI mapper. Same stubbing approach as coupons.functions.test.ts:
// createServerFn is stubbed so the raw handler runs, the _client.* helpers are
// mocked (NOT a live Django), and we assert the right URL / body reach the
// client and the unwrapped envelope data flows back through the RPC boundary.

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiPatch = vi.fn();
const apiDelete = vi.fn();

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      inputValidator: () => builder,
      handler: (fn: unknown) => fn,
    };
    return builder;
  },
}));

vi.mock("./_client", () => ({
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiPost: (...a: unknown[]) => apiPost(...a),
  apiPatch: (...a: unknown[]) => apiPatch(...a),
  apiDelete: (...a: unknown[]) => apiDelete(...a),
  apiUpload: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

type Fn = (a: { data: unknown }) => Promise<unknown>;

describe("listResources server fn", () => {
  it("GETs the resources endpoint with section/q filters and returns the unwrapped page", async () => {
    const page = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 1,
          slug: "how-do-i-track-my-order",
          section: "FAQ",
          content_type: "QA",
          order: 1,
          audience: ["CUSTOMER"],
          translations: [
            { id: 9, language_id: 1, language_code: "en", title: "Track", content: "Open it." },
          ],
          created_at: "2026-05-10T00:00:00Z",
          updated_at: "2026-05-12T00:00:00Z",
        },
      ],
    };
    apiGet.mockResolvedValueOnce(page);

    const { listResources } = await import("./content.functions");
    const result = await (listResources as unknown as Fn)({ data: { section: "FAQ", q: "track" } });

    expect(apiGet).toHaveBeenCalledTimes(1);
    const url = apiGet.mock.calls[0][0] as string;
    expect(url).toContain("/api/admin/v1/resources/");
    expect(url).toContain("section=FAQ");
    expect(url).toContain("q=track");
    expect(result).toEqual(page);
  });
});

describe("createResource server fn", () => {
  it("POSTs the resource write body (section + content_type + translations) and returns the created row", async () => {
    const created = { id: 5, slug: "new-faq", section: "FAQ", content_type: "QA" };
    apiPost.mockResolvedValueOnce(created);

    const { createResource } = await import("./content.functions");
    const result = await (createResource as unknown as Fn)({
      data: {
        slug: "new-faq",
        section: "FAQ",
        content_type: "QA",
        order: 1,
        audience: ["CUSTOMER"],
        translations: [{ language_code: "en", title: "Q", content: "A" }],
      },
    });

    expect(apiPost).toHaveBeenCalledTimes(1);
    expect(apiPost.mock.calls[0][0]).toBe("/api/admin/v1/resources/");
    const body = apiPost.mock.calls[0][1] as Record<string, unknown>;
    expect(body.slug).toBe("new-faq");
    expect(body.section).toBe("FAQ");
    expect(body.content_type).toBe("QA");
    expect(body.translations).toEqual([{ language_code: "en", title: "Q", content: "A" }]);
    expect(result).toEqual(created);
  });
});

describe("toResourceEntry mapper", () => {
  it("maps a BE Resource row into the FROZEN UI ResourceEntry shape", async () => {
    const { toResourceEntry } = await import("./content.functions");
    const ui = toResourceEntry({
      id: 7,
      slug: "privacy-policy",
      section: "Privacy Policy",
      content_type: "ARTICLE",
      order: 1,
      audience: ["CUSTOMER", "STORE"],
      translations: [
        { id: 1, language_id: 1, language_code: "en", title: "Privacy", content: "We collect..." },
        { id: 2, language_id: 2, language_code: "ar", title: "الخصوصية", content: "نجمع..." },
      ],
      created_at: "2026-05-01T00:00:00Z",
      updated_at: "2026-05-02T10:00:00Z",
    });
    expect(ui.id).toBe("7");
    expect(ui.section).toBe("Privacy Policy");
    expect(ui.content_type).toBe("Article");
    expect(ui.audiences).toEqual(["CUSTOMER", "STORE"]);
    expect(ui.published).toBe(true);
    expect(ui.updated_at).toBe("2026-05-02");
    expect(ui.translations.map((tr) => tr.lang)).toEqual(["en", "ar"]);
  });
});
