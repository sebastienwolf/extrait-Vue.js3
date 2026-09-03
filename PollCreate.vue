<template>
  <FullScreenLoader v-if="state.loading" />
  <template v-else>
    <div class="hidden md:block">
      <BasicHero :text="$t('create_poll')" :display_retour="true" />
    </div>

    <form @submit.prevent="submitForm">
      <div class="w-5/6 ml-5 mr-10 sm:w-full sm:mr-0 sm:ml-0">
        <div
          class="flex items-start justify-start w-full sm:w-4/6 md:w-1/2 xl:w-1/3 m-auto flex-col gap-4 md:gap-6 my-1"
        >
          <div class="w-full">
            <select-group-basic
              :label="$t('type-poll')"
              :infos="valueInputRadio"
              v-model="formData.type"
              :defaultSelected="formData.type"
              :errors="v$.type.$errors"
              name="type"
            />
          </div>
          <div class="w-full">
            <input-group-basic
              v-model="formData.question"
              :label="$t('poll_question')"
              name="question"
              :errors="v$.question.$errors"
            />
          </div>

          <template
            v-if="
              formData.type == 'single-choice' ||
              formData.type == 'multi-choice'
            "
          >
            <div
              v-for="(option, index) in formData.options"
              :key="index"
              class="w-full flex items-center gap-2"
            >
              <div class="flex-1">
                <input-group-basic
                  v-model="formData.options[index]"
                  :label="$t('option') + ' ' + (index + 1)"
                  :errors="v$.options.$errors"
                />
              </div>
              <button
                type="button"
                @click="removeOption(index)"
                v-if="formData.options.length > 2"
                class="text-red-500"
              >
                X
              </button>
            </div>

            <button type="button" @click="addOption" class="text-blue-500">
              + {{ $t("add_option") }}
            </button>
          </template>

          <!-- --------------------------------------- -->
          <!-- date open form  -->
          <div class="w-full">
            <Toggles
              name="public_add"
              v-model="formData.select_period"
              :label="$t('select-period-poll')"
            />

            <div v-if="formData.select_period" class="w-full mt-4">
              <button
                type="button"
                @click="openModalDate"
                class="inline-flex w-full justify-center rounded-md bg-lightgray px-3 py-2 text-sm font-semibold text-gray-600 shadow-sm hover:bg-gray-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
              >
                {{
                  datePeriods.period
                    ? datePeriods.period
                    : $t("choice-date-poll")
                }}
              </button>
            </div>
          </div>

          <!-- --------------------------------------- -->
          <!-- Visibility announcement  -->
          <VisibilitySection
            :show="
              !props.idGroup &&
              (getCurrentUserHaveFriends || getCurrentUserHaveGroups)
            "
            :label="$t('limit-visibility')"
            :options="valueInputRadioMultipleVisibility"
            :visibility-errors="v$.visibilityAdd?.$errors"
            :from-group-errors="v$.from_group?.$errors"
            :group-options="valueInputGroupSelect"
            :show-group-selector="true"
            v-model:reduce-visibility="formData.reduce_visibility"
            v-model:visibility-add="formData.visibilityAdd"
            v-model:from-group="formData.from_group"
            v-model:publish-to-groups="formData.publish_to_groups"
          />
          <!-- --------------------------------------- -->

          <div class="w-full mt-6">
            <submit-button-basic
              :label="$t('form.save')"
              :disabled="state.loading"
            />
          </div>
        </div>
      </div>
    </form>
  </template>
  <ErrorModals
    :error="state.errorText"
    :open="state.showModal"
    :closeModal="closeModal"
  />

  <ModalDateAndTime
    :open="state.modalDateAndTime"
    :period="datePeriods.period"
    :errors="v$.start.$errors"
    @close="closeModalDate"
    @update:period="updatePeriod"
    :title="$t('date-event')"
    :type="formData.type"
  />
</template>

<script lang="ts" setup>
import { reactive, computed, ref, onMounted, watch } from "vue";
import useVuelidate from "@vuelidate/core";
import { requiredWithoutLabels } from "@/utils/i18n-validators";
import { useI18n } from "vue-i18n";
import { $apiPoll } from "@/modules/poll/services/apisPoll";
import { useRouter } from "vue-router";
import BasicHero from "@/core/component/hero/BasicHero.vue";
import InputGroupBasic from "@/core/component/formInputs/InputGroupBasic.vue";
import SubmitButtonBasic from "@/core/component/formInputs/SubmitButtonBasic.vue";
import RadioGroupSimple from "@/core/component/formInputs/RadioGroupSimple.vue";
import ErrorModals from "@/core/component/modals/ErrorModals.vue";
import FullScreenLoader from "@/core/component/technical/FullScreenLoader.vue";
import { $apiGroup } from "@/modules/group/services/apis/apisGroup";
import FeatureService from "@/core/services/features/feature.service";
import SelectGroupBasic from "@/core/component/formInputs/SelectGroupBasic.vue";
import Toggles from "@/core/component/formInputs/Toggles.vue";
import VisibilitySection from "@/core/component/formInputs/VisibilitySection.vue";
import ModalDateAndTime from "@/core/component/modals/ModalDateAndTime.vue";
import { $time } from "@/core/services/times/time";
import { LocalAuthenticationService } from "@/core/services/auth/LocalAuthentication.service";

