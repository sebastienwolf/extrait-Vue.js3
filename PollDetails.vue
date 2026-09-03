<template>
  <AdDetailsCommon type="App\\Models\\Poll" :ad="poll" :hiddenComment="true">
    <template #content>
      <AddDetailsContainer
        v-if="poll"
        :add="poll"
        type="poll"
        :vertical="true"
      />
    </template>
  </AdDetailsCommon>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import AddDetailsContainer from "@/core/component/details/AddDetails/AddDetailsContainer.vue";
import AdDetailsCommon from "@/core/component/details/AddDetails/AdDetailsCommon.vue";

const props = defineProps({
  resource: {
    type: Object,
    required: true,
  },
});

const poll = ref(props.resource);
</script>
