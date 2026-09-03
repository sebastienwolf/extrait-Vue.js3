<template>
  <div
    class="flex flex-col gap-6 my-8 md:my-16 w-full sm:w-4/6 md:w-1/2 xl:w-1/3 m-auto"
  >
    <select-group-basic
      :label="$t('type-poll')"
      :infos="valueInputRadio"
      v-model="poll.type"
      :defaultSelected="poll.type"
      :errors="v$.type.$errors"
      name="type"
    />

    <input-group-basic
      v-model="poll.question"
      :label="$t('poll_question')"
      name="question"
      :errors="v$.question.$errors"
    />

    <div
      v-if="poll.type == 'single-choice' || poll.type == 'multi-choice'"
      class="flex flex-col gap-3"
    >
      <div
        v-for="(option, index) in poll.options"
        :key="index"
        class="w-full flex items-center gap-2"
      >
        <input-group-basic
          v-model="poll.options[index].option"
          :label="$t('option') + ' ' + (index + 1)"
          :errors="v$.options.$errors"
        />
        <button
          type="button"
          @click="removeOption(index)"
          v-if="poll.options.length > 2"
          class="text-red-500"
        >
          X
        </button>
      </div>

      <button type="button" @click="addOption" class="text-blue-500">
        + {{ $t("add_option") }}
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import InputGroupBasic from "@/core/component/formInputs/InputGroupBasic.vue";
import SelectGroupBasic from "@/core/component/formInputs/SelectGroupBasic.vue";
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { Poll } from "../interface";

const { t } = useI18n();

const dateValidate = ref(false);

const props = defineProps<{
  poll: Poll;
  type: string;
  v$: any;
}>();

const valueInputRadio = computed(() => {
  const options = [];
  options.push({ label: t("single-choice"), value: "single-choice" });
  options.push({ label: t("multi-choice"), value: "multi-choice" });
  options.push({ label: t("satisfaction-survey"), value: "satisfaction" });
  return options;
});

const addOption = () => {
  props.poll.options.push({ option: "" });
};

const removeOption = (index) => {
  props.poll.options.splice(index, 1);
};
</script>
