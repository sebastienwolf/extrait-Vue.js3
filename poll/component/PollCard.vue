<template>
  <AdCard
    v-if="getRoute"
    :ad="item"
    :imageAsHeader="false"
    :destination="getRoute"
    :notClickable="true"
  >
    <template #header>
      <HeaderCard
        :text="item.header"
        :image="item?.owner[0]?.pictures[0]?.path"
        :userId="item?.owner[0]?.id"
      />
    </template>
    <template #post-description>
      <PollFormParticipate :poll="item[0]" />
    </template>
  </AdCard>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import AdCard from "@/core/component/adsCards/AdCard.vue";
import HeaderCard from "@/core/component/cardsComponents/HeaderCard.vue";
import { $ads } from "@/core/services/ads/ads";
import { $image } from "@/core/services/images/image";
import PollFormParticipate from "./PollFormParticipate.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const props = defineProps<{
  item: any;
  type: string;
}>();

const button_text = ref<string>(t("Learn-more"));
const image = ref<string>($image.getImage.getImageAndPrefix(props.item));

const safeGetOwner = computed(() => {
  if (props.item?.owner !== undefined) {
    return props.item.owner[0];
  } else {
    return props.item?.user[0];
  }
});

const getRoute = computed(() => {
  const result = $ads.getDetailRoute.getShowRouteService(
    "poll",
    props.item?.elementId,
  );
  return result;
});
</script>
