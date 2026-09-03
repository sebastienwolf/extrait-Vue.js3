<template>
  <ViewTechnical404 v-if="!resource" />
  <PollDetails v-else :resource="resource" />
</template>

<script lang="ts">
import { defineComponent } from "vue";
import ViewTechnical404 from "@/core/views/technical/404.vue";
import PollDetails from "@/modules/poll/view/PollDetails.vue";

export default defineComponent({
  name: "PollDetailsOrNotFound",
  components: {
    ViewTechnical404,
    PollDetails,
  },
  props: {
    resource: {
      type: Object,
      default: null,
    },
  },
});
</script>