const getCurrentUserHaveGroups = computed(() => {
  return LocalAuthenticationService.getUserData()?.have_groups;
});

const getCurrentUserHaveFriends = computed(() => {
  return LocalAuthenticationService.getUserData()?.have_friends;
});

const props = defineProps({
  idGroup: {
    type: Number,
    required: false,
  },
});

const { t } = useI18n();
const router = useRouter();
const valueInputGroupSelect = ref([]);
const valueInputRadioMultiple = [
  { label: t("Toggle-Yes"), value: true },
  { label: t("Toggle-No"), value: false },
];

const datePeriods = reactive({
  period: "",
});

const groupsEnabled = computed(() => {
  return FeatureService.isEnabled("GROUPS_ENABLED");
});

const updatePeriod = (newPeriod) => {
  datePeriods.period = newPeriod;
};

const closeModalDate = () => {
  state.modalDateAndTime = false;
};

const openModalDate = () => {
  state.modalDateAndTime = true;
};

const state = reactive({
  errorText: "" as string,
  showModal: false as boolean,
  loading: false as boolean,
  modalDateAndTime: false as boolean,
});

const formData = reactive({
  question: "",
  options: ["", ""],
  type: "single-choice",
  from_group: null,
  visibility: "public",
  publish_to_groups: true,
  visibilityAdd: "public",
  reduce_visibility: true,
  select_period: false,
  period: [],
  start: null,
  end: null,
});

const requiredWithoutEmptyOptions = () => {
  return formData.options.every((option) => option.trim() !== "");
};

const rules = computed(() => {
  const baseRules = {
    type: { requiredWithoutLabels },
    question: { requiredWithoutLabels },
    visibility: {},
    publish_to_groups: {},
    start: formData.select_period ? { requiredWithoutLabels } : {},
    end: formData.select_period ? { requiredWithoutLabels } : {},
  };

  const optionsRules = {
    options: {
      required: requiredWithoutEmptyOptions,
    },
  };

  const groupRules = {
    from_group: { requiredWithoutLabels },
  };

  const rulesBase =
    formData.type === "single-choice" || formData.type === "multi-choice"
      ? { ...baseRules, ...optionsRules }
      : { ...baseRules };

  const isGroupContext = formData.visibilityAdd === "group" || !!props.idGroup;

  return isGroupContext ? { ...rulesBase, ...groupRules } : { ...rulesBase };
});

const valueInputRadioMultipleVisibility = computed(() => [
  { label: t("public"), value: "public" },
  ...(getCurrentUserHaveFriends.value
    ? [{ label: t("member-my-network"), value: "friend" }]
    : []),
  ...(getCurrentUserHaveGroups.value && groupsEnabled.value
    ? [{ label: t("member-on-one-my-group"), value: "group" }]
    : []),
]);

const valueInputRadio = computed(() => {
  const options = [];
  options.push({ label: t("single-choice"), value: "single-choice" });
  options.push({ label: t("multi-choice"), value: "multi-choice" });
  options.push({ label: t("satisfaction-survey"), value: "satisfaction" });
  return options;
});

const v$ = useVuelidate(rules, formData);

watch(
  () => formData.reduce_visibility,
  (isLimited) => {
    if (!isLimited) {
      formData.visibilityAdd = "public";
      formData.from_group = null;
    }
  },
);

const addOption = () => {
  formData.options.push("");
};

const removeOption = (index) => {
  formData.options.splice(index, 1);
};

const submitForm = async () => {
  const isGroupContext = formData.visibilityAdd === "group" || !!props.idGroup;

  if (isGroupContext) {
    if (!formData.from_group) {
      if (props.idGroup) {
        formData.from_group = props.idGroup.toString();
      }
    }

    formData.visibility = "group" + formData.from_group;
  } else {
    formData.visibility = formData.visibilityAdd;
  }
  $time.ago.dateFormaterOnForm(formData, datePeriods.period, false);

  const result = await v$.value.$validate();

  if (result) {
    state.loading = true;
    try {
      const response = await $apiPoll.PollAuth.post(formData);
      if (props.idGroup) {
        router.push({
          name: "group-dashboard",
          params: { id: props.idGroup },
        });
        return;
      } else {
        router.push({
          name: "dashboard-index",
        });
      }
    } catch (error) {
      state.errorText = error.response?.data?.message || "";
      state.showModal = true;
    } finally {
      state.loading = false;
    }
  }
};

onMounted(async () => {
  state.loading = true;
  if (!props.idGroup && groupsEnabled.value) {
    const groups = await $apiGroup.groupAuth.userGroups().then((response) => {
      valueInputGroupSelect.value = response.groups.map((groups: any) => ({
        label: t("member-of") + " " + groups.title,
        value: groups.id.toString(),
      }));

      return response.groups;
    });
  }

  if (props.idGroup) {
    formData.from_group = props.idGroup.toString();
    formData.visibilityAdd = "group";
    formData.reduce_visibility = true;
  }
  state.loading = false;
});

const closeModal = () => {
  state.showModal = false;
};
</script>
