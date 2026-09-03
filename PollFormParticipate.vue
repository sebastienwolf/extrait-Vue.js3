<template>
  <div v-if="alreadyParticipate">
    <p class="text-sm md:test-base text-primary">
      {{ alreadyParticipateText }}
    </p>
  </div>
  <form v-else @submit.prevent="submitForm">
    <Loader v-if="state.loading" />
    <div v-else class="w-5/6 ml-5 mr-10 sm:w-full sm:mr-0 sm:ml-0">
      <InputRadio
        v-if="inputRadio.length > 0 && props.typePoll === 'single-choice'"
        :infos="inputRadio"
        name="answers"
        :modelValue="formData.answers[0]"
        :errors="v$.answers.$errors"
        @update:modelValue="(value) => (formData.answers = [value])"
      />

      <InputCheckbox
        v-if="inputRadio.length > 0 && props.typePoll === 'multi-choice'"
        :infos="inputRadio"
        name="answers"
        :modelValue="formData.answers"
        :errors="v$.answers.$errors"
        @update:modelValue="(value) => (formData.answers = value)"
      />

      <InputSmilForm
        v-if="inputRadio.length > 0 && props.typePoll === 'satisfaction'"
        :infos="inputRadio"
        name="answers"
        :modelValue="formData.answers[0] ? Number(formData.answers[0]) : 0"
        :errors="v$.answers.$errors"
        @update:modelValue="(value) => (formData.answers = [value])"
      />

      <div
        v-if="props.typePoll !== 'satisfaction'"
        class="flex justify-center mt-4"
      >
        <submit-button-basic
          :label="$t('answer_poll')"
          :disabled="state.loading"
          :secondButon="true"
        />
      </div>
    </div>
  </form>
  <ErrorModals
    :error="state.errorText"
    :open="state.showModal"
    :closeModal="closeModal"
  />
</template>

<script lang="ts" setup>
import { reactive, computed, ref, onMounted } from "vue";
import InputRadio from "@/core/component/formInputs/InputRadio.vue";
import { LocalAuthenticationService } from "@/core/services/auth/LocalAuthentication.service";
import InputSmilForm from "@/core/component/formInputs/InputSmilForm.vue";
import useVuelidate from "@vuelidate/core";
import { requiredWithoutLabels } from "@/utils/i18n-validators";
import { useI18n } from "vue-i18n";
import { $apiPoll } from "@/modules/poll/services/apisPoll";
import { useRouter } from "vue-router";
import SubmitButtonBasic from "@/core/component/formInputs/SubmitButtonBasic.vue";
import ErrorModals from "@/core/component/modals/ErrorModals.vue";
import InputCheckbox from "@/core/component/formInputs/InputCheckbox.vue";
import Loader from "@/core/component/loader/Loader.vue";
import useFeedStore from "@/core/store/feedStore";

const { t } = useI18n();
const router = useRouter();
const alreadyParticipate = ref(false);
const alreadyParticipateText = ref("");

const props = defineProps<{
  poll: any;
  typePoll: string;
}>();

const state = reactive({
  errorText: "" as string,
  showModal: false as boolean,
  loading: false as boolean,
});

const formData = reactive({
  answers: [] as string[],
});

const rules = computed(() => {
  return {
    answers: { requiredWithoutLabels },
  };
});

const inputRadio = ref([]);

const user = LocalAuthenticationService.getUserData();
const v$ = useVuelidate(rules, formData);
const feedStore = useFeedStore();

const submitForm = async () => {
  const result = await v$.value.$validate();

  if (result) {
    state.loading = true;
    try {
      const response = await $apiPoll.PollAuth.answer(props.poll.id, formData);
      const pollId = props.poll.id;
      feedStore.markPollAsAnswered(pollId);

      alreadyParticipateText.value = response.message;
      alreadyParticipate.value = true;
    } catch (error) {
      state.errorText = error.response?.data?.message || "";
      state.showModal = true;
    }
    state.loading = false;
  }
};

const closeModal = () => {
  state.showModal = false;
};

onMounted(() => {
  const pollId = props.poll.id;
  // Vérifier si l'utilisateur a déjà répondu au sondage (info backend / store)
  if (props.poll.has_answered) {
    alreadyParticipate.value = true;
    alreadyParticipateText.value = t("already-answered");
  } else {
    inputRadio.value = props.poll.options.map((option) => ({
      label: option.option,
      value: option.id.toString(),
    }));
  }
});
</script>


