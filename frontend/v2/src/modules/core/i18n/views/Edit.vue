<template>
  <div class="grid">
    <div class="col-12">
      <Card class="slim">
        <template #header>
          <Panel :toggleable="false">
            <template #header>
              <p class="font-bold text-2xl w-10">{{ $t('i18n.label.title.caption') }}</p>
              <p class="text-blue-600">Doc Ver. {{ formData.v }}</p>
            </template>
            <template #icons>
              <Button
                class="p-button-secondary p-button-rounded p-button-raised button-sm"
                @click="back"
                ><span class="material-icons">arrow_back</span> Back</Button
              >
            </template>
          </Panel>
        </template>
        <template #content>
          <div class="grid">
            <div class="col-6 form-mode">
              <Fieldset legend="Basic">
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
              </Fieldset>

              <Fieldset legend="Date-Time">
                <p class="m-0 p-3">
                  Internationalization (i18n) datetime configuration involves defining how dates and
                  times are formatted and displayed for different locales or regions.
                </p>
                <Divider />
                <table>
                  <thead>
                    <tr>
                      <th></th>
                      <th>Short</th>
                      <th>Long</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Weekday</td>
                      <td>
                        <InputText
                          v-model="formData.datetime.short.weekday"
                          class="inputtext-sm"
                          :placeholder="$t('i18n.input.datetime.short.weekday.placeholder')"
                        />
                      </td>
                      <td>
                        <InputText
                          v-model="formData.datetime.long.weekday"
                          class="inputtext-sm"
                          :placeholder="$t('i18n.input.datetime.long.weekday.placeholder')"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>Era</td>
                      <td>
                        <InputText
                          v-model="formData.datetime.short.era"
                          class="inputtext-sm"
                          :placeholder="$t('i18n.input.datetime.short.era.placeholder')"
                        />
                      </td>
                      <td>
                        <InputText
                          v-model="formData.datetime.long.era"
                          class="inputtext-sm"
                          :placeholder="$t('i18n.input.datetime.long.era.placeholder')"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>Year</td>
                      <td>
                        <InputText
                          v-model="formData.datetime.short.year"
                          class="inputtext-sm"
                          :placeholder="$t('i18n.input.datetime.short.year.placeholder')"
                        />
                      </td>
                      <td>
                        <InputText
                          v-model="formData.datetime.long.year"
                          class="inputtext-sm"
                          :placeholder="$t('i18n.input.datetime.long.year.placeholder')"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>Month</td>
                      <td>
                        <InputText
                          v-model="formData.datetime.short.month"
                          class="inputtext-sm"
                          :placeholder="$t('i18n.input.datetime.short.month.placeholder')"
                        />
                      </td>
                      <td>
                        <InputText
                          v-model="formData.datetime.long.month"
                          class="inputtext-sm"
                          :placeholder="$t('i18n.input.datetime.long.month.placeholder')"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>Day</td>
                      <td>
                        <InputText
                          v-model="formData.datetime.short.day"
                          class="inputtext-sm"
                          :placeholder="$t('i18n.input.datetime.short.day.placeholder')"
                        />
                      </td>
                      <td>
                        <InputText
                          v-model="formData.datetime.long.day"
                          class="inputtext-sm"
                          :placeholder="$t('i18n.input.datetime.long.day.placeholder')"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>Hour</td>
                      <td>
                        <InputText
                          v-model="formData.datetime.short.hour"
                          class="inputtext-sm"
                          :placeholder="$t('i18n.input.datetime.short.hour.placeholder')"
                        />
                      </td>
                      <td>
                        <InputText
                          v-model="formData.datetime.long.hour"
                          class="inputtext-sm"
                          :placeholder="$t('i18n.input.datetime.long.hour.placeholder')"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>Minute</td>
                      <td>
                        <InputText
                          v-model="formData.datetime.short.minute"
                          class="inputtext-sm"
                          :placeholder="$t('i18n.input.datetime.short.minute.placeholder')"
                        />
                      </td>
                      <td>
                        <InputText
                          v-model="formData.datetime.long.minute"
                          class="inputtext-sm"
                          :placeholder="$t('i18n.input.datetime.long.minute.placeholder')"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>Second</td>
                      <td>
                        <InputText
                          v-model="formData.datetime.short.second"
                          class="inputtext-sm"
                          :placeholder="$t('i18n.input.datetime.short.second.placeholder')"
                        />
                      </td>
                      <td>
                        <InputText
                          v-model="formData.datetime.long.second"
                          class="inputtext-sm"
                          :placeholder="$t('i18n.input.datetime.long.second.placeholder')"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>Timezone Name</td>
                      <td>
                        <InputText
                          v-model="formData.datetime.short.timezone_name"
                          class="inputtext-sm"
                          :placeholder="$t('i18n.input.datetime.short.timezone_name.placeholder')"
                        />
                      </td>
                      <td>
                        <InputText
                          v-model="formData.datetime.long.timezone_name"
                          class="inputtext-sm"
                          :placeholder="$t('i18n.input.datetime.long.timezone_name.placeholder')"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Fieldset>
              <Fieldset legend="Currency">
                <p class="m-0 p-3">
                  Internationalization (i18n) currency configuration involves defining how
                  currencies are formatted and displayed for different locales or regions.
                </p>
                <Divider />
                <div class="p-inputgroup">
                  <span class="p-inputgroup-addon">
                    <span class="material-icons-outlined material-symbols-outlined">map</span>
                    &nbsp;
                    <small>{{ $t('i18n.input.currency.style.caption') }}</small>
                  </span>
                  <InputText
                    v-model="formData.number.currency.style"
                    class="inputtext-sm"
                    :placeholder="$t('i18n.input.input.currency.style.placeholder')"
                  />
                </div>
                <div class="p-inputgroup">
                  <span class="p-inputgroup-addon">
                    <span class="material-icons-outlined material-symbols-outlined">map</span>
                    &nbsp;
                    <small>{{ $t('i18n.input.currency.name.caption') }}</small>
                  </span>
                  <InputText
                    v-model="formData.number.currency.currency"
                    class="inputtext-sm"
                    :placeholder="$t('i18n.input.input.currency.name.placeholder')"
                  />
                </div>
                <div class="p-inputgroup">
                  <span class="p-inputgroup-addon">
                    <span class="material-icons-outlined material-symbols-outlined">map</span>
                    &nbsp;
                    <small>{{ $t('i18n.input.currency.notation.caption') }}</small>
                  </span>
                  <InputText
                    v-model="formData.number.currency.notation"
                    class="inputtext-sm"
                    :placeholder="$t('i18n.input.input.currency.notation.placeholder')"
                  />
                </div>
              </Fieldset>
            </div>
            <div class="col-6 form-mode">
              <Fieldset legend="Translation Meta">
                <p class="m-0 p-3">
                  i18n (Internationalization) refers to the process of designing and developing
                  software, applications, or content to be adaptable to different languages,
                  cultures, and regions (based on json meta structure)
                </p>
                <Divider />
                <Button
                  type="button"
                  class="button-raised button-sm p-button-info px-3 m-1"
                  @click="duplicateComponent"
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
                            class="p-button-rounded button-sm p-button-info"
                            @click="editChild(slotProps.node)"
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
              </Fieldset>
              <Fieldset legend="Decimal">
                <p class="m-0 p-3">
                  Internationalization (i18n) decimal configuration involves defining how decimals
                  are formatted and displayed for different locales or regions.
                </p>
                <Divider />
                <div class="p-inputgroup">
                  <span class="p-inputgroup-addon">
                    <span class="material-icons-outlined material-symbols-outlined">map</span>
                    &nbsp;
                    <small>{{ $t('i18n.input.decimal.style.caption') }}</small>
                  </span>
                  <InputText
                    v-model="formData.number.decimal.style"
                    class="inputtext-sm"
                    :placeholder="$t('i18n.input.input.decimal.style.placeholder')"
                  />
                </div>
                <div class="p-inputgroup">
                  <span class="p-inputgroup-addon">
                    <span class="material-icons-outlined material-symbols-outlined">map</span>
                    &nbsp;
                    <small>{{ $t('i18n.input.decimal.max_fraction.caption') }}</small>
                  </span>
                  <InputNumber
                    v-model="formData.number.decimal.maximumFractionDigits"
                    class="inputtext-sm"
                    :placeholder="$t('i18n.input.input.decimal.max_fraction.placeholder')"
                  />
                </div>
                <div class="p-inputgroup">
                  <span class="p-inputgroup-addon">
                    <span class="material-icons-outlined material-symbols-outlined">map</span>
                    &nbsp;
                    <small>{{ $t('i18n.input.decimal.min_fraction.caption') }}</small>
                  </span>
                  <InputNumber
                    v-model="formData.number.decimal.minimumFractionDigits"
                    class="inputtext-sm"
                    :placeholder="$t('i18n.input.input.decimal.min_fraction.placeholder')"
                  />
                </div>
              </Fieldset>
              <Fieldset legend="Percent">
                <p class="m-0 p-3">
                  Internationalization (i18n) percent configuration involves defining how
                  percentages are formatted and displayed for different locales or regions.
                </p>
                <Divider />
                <div class="p-inputgroup">
                  <span class="p-inputgroup-addon">
                    <span class="material-icons-outlined material-symbols-outlined">map</span>
                    &nbsp;
                    <small>{{ $t('i18n.input.percent.style.caption') }}</small>
                  </span>
                  <InputText
                    v-model="formData.number.percent.style"
                    class="inputtext-sm"
                    :placeholder="$t('i18n.input.input.percent.style.placeholder')"
                  />
                </div>
                <div class="p-inputgroup">
                  <span class="p-inputgroup-addon">
                    <span class="material-icons-outlined material-symbols-outlined">map</span>
                    &nbsp;
                    <small>{{ $t('i18n.input.percent.grouping.caption') }}</small>
                  </span>
                  <div class="flex flex-wrap gap-4 m-1">
                    <div class="flex items-center gap-1">
                      <ToggleButton
                        v-model="formData.number.percent.useGrouping"
                        onIcon="pi pi-check"
                        offIcon="pi pi-times"
                        :invalid="!formData.number.percent.useGrouping"
                        class="w-full sm:w-40"
                        aria-label="Confirmation"
                      />
                    </div>
                  </div>
                </div>
              </Fieldset>
            </div>
          </div>
        </template>
        <template #footer>
          <div class="flex flex-row-reverse p-6">
            <Button
              class="p-button-success p-button-rounded p-button-raised button-sm m-2"
              label="Save"
              v-on:click="submitLanguage($event)"
            />
            <Button
              class="p-button-secondary p-button-rounded p-button-raised button-sm m-2"
              label="Cancel"
              v-on:click="back"
            />
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
              :placeholder="$t('i18n.input.component.name.placeholder')"
            />
            <span class="p-inputgroup-addon">
              <span class="material-icons-outlined material-symbols-outlined">public</span>
            </span>
            <InputText
              v-model="selectedComponentData.translation"
              class="inputtext-sm"
              :placeholder="$t('i18n.input.component.translation.placeholder')"
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
import { storeMenu } from '../../menu/store'
import { mapStores, mapActions } from 'pinia'
import { defineComponent } from 'vue'
import type { CoreResponse } from '@/interfaces/api'

