import { LocalAuthenticationService } from "@/core/services/auth/LocalAuthentication.service";
import { checkIsAdminGroup } from "@/modules/group/utils";
import { checkResourceExists, checkResourceOthers } from "@/router/utils";
import FeatureService from "@/core/services/features/feature.service";
import { TenantService } from "@/core/services/tenant/Tenant.service";

import { AdSubType } from "@/types/ads";

import { Capacitor } from "@capacitor/core";

type RouterNext = (to?: any) => void;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isBackendDownError = (error: unknown): error is { type?: string } => {
  return Boolean(isRecord(error) && "type" in error && error.type === "backend-down");
};

const abortNavigationOnBackendDown = (error: unknown, next: RouterNext) => {
  if (isBackendDownError(error)) {
    next(false);
    return true;
  }
  return false;
};


const ViewTechnicalTenant = () =>
  import("@/core/views/technical/Technical.vue");
const ViewBasicLogin = () => import("@/core/views/auth/BasicLogin.vue");
const ViewTermsAndConditions = () =>
  import("@/core/views/auth/BasicTermsAndConditions.vue");
const ViewRegister = () => import("@/core/views/auth/Register.vue");
const Home = () => import("@/core/views/home/Home.vue");
const Faq = () => import("@/core/views/findOutMore/Faq.vue");
const Terms = () => import("@/core/views/findOutMore/Terms.vue");
const Privacy = () => import("@/core/views/findOutMore/Privacy.vue");
const NewsFeed = () => import("@/core/views/newsFeed/NewsFeedIndex.vue");
const Notification = () =>
  import("@/core/views/notification/NotificationIndex.vue");
const NotificationRedirect = () =>
  import("@/core/views/notification/NotificatinRedirect.vue");
const ItemDetails = () => import("@/core/views/item/ItemDetails.vue");
const ItemDetailsOrNotFound = () => import("@/core/views/item/ItemDetailsOrNotFound.vue");
const ItemContestManagement = () => import("@/modules/contest/views/contestDetailsAdmin.vue");
const ItemReservations = () => import("@/core/views/item/ItemReservations.vue");
const ItemNeedIndex = () => import("@/core/views/ad/index/ItemNeedIndex.vue");
const ItemNeedDetails = () =>
  import("@/core/views/itemNeed/ItemNeedDetails.vue");

[...]


