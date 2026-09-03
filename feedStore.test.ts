import { createPinia, setActivePinia } from "pinia";
import { vi } from "vitest";
import { useFeedStore } from "@/core/store/feedStore";

vi.mock("@/core/services/apis/api", () => ({
  $api: {
    newsfeed: {
      fetch: vi.fn(),
      trackViewed: vi.fn(),
    },
    city: vi.fn(() => ({
      getFeed: vi.fn(),
    })),
  },
}));

vi.mock("@/core/services/tenant/Tenant.service", () => ({
  TenantService: {
    conf: vi.fn(),
  },
}));

vi.mock("@/core/services/auth/LocalAuthentication.service", () => ({
  LocalAuthenticationService: {
    isLoggedIn: vi.fn(() => false),
  },
}));

const buildAds = (count: number) => (
  Array.from({ length: count }, (_, index) => ({ id: index + 1 }))
);

describe("feedStore cache threshold", () => {
  const locale = "fr";

  beforeEach(() => {
    sessionStorage.clear();
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  test("caches first page responses with fewer than 10 ads for 30 seconds", () => {
    const feedStore = useFeedStore();
    const dateNowSpy = vi.spyOn(Date, "now");
    dateNowSpy.mockReturnValueOnce(1_000_000);

    feedStore.setNewsFeed(locale, { ads: buildAds(9), cacheUser: true }, 1);
    expect(feedStore.getFeedAds(locale)).toHaveLength(9);

    dateNowSpy.mockReturnValueOnce(1_025_000);
    expect(feedStore.isExpired(locale)).toBe(false);

    dateNowSpy.mockReturnValueOnce(1_030_000);
    expect(feedStore.isExpired(locale)).toBe(false);

    dateNowSpy.mockReturnValueOnce(1_031_000);
    expect(feedStore.isExpired(locale)).toBe(true);
  });

  test("keeps cache behavior for first page responses with at least 10 ads", () => {
    const feedStore = useFeedStore();

    feedStore.setNewsFeed(locale, { ads: buildAds(10), cacheUser: true }, 1);

    expect(feedStore.getFeedAds(locale)).toHaveLength(10);
    expect(feedStore.isExpired(locale)).toBe(false);
  });

  test("keeps caching enabled on subsequent pages", () => {
    const feedStore = useFeedStore();

    feedStore.setNewsFeed(locale, { ads: buildAds(5), cacheUser: true }, 2);

    expect(feedStore.getFeedAds(locale)).toHaveLength(5);
    expect(feedStore.isExpired(locale)).toBe(false);
  });
});
