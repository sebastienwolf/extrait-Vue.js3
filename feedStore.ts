import { defineStore } from "pinia";
import { ref } from "vue";
import { Capacitor } from "@capacitor/core";
import { LocalAuthenticationService } from "@/core/services/auth/LocalAuthentication.service";
import { $api } from "@/core/services/apis/api";
import { getShortLocale } from "@/utils/locale";
import { TenantService } from "@/core/services/tenant/Tenant.service";
import {
  FeedTrackingId,
  normalizeFeedTrackingId,
  readFeedTrackingIdsFromSessionStorage,
  writeFeedTrackingIdsToSessionStorage,
} from "@/core/store/feedViewedTrackingStorage";

const FEED_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutes
const FEED_SHORT_EXPIRATION_TIME = 30 * 1000; // 30 seconds
const FEED_VIEW_TRACK_INTERVAL = 5_000; // aligned with delayed prefetch cadence to limit API overhead
const FEED_VIEW_PENDING_IDS_SESSION_STORAGE_KEY = "feed-view-pending-ids";
const FEED_VIEW_SENT_IDS_SESSION_STORAGE_KEY = "feed-view-sent-ids";
const MIN_ITEMS_TO_ENABLE_FEED_CACHE = 10;
const SHORT_CACHE_TIME_ADJUSTMENT = FEED_EXPIRATION_TIME - FEED_SHORT_EXPIRATION_TIME;

interface FeedState {
  newsFeed: any[];
  loadedPages: number;
  loadTime: number;
  hasReachedEnd: boolean;
}

type FeedPayload =
  | any[]
  | { ads?: any[]; items?: any[]; newsFeed?: any[]; cacheUser?: boolean };

const normalizeItems = (items: unknown): any[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.flat ? items.flat() : items;
};

const extractItems = (payload: FeedPayload): any[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  if ("ads" in payload) {
    return normalizeItems(payload.ads);
  }

  if ("items" in payload) {
    return normalizeItems(payload.items);
  }

  if ("newsFeed" in payload) {
    return normalizeItems(payload.newsFeed);
  }

  return [];
};

const getDeviceType = () => {
  const platform = Capacitor.getPlatform();
  return platform === "android" || platform === "ios" ? platform : "web";
};