export default {
  routes: [
    {
      path: "/",
      component: BasicLayout,
      children: [
        {
          path: "",
          name: "home",
          component: Home,
          meta: {
            requiresNoAuth: true,
            checkFeature: {
              feature: "LANDING_ENABLED",
              fallbacks: [
                {
                  feature: "FEED_CITY_ENABLED",
                  route: "redirect-feed-city",
                },
                {
                  feature: "ITEM_TO_RENT_ENABLED",
                  route: "item-index",
                },
              ],
            },
          },
        },
      ],
    },
    {
      path: "/contact",
      component: BasicLayout,
      children: [
        {
          path: "",
          name: "contact",
          component: ContactAdmin,
        },
      ],
    },
    {
      path: "/reportings",
      component: BasicLayout,
      children: [
        {
          path: "",
          name: "reportings-index",
          component: ReportingIndex,
          meta: {
            requiresAuth: true,
            // beforeEnter: "others",
            // type: "reportings",
          },
          props: (route) => ({
            resource: route.params.resource,
            query: route.query,
          }),
        },
      ],
    },
    {
      path: "/faq",
      component: BasicLayout,
      children: [
        {
          path: "",
          name: "faq",
          component: Faq,
          meta: {
            beforeEnter: "others",
            type: "faq",
          },
          props: (route) => ({ resource: route.params.resource }),
        },
      ],
    },
    {
      path: "/terms",
      component: BasicLayout,
      children: [
        {
          path: "",
          name: "terms",
          component: Terms,
          meta: {
            beforeEnter: "others",
            type: "terms",
          },
          props: (route) => ({ resource: route.params.resource }),
        },
      ],
    },
    {
      path: "/privacy",
      component: BasicLayout,
      children: [
        {
          path: "",
          name: "privacy",
          component: Privacy,
          meta: {
            beforeEnter: "others",
            type: "privacy",
          },
          props: (route) => ({ resource: route.params.resource }),
        },
      ],
    },
    {
      path: "/childprotect",
      component: BasicLayout,
      children: [
        {
          path: "",
          name: "childprotect",
          component: ChildProtect,
          meta: {
            beforeEnter: "others",
            type: "childprotect",
          },
          props: (route) => ({ resource: route.params.resource }),
        },
      ],
    },
    {
      path: "/account/deletion",
      component: BasicLayout,
      children: [
        {
          path: "",
          name: "DeleteAccount",
          component: DeleteAccount,
          meta: {
            beforeEnter: "others",
            type: "DeleteAccount",
          },
          props: (route) => ({ resource: route.params.resource }),
        },
      ],
    },
    {
      path: "/items",
      component: BasicLayout,
      children: [
        {
          path: ":id(\\d+)",
          children: [
            {
              path: "",
              name: "item-details",
              component: ItemDetailsOrNotFound,
              meta: {
                activeNav: "item",
                beforeEnter: "items",
                showMobileNav: false,
                showNotFoundInPlace: true,
              },
              props: (route) => ({ resource: route.params.resource }),
            },
            {
              path: "edit",
              name: "item-edit",
              component: UpdateAdd,
              props: (route) => ({ id: Number(route.params.id), query: route.query }),
              meta: {
                requiresAuth: true,
                activeNav: "item",
              },
            },
            {
              path: "delete",
              name: "item-delete",
              component: DeletePage,
              props: (route) => ({ id: Number(route.params.id) }),
              meta: {
                activeNav: "item",
                requiresAuth: true,
                type: "items",
              },
            },
              [...]
            },
          ],
        },
        {
          path: "reservations",
          name: "item-reservations",
          component: ItemReservations,
          meta: {
            requiresAuth: true,
            activeNav: "item",
          },
        },
        {
          path: ":exchangetype?/:category?/:tag?",
          name: "item-index",
          component: ItemIndex,
          props: (route) => ({
            exchangetype:
              route.params.exchangetype && route.params.exchangetype !== "all"
                ? route.params.exchangetype
                : undefined,
            category:
              route.params.category && route.params.category !== "all"
                ? route.params.category
                : undefined,
            tag:
              route.params.tag && route.params.tag !== "all"
                ? route.params.tag
                : undefined,
            query: route.query,
          }),
          meta: {
            activeNav: "item",
          },

        },
      ],
    },

    [...]
guards: [
    [...]
     async (to, from, next) => {
      if (to.meta.beforeEnter) {
        let exists = null;
        if (to.meta.beforeEnter === "others") {
          exists = await checkResourceOthers(to.meta.type);
        } else {
          exists = await checkResourceExists(
            to.meta.beforeEnter,
            to.params.id as string,
          );
        }
        if (exists) {
          if (exists.invalidUser) {
            if (exists.invalidUser === "guest_cannot_see_content") {
              next({
                name: "invalid-user",
                params: { type: "guest" },
                query: { intendedUrl: to.fullPath },
              });
            } else {
              next({
                name: "invalid-user",
                params: { type: "mail" },
                query: { intendedUrl: to.fullPath },
              });
            }
          } else {
            to.params.resource = exists;
            next();
          }
        } else {
          // For routes that support showing 404 without redirect (marked with showNotFoundInPlace)
          if (to.meta.showNotFoundInPlace) {
            // Set resource to null to indicate resource not found
            // The component will receive null and display 404 content
            to.params.resource = null;
            next();
          } else {
            // Legacy behavior: redirect to /technical/404
            next({ name: "error-404" });
          }
        }
      } else {
        next();
      }
    },
     [...]
    ]
