<template>
  <div class="w-full flex flex-col items-center gap-4">
    <div class="max-w-2/3">
      <canvas ref="chartCanvas"></canvas>
    </div>
    <div class="w-4/5 sm:w-1/3 max-w-md space-y-2" v-if="legendItems.length">
      <div
        v-for="item in legendItems"
        :key="item.option"
        class="flex items-center justify-between text-sm"
      >
        <div class="flex items-center gap-2">
          <span
            class="inline-block h-3 w-3 rounded-full"
            :style="{ backgroundColor: item.color }"
          ></span>
          <span>{{ item.option }}</span>
        </div>
        <div class="font-semibold">
          {{ item.count }}
          <span class="text-gray-500" v-if="total > 0">
            ({{ ((item.count / total) * 100).toFixed(1) }} %)
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onBeforeUnmount, ref, watch, computed } from "vue";
import Chart from "chart.js/auto";

interface ResultItem {
  option: string;
  count: number;
}

const props = defineProps<{
  results: ResultItem[];
}>();

const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const total = computed(() =>
  props.results?.reduce((sum, item) => sum + (item.count || 0), 0),
);

const getColor = (index: number): string => {
  // Generates a different HSL color based on the index.
  const hue = (index * 47) % 360; // 47 is close to a prime step for good spread.
  return `hsl(${hue}, 70%, 50%)`;
};

const legendItems = computed(() =>
  (props.results || []).map((item, index) => ({
    option: item.option,
    count: item.count,
    color: getColor(index),
  })),
);

const buildChart = () => {
  if (!chartCanvas.value) return;

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(chartCanvas.value, {
    type: "pie",
    data: {
      labels: props.results?.map((r) => r.option) || [],
      datasets: [
        {
          data: props.results?.map((r) => r.count) || [],
          backgroundColor: legendItems.value.map((i) => i.color),
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });
};

onMounted(() => {
  buildChart();
});

watch(
  () => props.results,
  () => {
    buildChart();
  },
  { deep: true },
);

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy();
  }
});
</script>