export const useFeedStore = defineStore(
  "feed",
  () => {
    const feeds = ref<Record<string, FeedState>>({});
    const isPreferencesLoading = ref(false);
    const pendingRequests = ref<Record<string, Promise<any>>>({});
    const prefetchedPages = ref<Record<string, Set<number>>>({});
    const delayedPrefetchTimers = ref<
      Record<string, ReturnType<typeof setTimeout> | undefined>
    >({});
    const viewedNewsPendingIds = ref<Set<FeedTrackingId>>(
      readFeedTrackingIdsFromSessionStorage(FEED_VIEW_PENDING_IDS_SESSION_STORAGE_KEY),
    );
    const viewedNewsSentIds = ref<Set<FeedTrackingId>>(
      readFeedTrackingIdsFromSessionStorage(FEED_VIEW_SENT_IDS_SESSION_STORAGE_KEY),
    );
    const viewedNewsTrackingTimer = ref<ReturnType<typeof setInterval> | undefined>(undefined);
    const isTrackingViewedNewsInProgress = ref(false);

    const getFeedState = (locale: string): FeedState => {
      if (!feeds.value[locale]) {
        feeds.value[locale] = { newsFeed: [], loadedPages: 0, loadTime: 0, hasReachedEnd: false };
      }
      return feeds.value[locale];
    };

    const setNewsFeed = (locale: string, payload: FeedPayload, page: number) => {
      const feed = getFeedState(locale);
      const items = extractItems(payload);
      const cacheUser = !Array.isArray(payload) && payload.cacheUser === true;

      for (const item of items) {
        if (!item) continue;
        const existingIndex = feed.newsFeed.findIndex((entry) => entry?.id === item.id);
        if (existingIndex !== -1) {
          updateStoredElementIfNeeded(feed, existingIndex, item);
        } else {
          feed.newsFeed.push(item);
        }
      }
      const now = Date.now();
      feed.loadedPages = Math.max(feed.loadedPages, page);
      const shouldUseShortCache = page === 1 && items.length < MIN_ITEMS_TO_ENABLE_FEED_CACHE;
      const shouldCacheResponse = shouldUseShortCache
        || page > 1
        || items.length >= MIN_ITEMS_TO_ENABLE_FEED_CACHE;
      feed.loadTime = shouldCacheResponse
        ? (
          shouldUseShortCache
            ? now - SHORT_CACHE_TIME_ADJUSTMENT
            : (cacheUser ? now : now + 4 * 60 * 1000)
        )
        : 0;
      feed.hasReachedEnd = items.length === 0;
    };

    const clearNewsFeed = (locale: string) => {
      feeds.value[locale] = { newsFeed: [], loadedPages: 0, loadTime: 0, hasReachedEnd: false };
      clearDelayedPrefetch(locale);
    };

    const isFeedExpired = (locale: string) => {
      const feed = getFeedState(locale);
      if (!feed.loadTime) return true;
      return Date.now() - feed.loadTime > FEED_EXPIRATION_TIME;
    };

    const getFeedAds = (locale: string) => {
      return [...getFeedState(locale).newsFeed];
    };

    const updateAdFavorite = (locale: string, adId: number | string, favorite: boolean) => {
      const feed = getFeedState(locale);
      const ad = feed.newsFeed.find((item) => item?.elementId === adId);
      if (ad) {
        if (!ad.extraData) ad.extraData = {};
        ad.extraData.favorite = favorite;
      }
    };

    const updateAdFeatured = (adId: number | string, featured: boolean) => {
      Object.values(feeds.value).forEach((feed) => {
        if (!feed || !Array.isArray(feed.newsFeed)) return;

        for (const item of feed.newsFeed) {
          if (!item || item?.type !== "item") continue;
          if (Number(item?.elementId) !== Number(adId)) continue;

          item.featured = featured;
        }
      });
    };

    const markPollAsAnswered = (pollId: number) => {
      Object.values(feeds.value).forEach((feed) => {
        if (!feed || !Array.isArray(feed.newsFeed)) return;

        for (const item of feed.newsFeed) {
          if (!item || item.type !== "poll") continue;

          const pollContainer = item.extraData?.element;
          if (!Array.isArray(pollContainer) || !pollContainer[0]) continue;

          const poll = pollContainer[0];
          if (poll.id === pollId) {
            poll.has_answered = true;
          }
        }
      });
    };

    const clearDelayedPrefetch = (localeKey: string) => {
      const existingTimer = delayedPrefetchTimers.value[localeKey];
      if (existingTimer !== undefined) {
        clearTimeout(existingTimer);
        delete delayedPrefetchTimers.value[localeKey];
      }
    };

    const resetStore = () => {
      feeds.value = {};
      pendingRequests.value = {};
      prefetchedPages.value = {};
      Object.keys(delayedPrefetchTimers.value).forEach(clearDelayedPrefetch);
      stopViewedNewsTracking();
    };

    const persistViewedNewsTracking = () => {
      writeFeedTrackingIdsToSessionStorage(
        FEED_VIEW_PENDING_IDS_SESSION_STORAGE_KEY,
        viewedNewsPendingIds.value,
      );
      writeFeedTrackingIdsToSessionStorage(
        FEED_VIEW_SENT_IDS_SESSION_STORAGE_KEY,
        viewedNewsSentIds.value,
      );
    };

    const trackViewedNews = (ids: FeedTrackingId[]) => {
      let hasUpdates = false;

      ids.forEach((candidateId) => {
        const id = normalizeFeedTrackingId(candidateId);
        if (id === null) {
          return;
        }

        if (viewedNewsSentIds.value.has(id) || viewedNewsPendingIds.value.has(id)) {
          return;
        }

        viewedNewsPendingIds.value.add(id);
        hasUpdates = true;
      });

      if (hasUpdates) {
        persistViewedNewsTracking();
      }
    };

    const flushViewedNewsTracking = async () => {
      if (isTrackingViewedNewsInProgress.value || viewedNewsPendingIds.value.size === 0) {
        return;
      }

      const idsToSend = Array.from(viewedNewsPendingIds.value);
      isTrackingViewedNewsInProgress.value = true;

      try {
        await $api.newsfeed.trackViewed(idsToSend);
        idsToSend.forEach((id) => {
          viewedNewsPendingIds.value.delete(id);
          viewedNewsSentIds.value.add(id);
        });
        persistViewedNewsTracking();
      } catch (error) {
        console.warn("Newsfeed viewed-news tracking failed.", error);
      } finally {
        isTrackingViewedNewsInProgress.value = false;
      }
    };

    const startViewedNewsTracking = (intervalInMs: number = FEED_VIEW_TRACK_INTERVAL) => {
      if (viewedNewsTrackingTimer.value !== undefined) {
        return;
      }

      viewedNewsTrackingTimer.value = setInterval(() => {
        void flushViewedNewsTracking();
      }, intervalInMs);
    };

    const stopViewedNewsTracking = () => {
      if (viewedNewsTrackingTimer.value !== undefined) {
        clearInterval(viewedNewsTrackingTimer.value);
        viewedNewsTrackingTimer.value = undefined;
      }
      void flushViewedNewsTracking();
    };

    const buildQueryParams = (
      localeKey: string,
      page: number,
      params: Record<string, any> = {},
    ) => {
      const query = new URLSearchParams();
      query.set("page", String(page));
      query.set("device_type", getDeviceType());
      query.set("locale", localeKey);

      Object.entries(params).forEach(([key, value]) => {
        if (key === "page" || value === undefined || value === null) {
          return;
        }
        query.set(key, String(value));
      });

      return query.toString();
    };

    const getRequestKey = (localeKey: string, page: number, params: Record<string, any> = {}) => {
      const safeParams = { ...params };
      delete safeParams.page;
      return `${localeKey}:${page}:${JSON.stringify(safeParams)}`;
    };

    const fetchAndStorePage = async (
      localeKey: string,
      page: number,
      params: Record<string, any> = {},
    ) => {
      const requestKey = getRequestKey(localeKey, page, params);

      if (!pendingRequests.value[requestKey]) {
        pendingRequests.value[requestKey] = (async () => {
          //regarder dans le store du tenant si tenantType est objetheque
          const tenant = await TenantService.conf();
          let response;
          if (tenant.tenantType === 'objetheque' && tenant.feedCityDefault) {
            response = await $api.city().getFeed(
              tenant.feedCityDefault,
              buildQueryParams(localeKey, page, params),
            );
          } else {
            response = await $api.newsfeed.fetch(
              buildQueryParams(localeKey, page, params),
            );
          }
          setNewsFeed(localeKey, response, page);
          return response;
        })()
          .catch((error) => {
            throw error;
          })
          .finally(() => {
            delete pendingRequests.value[requestKey];
          });
      }

      return pendingRequests.value[requestKey];
    };

    const prefetchPage = async (
      localeKey: string,
      page: number,
      params: Record<string, any> = {},
    ) => {
      if (!page) {
        return;
      }
      const feed = getFeedState(localeKey);
      if (feed.loadedPages >= page || feed.hasReachedEnd) {
        return;
      }

      if (!prefetchedPages.value[localeKey]) {
        prefetchedPages.value[localeKey] = new Set<number>();
      }
      const prefetched = prefetchedPages.value[localeKey];
      if (prefetched.has(page)) {
        return;
      }

      prefetched.add(page);
      try {
        await fetchAndStorePage(localeKey, page, params);
        scheduleDelayedPrefetch(localeKey, page + 1, params);
      } catch (error) {
        console.warn("Newsfeed prefetch failed.", error);
      } finally {
        prefetched.delete(page);
      }
    };

    const scheduleDelayedPrefetch = (
      localeKey: string,
      nextPage: number,
      params: Record<string, any>,
    ) => {
      if (!nextPage) {
        return;
      }
      const feed = getFeedState(localeKey);
      if (feed.hasReachedEnd) {
        return;
      }
      clearDelayedPrefetch(localeKey);
      delayedPrefetchTimers.value[localeKey] = setTimeout(() => {
        prefetchPage(localeKey, nextPage, params).finally(() => {
          delete delayedPrefetchTimers.value[localeKey];
        });
      }, 5_000);
    };

    const refreshIfNeeded = async (locale: string) => {
      if (!LocalAuthenticationService.isLoggedIn()) {
        return;
      }

      const localeKey = getShortLocale(locale);
      if (!feeds.value[localeKey] || isFeedExpired(localeKey)) {
        try {
          await fetchAndStorePage(localeKey, 1, {});
        } catch (error) {
          console.warn("Newsfeed background refresh failed.", error);
        }
      }
    };

    const loadFeedPage = async (
      locale: string,
      params: Record<string, any>,
      options: { prefetchNext?: boolean } = {},
    ) => {
      const { prefetchNext = true } = options;
      const localeKey = getShortLocale(locale);
      const requestedPage = Number(params.page ?? 1);
      const feed = getFeedState(localeKey);
      const isFeedEmpty = feed.newsFeed.length === 0;

      if (isFeedEmpty && feed.hasReachedEnd) {
        feed.hasReachedEnd = false;
        feed.loadedPages = 0;
      }

      if (feed.hasReachedEnd && requestedPage > feed.loadedPages) {
        return {
          fromCache: true,
          hasReachedEnd: true,
          localeKey,
        };
      }

      if (!isFeedEmpty && !isFeedExpired(localeKey) && feed.loadedPages >= requestedPage) {
        return {
          fromCache: true,
          hasReachedEnd: feed.hasReachedEnd,
          localeKey,
        };
      }

      const response = await fetchAndStorePage(localeKey, requestedPage, params);

      if (prefetchNext) {
        scheduleDelayedPrefetch(localeKey, requestedPage + 1, params);
      }

      return {
        fromCache: false,
        response,
        hasReachedEnd: getFeedState(localeKey).hasReachedEnd,
        localeKey,
      };



    };

    const updateStoredElementIfNeeded = (feed: FeedState, existingIndex: number, item: any) => {
      const newUpdatedAtRaw = item?.updatedAt;
      if (!newUpdatedAtRaw) return;

      const newUpdatedAt = Date.parse(newUpdatedAtRaw);
      if (Number.isNaN(newUpdatedAt)) return;

      const existingItem = feed.newsFeed[existingIndex];
      const existingUpdatedAtRaw = existingItem?.updatedAt;
      const existingUpdatedAt = existingUpdatedAtRaw ? Date.parse(existingUpdatedAtRaw) : null;

      if (
        existingUpdatedAt === null ||
        Number.isNaN(existingUpdatedAt) ||
        newUpdatedAt > existingUpdatedAt
      ) {
        feed.newsFeed.splice(existingIndex, 1, item);
      }
    };

    return {
      feeds,
      getFeedState,
      getFeedAds,
      setNewsFeed,
      clearNewsFeed,
      isExpired: isFeedExpired,
      updateAdFavorite,
      updateAdFeatured,
      markPollAsAnswered,
      resetStore,
      refreshIfNeeded,
      loadFeedPage,
      trackViewedNews,
      startViewedNewsTracking,
      stopViewedNewsTracking,
      isPreferencesLoading,
    };
  },
  {
    persist: true,
  },
);

export default useFeedStore;
