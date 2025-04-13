<template>
  <div class="grid">
    <div class="col-12">
      <Card class="slim">
        <template #content>
          <Panel header="i18n Management" :toggleable="false">
            <template #icons>
              <Button
                type="button"
                class="button-raised button-sm p-button-info px-3 m-1"
                @click="duplicateComponent($event)"
                ><span class="material-icons-outlined material-symbols-outlined">add</span>
                {{ $t('i18n.button.duplicate_component') }}
              </Button>
              <Button
                type="button"
                class="button-raised button-sm p-button-info px-3 m-1"
                @click="addGrouper()"
                ><span class="material-icons-outlined material-symbols-outlined">add</span>
                {{ $t('i18n.button.add_grouper') }}
              </Button>
            </template>
          </Panel>
          <div class="grid">
            <div class="col-4 form-mode">
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  <span class="material-icons-outlined material-symbols-outlined">map</span>
                  &nbsp;
                  <small>{{ $t('i18n.input.name.caption') }}</small>
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
                  <small>{{ $t('i18n.input.language_code.caption') }}</small>
                </span>
                <InputText
                  v-model="formData.language_code"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.input.language_code.placeholder')"
                />
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  <span class="material-icons-outlined material-symbols-outlined">map</span>
                  &nbsp;
                  <small>{{ $t('i18n.input.iso_3_digits.caption') }}</small>
                </span>
                <InputText
                  v-model="formData.iso_3_digits"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.input.iso_3_digits.placeholder')"
                />
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  <span class="material-icons-outlined material-symbols-outlined">map</span>
                  &nbsp;
                  <small>{{ $t('i18n.input.iso_2_digits.caption') }}</small>
                </span>
                <InputText
                  v-model="formData.iso_2_digits"
                  class="inputtext-sm"
                  :placeholder="$t('i18n.input.iso_2_digits.placeholder')"
                />
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  <span class="material-icons-outlined material-symbols-outlined"
                    >calendar_month</span
                  >
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
                  <span class="material-icons-outlined material-symbols-outlined"
                    >calendar_month</span
                  >
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
                  <span class="material-icons-outlined material-symbols-outlined"
                    >calendar_month</span
                  >
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
                  <span class="material-icons-outlined material-symbols-outlined"
                    >calendar_month</span
                  >
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
                  <span class="material-icons-outlined material-symbols-outlined"
                    >calendar_month</span
                  >
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
                          <b
                            :class="`${formData.componentIden[`${slotProps.node.data}`] ? 'end-tree-selector' : ''}`"
                            >{{
                              formData.componentIden[`${slotProps.node.data}`]
                                ? `${slotProps.node.label} - ${formData.componentIden[`${slotProps.node.data}`].translation}`
                                : slotProps.node.label
                            }}</b
                          >
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
                <div
                  class="flex-initial flex align-items-center justify-content-center m-2 px-5 py-3"
                >
                  <Button
                    type="button"
                    class="button-raised button-sm p-button-danger px-3"
                    @click="back()"
                  >
                    <span class="material-icons-outlined material-symbols-outlined"
                      >arrow_back</span
                    >
                    Back
                  </Button>
                </div>
                <div
                  class="flex-grow-1 flex align-items-center justify-content-center m-2 px-5 py-3"
                ></div>
                <div
                  class="flex-initial flex align-items-right justify-content-center m-2 px-5 py-3"
                >
                  <Button
                    type="button"
                    class="button-raised button-sm p-button-success px-3"
                    @click="submitLanguage($event)"
                  >
                    <span class="material-icons-outlined material-symbols-outlined"
                      >check_circle</span
                    >
                    Save Data
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
              <span class="material-icons-outlined material-symbols-outlined">view_in_ar</span>
            </span>
            <Dropdown
              v-model="selectedComponentData.menu"
              filter
              :options="formData.menuData"
              optionLabel="name"
              placeholder="Select menu"
              filter-placeholder="Search menu"
              @change="getSelectMenu"
              @filter="loadMenu($event)"
            />
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
<script lang="ts">
import { deepen, parsedT, sort } from '@/utils/core/object'
import { storeCore } from '@/store/index'
import { storei18n } from '../store'
import { mapStores, mapActions } from 'pinia'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Corei18nEdit',
  data() {
    return {
      formData: {
        id: 0,
        language_code: '',
        iso_2_digits: '',
        iso_3_digits: '',
        datetime: {
          short: {
            weekday: '' as string,
            era: '' as string,
            year: '' as string,
            month: '' as string,
            day: '' as string,
            hour: '' as string,
            minute: '' as string,
            second: '' as string,
            timezone_name: '' as string,
          },
          long: {
            weekday: '' as string,
            era: '' as string,
            year: '' as string,
            month: '' as string,
            day: '' as string,
            hour: '' as string,
            minute: '' as string,
            second: '' as string,
            timezone_name: '' as string,
          },
        },
        number: {
          currency: {
            style: '' as string,
            currency: '' as string,
            notation: '' as string,
          },
          decimal: {
            style: '' as string,
            maximumFractionDigits: 0 as number,
            minimumFractionDigits: 0 as number,
          },
          percent: {
            style: '' as string,
            useGrouping: false as boolean,
          },
        },
        // datetime_weekday: '',
        // datetime_era: '',
        // datetime_year: '',
        // datetime_month: '',
        // datetime_day: '',
        // datetime_hour: '',
        // datetime_minute: '',
        // datetime_second: '',
        // datetime_timezone_name: '',
        components: [],
        componentTree: {
          root: [],
        },
        componentIden: {},
        menu: {},
        menuData: [],
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
        menu: {},
      },
      nodes: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expandedKeys: {} as any,
      allowSave: false,
      nodeEditParentMode: false,
      duplicateCompsMode: false,
    }
  },
  computed: {
    ...mapStores(storei18n),
  },
  async mounted() {
    this.allowSave = false
    this.displayEditorDialog = false
    await this.getDetail(this.$route.params.id.toString())
  },
  methods: {
    ...mapActions(storeCore, ['allowDispatch', 'UIToggleEditingData']),
    async getDetail(id: string) {
      await this.i18nStore.detail(id).then((response) => {
        const components = response.components
        const ab = {}
        const Objectidentifier = {}
        components.map((e) => {
          const b = e.component
          if (!Objectidentifier[b]) {
            Objectidentifier[b] = {}
          }

          Objectidentifier[b] = e

          if (!ab[b]) {
            ab[b] = {}
          }

          ab[b] = {}
        })

        response.componentTree = { root: parsedT(deepen(ab)) }
        response.componentIden = Objectidentifier

        if (this.duplicateCompsMode) {
          this.formData.components = components
          this.formData.componentTree = { root: parsedT(deepen(ab)) }
          this.formData.componentIden = Objectidentifier
        } else {
          this.formData = response
        }
      })
    },
    onNodeSelect() {
      //
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async reformatTree(data: any, condition: any, appendix: any) {
      const result = []
      for (const ab in data) {
        const checkGroup = new RegExp(`^${condition}`).test(data[ab].data)
        if (checkGroup) {
          result.push({
            ...data[ab],
            ...appendix,
            children: this.reformatTree(data[ab].children, condition, appendix),
          })
        } else {
          result.push({
            ...data[ab],
            children: this.reformatTree(data[ab].children, condition, appendix),
          })
        }
      }
      return sort(result, 'label')
    },
    async getSelectMenu() {
      const targetObject = this.formData.componentIden
      const targetGroup = this.selectedComponentData.identifier
      const _this = this
      Object.keys(targetObject).some(function (key) {
        const checkGroup = new RegExp(`^${targetGroup}`).test(key)
        if (checkGroup) {
          _this.formData.componentIden[key] = {
            ...targetObject[key],
            menu: _this.selectedComponentData.menu,
          }
        }
      })

      const resultTree = this.reformatTree(this.formData.componentTree.root, targetGroup, {
        menu: this.selectedComponentData.menu,
      })

      this.formData.componentIden = _this.formData.componentIden
      this.formData.componentTree.root = resultTree
    },
    async loadMenu(event = { value: '' }) {
      const targetSearch = event.value ?? ''
      // await CoreService.menuSearch({
      //   first: 0,
      //   rows: 10,
      //   sortField: 'created_at',
      //   sortOrder: 1,
      //   filters: {
      //     name: {
      //       matchMode: 'contains',
      //       value: targetSearch,
      //     },
      //   },
      // }).then((response) => {
      //   this.formData.menuData = response.payload.data
      // })
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
        this.formData.componentIden[`${this.selectedComponentData.identifier}`].translation =
          this.selectedComponentData.translation
      } else {
        const dataSet = []
        if (this.selectedComponentData.editMode) {
          const currentParentIden = this.selectedComponentData.identifier
          alert(currentParentIden)

          const mimicIden = this.formData.componentIden
          for (const ab in mimicIden) {
            const checkString = mimicIden[ab].component
            const position = checkString.indexOf(currentParentIden)
            if (position >= 0) {
              // var regex = new RegExp(`.${currentParentIden}.`, 'g')
              const checkLevel = currentParentIden.split('.')
              checkLevel.splice(checkLevel.length - 1, 1, this.selectedComponentData.translation)

              const regex = new RegExp(`${currentParentIden}`, 'g')

              const newIdentifier = checkString.replace(regex, `${checkLevel.join('.')}`)
              if (!this.formData.componentIden[newIdentifier]) {
                this.formData.componentIden[newIdentifier] = {}
              }

              this.formData.componentIden[newIdentifier] = this.formData.componentIden[checkString]

              // delete this.formData.componentIden[checkString]
            }
          }
        } else {
          dataSet.push({
            component: this.selectedComponentData.component,
            translation: this.selectedComponentData.translation,
            menu: this.selectedComponentData.menu ?? {},
          })

          if (!this.formData.componentIden[this.selectedComponentData.component]) {
            this.formData.componentIden[this.selectedComponentData.component] = {}
          }

          this.formData.componentIden[this.selectedComponentData.component] = {
            component: this.selectedComponentData.component,
            translation: this.selectedComponentData.translation,
            menu: this.selectedComponentData.menu ?? {},
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addChild(event: any, node: any) {
      // const target = event.target
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deleteChild(event: any, node: any) {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editChild(event: any, node: any) {
      const target = event.target
      if (node.children && node.children.length < 1) {
        this.nodeEditParentMode = false
        this.selectedComponentData = {
          identifier: node.data,
          translation: this.formData.componentIden[`${node.data}`].translation,
          menu: this.formData.componentIden[`${node.data}`].menu ?? {},
          component: node.label,
          key: node.key,
          editMode: true,
        }
      } else {
        this.nodeEditParentMode = true
        this.selectedComponentData = {
          identifier: node.data,
          translation: node.label,
          menu: node.menu,
          component: node.label,
          key: node.key,
          editMode: true,
        }
      }
      this.displayEditorDialog = true
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    submitLanguage(event: any) {
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
          await this.i18nStore
            .edit(this.formData.id.toString(), this.formData)
            .then(async (response) => {
              this.$confirm.require({
                group: 'keep_editing',
                message: `${response.message}. Back to language list?`,
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
            })
            .catch(() => {
              //
            })
        },
        reject: () => {
          //
        },
      })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reRenderTree(node: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ab: any = {}

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      node.map((e: any) => {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expandNode(node: any) {
      this.expandedKeys[node.key] = true
      if (node.children && node.children.length) {
        for (let child of node.children) {
          this.expandNode(child)
        }
      }
    },
    async duplicateComponent() {
      this.duplicateCompsMode = true
      // await this.$store.dispatch('corei18N/fetchi18nDetail', 9)
    },
    addGrouper() {
      this.nodeEditParentMode = true
      this.displayEditorDialog = true
    },
  },
})
</script>
