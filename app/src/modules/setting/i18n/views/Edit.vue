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
                :expandedKeys="expandedKeys"
                @nodeSelect="onNodeSelect"
              >
                <template #default="slotProps">
                  <div class="inline-block custom">
                    <div class="flex flex-row flex-wrap card-container">
                      <div class="action-container">
                        <Button
                          icon="pi pi-plus"
                          class="p-button-rounded button-sm p-button-success"
                        />
                        <Button
                          icon="pi pi-trash"
                          class="p-button-rounded button-sm p-button-danger"
                          @click="deleteChild($event, slotProps.node)"
                        />
                        <Button
                          icon="pi pi-pencil"
                          class="p-button-rounded button-sm p-button-warning"
                          @click="editChild($event, slotProps.node)"
                        />
                      </div>
                      <div class="flex align-items-center block">
                        <b :class="`${(formData.componentIden[`${slotProps.node.data}`]) ? 'end-tree-selector' : ''}`">{{ (formData.componentIden[`${slotProps.node.data}`]) ? `${slotProps.node.label} - ${formData.componentIden[`${slotProps.node.data}`].translation}` : slotProps.node.label }}</b>
                      </div>
                    </div>
                  </div>
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
                <div class="flex-initial flex align-items-right justify-content-center m-2 px-5 py-3">
                  <Button
                    type="button"
                    class="button-raised button-sm p-button-success px-3"
                    @click="submitLanguage($event)"
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
      <ConfirmDialog group="delete_child"></ConfirmDialog>
    </div>
    <Dialog
      v-model:visible="displayResponseError"
      header="Failed to submit data"
      :style="{ width: '50vw' }"
      :modal="true"
    >
      <p>{{ errorMessage }}</p>
      <template #footer>
        <Button
          label="Close"
          icon="pi pi-times"
          class="button-text button-raised button-sm p-button-danger px-3"
          @click="closeErrorDialog"
        />
      </template>
    </Dialog>
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
              disabled="disabled"
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
          @click="submitComponentChanges"
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
import { deepen, parsedT } from '@/util/object'

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
      errorMessage: '',
      displayEditorDialog: false,
      displayResponseError: false,
      selectedComponent: null,
      selectedComponentData: {
        identifier: '',
        translation: '',
        component: '',
        key: '',
      },
      nodes: null,
      expandedKeys: {},
      allowSave: false,
      nodeEditParentMode: false,
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
          getData.componentTree.root.map((e) => {
            this.expandNode(e)
          })
        }
      },
    },
  },
  async mounted() {
    this.allowSave = false
    this.displayEditorDialog = false
    await this.$store.dispatch(
      'corei18N/fetchi18nDetail',
      this.$route.params.id
    )
  },
  methods: {
    ...mapActions('corei18N', ['__update']),
    onNodeSelect(node) {
      //
    },
    closeComponentDialog() {
      this.displayEditorDialog = false
    },
    closeErrorDialog() {
      this.displayResponseError = false
    },
    back() {
      this.$router.push('/setting/i18n')
    },
    submitComponentChanges() {
      if (!this.nodeEditParentMode) {
        this.formData.componentIden[
          `${this.selectedComponentData.identifier}`
        ].translation = this.selectedComponentData.translation
      } else {
        const currentParentIden = this.selectedComponentData.identifier

        const mimicIden = this.formData.componentIden
        for (const ab in mimicIden) {
          const checkString = mimicIden[ab].component
          const position = checkString.indexOf(currentParentIden)
          if (position >= 0) {
            var regex = new RegExp(`.${currentParentIden}.`, 'g')
            const checkLevel = currentParentIden.split('.')
            checkLevel.splice(
              checkLevel.length - 1,
              1,
              this.selectedComponentData.translation
            )

            var regex = new RegExp(`${currentParentIden}`, 'g')

            const newIdentifier = checkString.replace(
              regex,
              `${checkLevel.join('.')}`
            )
            if (!this.formData.componentIden[newIdentifier]) {
              this.formData.componentIden[newIdentifier] = {}
            }

            this.formData.componentIden[newIdentifier] =
              this.formData.componentIden[checkString]

            delete this.formData.componentIden[checkString]

            // console.log(this.formData.componentIden)
          }
        }

        const dataSet = []
        for (const az in this.formData.componentIden) {
          this.formData.componentIden[az].component = az
          dataSet.push(this.formData.componentIden[az])
        }

        // this.reRenderTree(dataSet)
      }

      this.displayEditorDialog = false
    },
    addChild(event) {
      const target = event.target
    },
    deleteChild(event, node) {
      const target = event.target

      const confirmation = this.$confirm
      confirmation.require({
        group: 'delete_child',
        target: target,
        header: 'Delete node',
        message: `All child node will be deleted also`,
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'button-success',
        acceptIcon: 'pi pi-check-circle',
        acceptLabel: 'Yes',
        rejectLabel: 'Abort',
        rejectIcon: 'pi pi-times-circle',
        accept: async () => {
          alert()
        },
      })
    },
    editChild(event, node) {
      const target = event.target
      if (node.children && node.children.length < 1) {
        this.nodeEditParentMode = false
        this.selectedComponentData = {
          identifier: node.data,
          translation: this.formData.componentIden[`${node.data}`].translation,
          component: node.label,
          key: node.key,
        }
      } else {
        this.nodeEditParentMode = true
        this.selectedComponentData = {
          identifier: node.data,
          translation: node.label,
          component: node.label,
          key: node.key,
        }
      }
      this.displayEditorDialog = true
    },
    submitLanguage(event) {
      const target = event.target
      const componentRaw = this.formData.componentIden
      const componentParsed = []
      for (const a in componentRaw) {
        componentParsed.push(componentRaw[a])
      }
      this.formData.components = componentParsed

      const confirmation = this.$confirm
      confirmation.require({
        group: 'confirm_changes',
        target: target,
        header: 'Confirmation',
        message: `Update language?`,
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'button-success',
        acceptIcon: 'pi pi-check-circle',
        acceptLabel: 'Yes',
        rejectLabel: 'Abort',
        rejectIcon: 'pi pi-times-circle',
        accept: async () => {
          await this.__update(this.formData).then(async (response) => {
            if (response.status === 200) {
              this.$confirm.require({
                group: 'keep_editing',
                message: `${response.data.message}. Back to language list?`,
                header: 'Keep editting?',
                icon: 'pi pi-exclamation-triangle',
                acceptClass: 'p-button-success',
                rejectClass: 'p-button-warning',
                acceptLabel: 'Yes',
                acceptIcon: 'pi pi-check-circle',
                rejectLabel: 'Keep Editing',
                rejectIcon: 'pi pi-times-circle',
                accept: () => {
                  this.$router.push('/setting/i18n')
                },
                reject: () => {
                  //
                },
                onHide: () => {
                  //
                },
              })
            } else {
              this.errorMessage = response.message
              this.displayResponseError = true
            }
          })
        },
        reject: () => {
          //
        },
      })
    },
    reRenderTree(node) {
      const ab = {}
      node.map((b) => {
        if (!ab[b]) {
          ab[b] = {}
        }

        ab[b] = {}
      })
      const parsedData = parsedT(deepen(ab))
      console.log(parsedData)
    },
    expandNode(node) {
      this.expandedKeys[node.key] = true
      if (node.children && node.children.length) {
        for (let child of node.children) {
          this.expandNode(child)
        }
      }
    },
  },
}
</script>