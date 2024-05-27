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
              <Button
                type="button"
                class="button-raised button-sm p-button-info px-3 m-1"
                @click="duplicateComponent($event)"
              ><span class="material-icons-outlined material-symbols-outlined">add</span> {{ $t('i18n.button.duplicate_component') }}
              </Button>
              <Button
                type="button"
                class="button-raised button-sm p-button-info px-3 m-1"
                @click="addGrouper($event)"
              ><span class="material-icons-outlined material-symbols-outlined">add</span> {{ $t('i18n.button.add_grouper') }}
              </Button>
            </template>
          </Panel>
          <div class="grid">
            <div class="col-4 form-mode">
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  <span class="material-icons-outlined material-symbols-outlined">map</span>
                  &nbsp;
                  <small>Name</small>
                </span>
                <InputText
                  v-model="formData.name"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.input.name.placeholder')"
                />
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  <span class="material-icons-outlined material-symbols-outlined">public</span>
                  &nbsp;
                  <small>Code</small>
                </span>
                <InputText
                  v-model="formData.language_code"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.input.language_code.placeholder')"
                />
                <InputText
                  v-model="formData.iso_3_digits"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.input.iso_3_digits.placeholder')"
                />
                <InputText
                  v-model="formData.iso_2_digits"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.input.iso_2_digits.placeholder')"
                />
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  <span class="material-icons-outlined material-symbols-outlined">calendar_month</span>
                  &nbsp;
                  <small>Weekday</small>
                </span>
                <InputText
                  v-model="formData.datetime_weekday"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.input.datetime_weekday.placeholder')"
                />
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  <span class="material-icons-outlined material-symbols-outlined">calendar_month</span>
                  &nbsp;
                  <small>Era</small>
                </span>
                <InputText
                  v-model="formData.datetime_era"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.input.iso_2_digits.placeholder')"
                />
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  <span class="material-icons-outlined material-symbols-outlined">calendar_month</span>
                  &nbsp;
                  <small>Year</small>
                </span>
                <InputText
                  v-model="formData.datetime_year"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.form.datetime_year')"
                />
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  <span class="material-icons-outlined material-symbols-outlined">calendar_month</span>
                  &nbsp;
                  <small>Month</small>
                </span>
                <InputText
                  v-model="formData.datetime_month"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.form.datetime_month')"
                />
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  <span class="material-icons-outlined material-symbols-outlined">calendar_month</span>
                  &nbsp;
                  <small>Day</small>
                </span>
                <InputText
                  v-model="formData.datetime_day"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.form.datetime_day')"
                />
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  <span class="material-icons-outlined material-symbols-outlined">schedule</span>
                  &nbsp;
                  <small>Hour</small>
                </span>
                <InputText
                  v-model="formData.datetime_hour"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.form.datetime_hour')"
                />
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  <span class="material-icons-outlined material-symbols-outlined">schedule</span>
                  &nbsp;
                  <small>Minute</small>
                </span>
                <InputText
                  v-model="formData.datetime_minute"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.form.datetime_minute')"
                />
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  <span class="material-icons-outlined material-symbols-outlined">schedule</span>
                  &nbsp;
                  <small>Second</small>
                </span>

                <InputText
                  v-model="formData.datetime_second"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.form.datetime_second')"
                />
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  <span class="material-icons-outlined material-symbols-outlined">schedule</span>
                  &nbsp;
                  <small>Timezone</small>
                </span>

                <InputText
                  v-model="formData.datetime_timezone_name"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.form.datetime_timezone_name')"
                />
              </div>
            </div>
            <div class="col-8 form-mode">
              <div class="card-container">
                <Tree
                v-model:selectionKeys="selectedComponent"
                  scrollHeight="500px"
                  :value="formData.componentTree.root"
                  :filter="true"
                  filterPlaceholder="Search component"
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
                            @click="addChild($event, slotProps.node)"
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
                    <span class="material-icons-outlined material-symbols-outlined">arrow_back</span> Back
                  </Button>
                </div>
                <div class="flex-grow-1 flex align-items-center justify-content-center m-2 px-5 py-3"></div>
                <div class="flex-initial flex align-items-right justify-content-center m-2 px-5 py-3">
                  <Button
                    type="button"
                    class="button-raised button-sm p-button-success px-3"
                    @click="submitLanguage($event)"
                  >
                    <span class="material-icons-outlined material-symbols-outlined">check_circle</span> Save Data
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>
      <ConfirmPopup group="confirm_changes"></ConfirmPopup>
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
              <span class="material-icons-outlined material-symbols-outlined">view_in_ar</span>
            </span>
            <InputText
              v-model="selectedComponentData.component"
              :disabled="selectedComponentData.editMode"
              class="inputtext-sm"
              :placeholder="$t('i18n.form.name')"
            />
            <span class="p-inputgroup-addon">
              <span class="material-icons-outlined material-symbols-outlined">public</span>
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
        language_code: '',
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
        datetime_timezone_name: '',
        components: [],
        componentTree: {
          root: [],
        },
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
        editMode: false,
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
          this.formData.components = getData.components
          this.formData.componentTree = getData.componentTree
          this.formData.componentIden = getData.componentIden
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
  },
  methods: {
    ...mapActions('corei18N', ['__add']),
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
        const dataSet = []
        if (this.selectedComponentData.editMode) {
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
            }
          }
        } else {
          dataSet.push({
            component: this.selectedComponentData.component,
            translation: this.selectedComponentData.translation,
          })

          if (
            !this.formData.componentIden[this.selectedComponentData.component]
          ) {
            this.formData.componentIden[this.selectedComponentData.component] =
              {}
          }

          this.formData.componentIden[this.selectedComponentData.component] = {
            component: this.selectedComponentData.component,
            translation: this.selectedComponentData.translation,
          }
        }

        for (const az in this.formData.componentIden) {
          this.formData.componentIden[az].component = az
          dataSet.push(this.formData.componentIden[az])
        }

        this.reRenderTree(dataSet)
      }

      // this.formData.componentTree.root.map((e) => {
      //   this.expandNode(e)
      // })

      this.displayEditorDialog = false
    },
    addChild(event, node) {
      const target = event.target
      this.nodeEditParentMode = true
      this.selectedComponentData = {
        identifier: `${node.data}.`,
        translation: '',
        component: `${node.data}.`,
        key: '',
        editMode: false,
      }
      this.displayEditorDialog = true
    },
    async duplicateComponent() {
      await this.$store
        .dispatch('corei18N/fetchi18nDetail', 9)
        .then((duplicateData) => {
          //
        })
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
          const dataSet = []

          const ab = this.formData.componentIden
          for (const a in ab) {
            const matches = new RegExp(`^${node.data}.*`)
            const check = a.match(matches)

            if (check && check !== null) {
              delete this.formData.componentIden[check[0]]
            }
          }

          for (const az in this.formData.componentIden) {
            this.formData.componentIden[az].component = az
            dataSet.push(this.formData.componentIden[az])
          }

          this.reRenderTree(dataSet)
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
          editMode: true,
        }
      } else {
        this.nodeEditParentMode = true
        this.selectedComponentData = {
          identifier: node.data,
          translation: node.label,
          component: node.label,
          key: node.key,
          editMode: true,
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
          await this.__add(this.formData).then(async (response) => {
            if (response.status === 201) {
              this.$router.push('/setting/i18n')
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

      node.map((e) => {
        const b = e.component
        const treeChecker = b.split('.')
        treeChecker.pop()
        const parentUnique = treeChecker.join('.')

        if (!ab[b]) {
          ab[b] = {}
        } else {
          delete this.formData.componentIden[parentUnique]
          delete ab[parentUnique]
        }

        // ab[b] = {}
      })

      this.formData.componentTree.root = parsedT(deepen(ab))
    },
    expandNode(node) {
      this.expandedKeys[node.key] = true
      if (node.children && node.children.length) {
        for (let child of node.children) {
          this.expandNode(child)
        }
      }
    },
    addGrouper(event) {
      this.nodeEditParentMode = true
      this.displayEditorDialog = true
    },
  },
}
</script>
