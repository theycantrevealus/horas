<template>
  <div class="grid">
    <div class="col-12">
      <Card class="slim">
        <template #content>
          <Panel
            header="i18n Management"
            :toggleable="false"
          >
            <template #icons>
              <Button class="p-button-text p-button-info p-button-rounded p-button-raised button-sm"><span class="material-icons">help</span>
                Info</Button>
            </template>
          </Panel>
          <div class="grid">
            <div class="col-12 form-mode">
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  <span class="material-icons-outlined">map</span>
                </span>
                <InputText
                  v-model="formData.name"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.form.name')"
                />
                <span class="p-inputgroup-addon">
                  <span class="material-icons-outlined">public</span>
                </span>
                <InputText
                  v-model="formData.iso_3_digits"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.form.iso_3_digits')"
                />
                <InputText
                  v-model="formData.iso_2_digits"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.form.iso_2_digits')"
                />
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  <span class="material-icons-outlined">calendar_month</span>
                </span>
                <InputText
                  v-model="formData.iso_3_digits"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.form.datetime_weekday')"
                />
                <InputText
                  v-model="formData.iso_2_digits"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.form.datetime_era')"
                />
                <InputText
                  v-model="formData.datetime_year"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.form.datetime_year')"
                />
                <InputText
                  v-model="formData.datetime_month"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.form.datetime_month')"
                />
                <InputText
                  v-model="formData.datetime_day"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.form.datetime_day')"
                />
                <InputText
                  v-model="formData.datetime_hour"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.form.datetime_hour')"
                />
                <InputText
                  v-model="formData.datetime_minute"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.form.datetime_minute')"
                />
                <InputText
                  v-model="formData.datetime_second"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.form.datetime_second')"
                />
                <InputText
                  v-model="formData.datetime_timezone_name"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.form.datetime_timezone_name')"
                />
              </div>
              <Tree
                v-model:selectionKeys="selectedComponent"
                :value="formData.componentTree.root"
                :filter="true"
                filterMode="lenient"
                selectionMode="single"
                @nodeSelect="onNodeSelect"
              >
                <template #default="slotProps">
                  {{ slotProps.node.label }}
                </template>
              </Tree>
            </div>
          </div>
          <div class="p-grid">
            <div class="p-col-12">
              <div class="flex jc-between">
                <div class="flex-initial flex align-items-center justify-content-center m-2 px-5 py-3">
                  <Button
                    type="button"
                    class="button-raised button-sm p-button-danger px-3"
                    @click="back()"
                  >
                    <span class="material-icons-outlined">arrow_back</span> Back
                  </Button>
                </div>
                <div class="flex-grow-1 flex align-items-center justify-content-center m-2 px-5 py-3"></div>
                <div
                  v-if="allowSave === true"
                  class="flex-initial flex align-items-right justify-content-center m-2 px-5 py-3"
                >
                  <Button
                    type="button"
                    class="button-raised button-sm p-button-info px-3"
                  >
                    <span class="material-icons-outlined">check_circle</span> Save Data
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>
      <ConfirmPopup group="confirm_changes"></ConfirmPopup>
      <ConfirmDialog group="keep_editing"></ConfirmDialog>
    </div>
    <Dialog
      v-model:visible="displayEditorDialog"
      header="Component Edit"
      :style="{ width: '50vw' }"
      :modal="true"
    >
      <div class="grid">
        <div class="col-12 form-mode">
          <div class="p-inputgroup">
            <span class="p-inputgroup-addon">
              <span class="material-icons-outlined">view_in_ar</span>
            </span>
            <InputText
              v-model="selectedComponentData.component"
              class="inputtext-sm"
              :placeholder="$t('i18n.form.name')"
            />
            <span class="p-inputgroup-addon">
              <span class="material-icons-outlined">public</span>
            </span>
            <InputText
              v-model="selectedComponentData.translation"
              class="inputtext-sm"
              :placeholder="$t('i18n.form.iso_3_digits')"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <Button
          label="Close"
          icon="pi pi-times"
          class="button-text button-raised button-sm p-button-danger px-3"
          @click="closeComponentDialog"
        />
        <Button
          label="Submit"
          icon="pi pi-check"
          class="button-text button-raised button-sm p-button-success px-3"
        />
      </template>
    </Dialog>
  </div>
</template>
<script>
import Card from 'primevue/card'
import Panel from 'primevue/panel'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import ConfirmPopup from 'primevue/confirmpopup'
import Dialog from 'primevue/dialog'
import ConfirmDialog from 'primevue/confirmdialog'
import Tree from 'primevue/tree'

import { mapActions, mapGetters, mapState } from 'vuex'
export default {
  name: 'Corei18nEdit',
  components: {
    Card,
    Panel,
    InputText,
    Button,
    ConfirmPopup,
    ConfirmDialog,
    Dialog,
    Tree,
  },
  data() {
    return {
      formData: {
        id: 0,
        iso_2_digits: '',
        iso_3_digits: '',
        datetime_weekday: '',
        datetime_era: '',
        datetime_year: '',
        datetime_month: '',
        datetime_day: '',
        datetime_hour: '',
        datetime_minute: '',
        datetime_second: '',
        datetiem_timezone_name: '',
        components: [],
        componentTree: {},
        componentIden: {},
      },
      displayEditorDialog: false,
      selectedComponent: null,
      selectedComponentData: {
        translation: '',
        component: '',
      },
      nodes: null,
      expandedKeys: {},
      allowSave: false,
    }
  },

  computed: {
    ...mapGetters({
      getDetail: 'corei18N/fetchi18nDetail',
    }),
  },
  watch: {
    getDetail: {
      handler(getData) {
        if (getData) {
          this.formData = getData
        }
      },
    },
  },
  async mounted() {
    this.allowSave = false
    this.displayEditorDialog = false
    await this.$store.dispatch('corei18N/fetchi18nDetail', this.$route.query.id)
  },
  methods: {
    onNodeSelect(node) {
      if (node.children && node.children.length < 1) {
        this.selectedComponentData = {
          translation: this.formData.componentIden[`${node.data}`].translation,
          component: node.label,
        }
        this.displayEditorDialog = true
      }
    },
    closeComponentDialog() {
      this.displayEditorDialog = false
    },
    back() {
      this.$router.push('/setting/i18n')
    },
  },
}
</script>