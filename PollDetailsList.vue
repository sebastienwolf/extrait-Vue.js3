<template>
  <!-- No local background or padding: the container box is provided by
      AdDetailsPanel in AddDetailsDescription. -->
  <div class="flex flex-col gap-6">
    <PollPieChart :results="formattedResults" v-if="formattedResults.length" />
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import PollPieChart from "./PollPieChart.vue";

const props = defineProps({
  add: {
    type: Object,
    required: true,
  },
});

const { t } = useI18n();

type PollType = "single-choice" | "multi-choice" | "satisfaction";

interface RawResultItem {
  option: string;
  count: number;
}

interface FormattedResultItem {
  option: string;
  count: number;
}

const formattedResults = computed<FormattedResultItem[]>(() => {
  const type = (props.add?.type || "single-choice") as PollType;
  const rawResults: RawResultItem[] = props.add?.results || [];

  if (!Array.isArray(rawResults)) {
    return [];
  }

  // For now, we use the same structure for all poll types.
  // If data differs by type later, we can adapt here.
  return rawResults.map((item) => ({
    option: item.option,
    count: item.count,
  }));
});
</script>