export default defineComponent({
  name: 'Corei18nEdit',
  data() {
    return {
      formData: {
        v: 0,
        id: '',
        name: '',
        remark: '',
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        components: [] as any[],
        componentTree: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          root: [] as any[],
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        componentIden: {} as any,
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
    ...mapStores(storeMenu),
  },
  async mounted() {
    this.allowSave = false
    this.displayEditorDialog = false
    await this.getDetail(this.$route.params.id.toString())
  },
  methods: {
    ...mapActions(storeCore, ['allowDispatch', 'UIToggleEditingData']),
    async getDetail(id: string) {
      await this.i18nStore.detail(id).then((response: CoreResponse) => {
        const data = response.payload
        this.formData.v = data.__v
        const components = data.components
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ab: any = {}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Objectidentifier: any = {}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        components.map((e: any) => {
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

        data.componentTree = { root: parsedT(deepen(ab)) }
        data.componentIden = Objectidentifier

        if (this.duplicateCompsMode) {
          this.formData.components = components
          this.formData.componentTree = { root: parsedT(deepen(ab)) }
          this.formData.componentIden = Objectidentifier
        } else {
          this.formData = data
          this.formData.v = data.__v
        }
      })
    },
    onNodeSelect() {
      //
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async reformatTree(data: any, condition: any, appendix: any): Promise<any[]> {
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
      // eslint-disable-next-line @typescript-eslint/no-this-alias
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

      const resultTree = await this.reformatTree(this.formData.componentTree.root, targetGroup, {
        menu: this.selectedComponentData.menu,
      })

      this.formData.componentIden = _this.formData.componentIden
      this.formData.componentTree.root = resultTree
    },
    async loadMenu(event = { value: '' }) {
      const targetSearch = event.value ?? ''
      this.formData.menuData = await this.menuStore
        .list({
          first: 0,
          rows: 10,
          projection: {},
          sortField: 'name',
          sortOrder: 1,
          filters: { name: { value: targetSearch, matchMode: 'contains' } },
        })
        .then((response) => {
          const data = response.payload.data
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return data.map((e: any) => {
            return {
              name: e.name,
              id: e.id,
            }
          })
        })
    },
    closeComponentDialog() {
      this.displayEditorDialog = false
    },
    closeErrorDialog() {
      this.displayResponseError = false
    },
    back() {
      this.$router.push('/core/i18n')
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
        menu: {},
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
        acceptClass: 'p-button-danger',
        rejectClass: 'p-button-secondary  ',
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
    editChild(node: any) {
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
    submitLanguage(event: MouseEvent) {
      const componentRaw = this.formData.componentIden
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const componentParsed: any = []
      for (const a in componentRaw) {
        componentParsed.push(componentRaw[a])
      }
      this.formData.components = componentParsed
      const confirmation = this.$confirm
      confirmation.require({
        group: 'confirm_changes',
        target: event.currentTarget as HTMLElement,
        header: 'Confirmation',
        message: `Update language?`,
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-warning',
        rejectClass: 'p-button-secondary',
        acceptIcon: 'pi pi-check-circle',
        acceptLabel: 'Yes',
        rejectLabel: 'Abort',
        rejectIcon: 'pi pi-times-circle',
        accept: async () => {
          await this.i18nStore
            .edit(this.formData.id.toString(), { __v: this.formData.v, ...this.formData })
            .then(async (response) => {
              this.$confirm.require({
                group: 'keep_editing',
                message: `${response.message}. Back to language list?`,
                header: 'Keep editting?',
                icon: 'pi pi-exclamation-triangle',
                acceptClass: 'p-button-success',
                rejectClass: 'p-button-secondary',
                acceptLabel: 'Yes',
                acceptIcon: 'pi pi-check-circle',
                rejectLabel: 'Keep Editing',
                rejectIcon: 'pi pi-times-circle',
                accept: () => {
                  this.$router.push('/core/i18n')
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
