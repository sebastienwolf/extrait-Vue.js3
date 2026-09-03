<template>
  <ad-index
    @load-more-ads="loadOnePageOfData"
    @close-modal="closeModal"
    :data="data"
    :page-context="pageContext"
    :filter-enabled="true"
    :filters="filters"
    :filter-selected="filterSelected"
  />
</template>

<script lang="ts" setup>
import { reactive, onMounted } from "vue";
import { useI18n } from "vue-i18n";

import { $api } from "@/core/services/apis/api";

import { LocalAuthenticationService } from "@/core/services/auth/LocalAuthentication.service";
import FeatureService from "@/core/services/features/feature.service";

import AdIndex from "@/core/views/ad/index/AdIndex.vue";
import {
  AdIndexData,
  AdIndexPageContext,
  GenericAdIndexProps,
  AdFilter,
  FilterSelected,
} from "@/core/views/ad/index/AdIndexPropsTypes";
import { AdType, AdSubTypeService } from "@/types/ads";
import AdIndexHelper from "@/core/views/ad/index/AdIndexHelper";

const props = defineProps<GenericAdIndexProps>();

const { t, te } = useI18n();

const filterSelected = reactive<FilterSelected>({
  types: t("all"),
});

let data = reactive<AdIndexData>({
  ads: [],
  page: 1,
});

const filters = reactive<AdFilter>({
  types: [
    {
      label: t("See-skill-button"),
      title: t("See-skill-button"),
      value: AdSubTypeService.Skill,
      url: { name: "skill-index" }, // Route pour "skill"
    },
    {
      label: t("See-all-requests-button"),
      title: t("See-all-requests-button"),
      value: AdSubTypeService.Service,
      url: { name: "service-index" }, // Route pour "service"
    },
    {
      label: t("all"),
      title: t("all"),
      value: AdSubTypeService.All,
      url: { name: "service-all-index" }, // Route pour "all"
    },
  ],
});

const closeModal = () => {
  pageContext.state.showModal = false;
};

const pageContext = reactive<AdIndexPageContext>({
  type:
    props.subtype === AdSubTypeService.Skill ? AdType.Skill : AdType.Service,
  subtype: props.subtype,
  query: props.query,
  searchEnabled: true,
  labels: {
    heroTitle:
      props.query.context === "my-ads"
        ? t("My-service-requests-all")
        : t("Service-requests-all"),
    noAdsFound: t("No-service-request-found"),
  },
  heroActions: [],
  state: {
    errorText: "",
    showModal: false,
    loader: false,
    hasReachedEnd: false,
  },
  headerText: te("service_header_text") ? t("service_header_text") : undefined,
});

onMounted(() => {
  filterSelected.types = pageContext.subtype
    ? t(pageContext.subtype)
    : t("all");
  updateInfoInput();
});

const updateInfoInput = async () => {
  const isPublisher = await LocalAuthenticationService.isPublisher();

  pageContext.heroActions = [
    ...(pageContext.query.context === "my-ads"
      ? []
      : [
          ...(isPublisher
            ? [
                {
                  label: t("Propose-button"),
                  destination: { name: "skill-create-step-1" },
                },
              ]
            : []),
          ...(isPublisher
            ? [
                {
                  label: t("Ask-button"),
                  destination: { name: "service-create-step-1" },
                },
              ]
            : []),
        ]),
  ];
};

const loadOnePageOfData = async () => {
  if (pageContext.state.loader || pageContext.state.hasReachedEnd) {
    return; //Prevent multiple requests
  }

  pageContext.state.loader = true;
  if (props.subtype === AdSubTypeService.Service) {
    await $api
      .services()
      .asked(AdIndexHelper.buildRequestParams(pageContext, data))
      .then(async (response) => {
        const result = AdIndexHelper.handleApiSuccess(
          response,
          pageContext.state,
          data,
        );
        pageContext.state = result.state;
        data.page = result.data.page;
        data.ads = result.data.ads.map((item) => ({
          ...item,
          type: item.type || AdType.Service,
        }));
      })
      .catch((error) => {
        pageContext.state = AdIndexHelper.handleApiError(
          error,
          pageContext.state,
        );
      });
  } else if (props.subtype === AdSubTypeService.Skill) {
    await $api
      .skills()
      .proposed(AdIndexHelper.buildRequestParams(pageContext, data))
      .then(async (response) => {
        const result = AdIndexHelper.handleApiSuccess(
          response,
          pageContext.state,
          data,
        );
        pageContext.state = result.state;
        data.page = result.data.page;
        data.ads = result.data.ads.map((item) => ({
          ...item,
          type: item.type || AdType.Skill,
        }));
      })
      .catch((error) => {
        pageContext.state = AdIndexHelper.handleApiError(
          error,
          pageContext.state,
        );
      });
  } else {
    // Charger les deux types séparément en réutilisant la même logique helper
    const params = AdIndexHelper.buildRequestParams(pageContext, data);
    const [servicesResult, skillsResult] = await Promise.allSettled([
      $api.services().asked(params),
      $api.skills().proposed(params),
    ]);

    let services: any[] = [];
    let skills: any[] = [];

    if (servicesResult.status === "fulfilled") {
      const servicesResultData = AdIndexHelper.handleApiSuccess(
        servicesResult.value,
        pageContext.state,
        { ads: [], page: data.page },
      );
      services = servicesResultData.data.ads.map((item) => ({
        ...item,
        type: item.type || AdType.Service,
      }));
      data.page = servicesResultData.data.page;
    } else {
      pageContext.state = AdIndexHelper.handleApiError(
        servicesResult.reason,
        pageContext.state,
      );
    }

    if (skillsResult.status === "fulfilled") {
      const skillsResultData = AdIndexHelper.handleApiSuccess(
        skillsResult.value,
        pageContext.state,
        { ads: [], page: data.page },
      );
      skills = skillsResultData.data.ads.map((item) => ({
        ...item,
        type: item.type || AdType.Skill,
      }));
      data.page = skillsResultData.data.page;
    } else {
      pageContext.state = AdIndexHelper.handleApiError(
        skillsResult.reason,
        pageContext.state,
      );
    }

    const combined = [...services, ...skills];

    if (combined.length === 0) {
      pageContext.state.hasReachedEnd = true;
    } else {
      data.page++;
      data.ads = [...data.ads, ...combined];
    }
    pageContext.state.loader = false;
  }
};
</script>
