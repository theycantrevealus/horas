<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="grid">
    <div class="col-12">
      <Form
        :initialValues
        :resolver
        ref="form"
        :validateOnValueUpdate="true"
        :validateOnBlur="true"
        @submit="submit($event)"
        class="flex flex-col gap-4 w-full sm:w-56"
      >
        <Card class="slim">
          <template #header>
            <Panel :toggleable="false">
              <template #header>
                <p class="font-bold text-2xl w-10">Edit Master Item</p>
                <p class="text-blue-600">Doc Ver. {{ v }}</p>
              </template>
              <template #icons>
                <Button
                  class="p-button-secondary p-button-rounded p-button-raised button-sm"
                  @click="back"
                  ><span class="material-icons">arrow_back</span>
                  {{ $t('master.stock_point.button.edit.back.caption') }}</Button
                >
              </template>
            </Panel>
          </template>
          <template #content>
            <Tabs value="0">
              <TabList>
                <Tab value="0" as="div" class="flex items-center gap-2">
                  <span class="material-icons-outlined dark-mode-switch"> apps </span>
                  <span class="font-bold whitespace-nowrap">Basic Information</span>
                </Tab>
                <Tab value="1" as="div" class="flex items-center gap-2">
                  <span class="material-icons-outlined dark-mode-switch"> account_tree </span>
                  <span class="font-bold whitespace-nowrap">Configuration</span>
                </Tab>
              </TabList>
              <TabPanels>
                <TabPanel value="0" as="p" class="m-4">
                  <div class="flex flex-wrap justify-center gap-3">
                    <FormField
                      v-slot="$field"
                      :initialValue="initialValues.code"
                      name="code"
                      :resolver="codeResolver"
                      class="flex flex-col gap-1 w-2"
                    >
                      <FloatLabel variant="on">
                        <InputText
                          id="code"
                          v-model="initialValues.code"
                          autocomplete="off"
                          class="w-full"
                        />
                        <label for="code">Code</label>
                      </FloatLabel>
                      <Message
                        v-if="$field?.invalid"
                        severity="error"
                        size="small"
                        variant="simple"
                        >{{ $field.error?.message }}</Message
                      >
                    </FormField>
                    <FormField
                      v-slot="$field"
                      :initialValue="initialValues.name"
                      name="name"
                      :resolver="nameResolver"
                      class="flex flex-col gap-1 w-4"
                    >
                      <FloatLabel variant="on">
                        <InputText
                          id="name"
                          v-model="initialValues.name"
                          autocomplete="off"
                          class="w-full"
                        />
                        <label for="name">Name</label>
                      </FloatLabel>
                      <Message
                        v-if="$field?.invalid"
                        severity="error"
                        size="small"
                        variant="simple"
                        >{{ $field.error?.message }}</Message
                      >
                    </FormField>
                    <FormField
                      v-slot="$field"
                      :initialValue="initialValues.alias"
                      name="alias"
                      class="flex flex-col gap-1 w-4"
                    >
                      <FloatLabel variant="on">
                        <InputText
                          id="alias"
                          v-model="initialValues.alias"
                          autocomplete="off"
                          class="w-full"
                        />
                        <label for="alias">Alias</label>
                      </FloatLabel>
                      <Message
                        v-if="$field?.invalid"
                        severity="error"
                        size="small"
                        variant="simple"
                        >{{ $field.error?.message }}</Message
                      >
                    </FormField>
                    <FormField v-slot="$field" name="category" class="flex flex-col gap-1 w-4">
                      <FloatLabel variant="on">
                        <MultiSelect
                          id="category"
                          v-model="initialValues.category"
                          :options="ui.category.item"
                          display="chip"
                          optionLabel="name"
                          size="small"
                          @filter="filterCategory"
                          filter
                          showClear
                          resetFilterOnHide
                          class="w-full md:w-80"
                        >
                          <template #option="slotProps">
                            <Tag severity="info" :value="slotProps.option.code"></Tag
                            >&nbsp;<small>{{ slotProps.option.name }}</small>
                          </template></MultiSelect
                        >
                        <label for="category">Categories</label>
                      </FloatLabel>
                      <Message
                        v-if="$field?.invalid"
                        severity="error"
                        size="small"
                        variant="simple"
                        >{{ $field.error?.message }}</Message
                      >
                    </FormField>
                    <FormField v-slot="$field" name="unit" class="flex flex-col gap-1 w-4">
                      <FloatLabel variant="on">
                        <MultiSelect
                          id="unit"
                          v-model="initialValues.unit"
                          :options="ui.unit.item"
                          display="chip"
                          optionLabel="name"
                          size="small"
                          @filter="filterCategory"
                          filter
                          showClear
                          resetFilterOnHide
                          class="w-full md:w-80"
                        >
                          <template #option="slotProps">
                            <Tag severity="info" :value="slotProps.option.code"></Tag
                            >&nbsp;<small>{{ slotProps.option.name }}</small>
                          </template></MultiSelect
                        >
                        <label for="unit">Unit</label>
                      </FloatLabel>
                      <Message
                        v-if="$field?.invalid"
                        severity="error"
                        size="small"
                        variant="simple"
                        >{{ $field.error?.message }}</Message
                      >
                    </FormField>
                    <FormField v-slot="$field" name="brand" class="flex flex-col gap-1 w-3">
                      <FloatLabel variant="on">
                        <Select
                          v-model="initialValues.brand"
                          :options="ui.brand.item"
                          class="w-full md:w-56"
                          :loading="ui.brand.loading"
                          optionLabel="name"
                          size="small"
                          @filter="filterBrand"
                          filter
                        >
                          <template #value="slotProps">
                            <Tag
                              v-if="slotProps.value.name"
                              severity="info"
                              :value="slotProps.value.code"
                            ></Tag
                            >&nbsp;<small>{{ slotProps.value.name }}</small>
                          </template>
                          <template #option="slotProps">
                            <Tag severity="info" :value="slotProps.option.code"></Tag
                            >&nbsp;<small>{{ slotProps.option.name }}</small>
                          </template>
                          <template #header>
                            <div class="font-medium p-3">Search item brand</div>
                          </template>
                        </Select>
                        <label for="brand">Brand</label>
                      </FloatLabel>
                      <Message
                        v-if="$field?.invalid"
                        severity="error"
                        size="small"
                        variant="simple"
                        >{{ $field.error?.message }}</Message
                      >
                    </FormField>
                  </div>
                  <div class="grid my-3">
                    <div class="col-12 form-mode">
                      <Editor v-model="initialValues.remark" editorStyle="height: 320px" />
                    </div>
                  </div>
                </TabPanel>
                <TabPanel value="1" as="p" class="m-0">
                  <div class="flex flex-wrap justify-center gap-3 mx-3">
                    <div class="col-12 form">
                      <Fieldset legend="Inventory Configuration">
                        <div class="flex flex-wrap justify-center gap-3">
                          <div class="col-2 form-mode">
                            <div class="flex flex-col gap-2">
                              <label for="allow-grn">{{
                                $t('master.stock_point.input.allow_grn.caption')
                              }}</label>
                              <ToggleButton
                                id="allow_grn"
                                v-model="initialValues.configuration.allow_grn"
                                onLabel="Yes"
                                offLabel="No"
                              />
                            </div>
                          </div>
                          <div class="col-2 form-mode">
                            <div class="flex flex-col gap-2">
                              <label for="allow-incoming">{{
                                $t('master.stock_point.input.allow_incoming.caption')
                              }}</label>
                              <ToggleButton
                                id="allow-incoming"
                                v-model="initialValues.configuration.allow_incoming"
                                onLabel="Yes"
                                offLabel="No"
                              />
                            </div>
                          </div>
                          <div class="col-2 form-mode">
                            <div class="flex flex-col gap-2">
                              <label for="allow-outgoing">{{
                                $t('master.stock_point.input.allow_outgoing.caption')
                              }}</label>
                              <ToggleButton
                                id="allow-outgoing"
                                v-model="initialValues.configuration.allow_outgoing"
                                onLabel="Yes"
                                offLabel="No"
                              />
                            </div>
                          </div>
                          <div class="col-2 form-mode">
                            <div class="flex flex-col gap-2">
                              <label for="allow-destruction">{{
                                $t('master.stock_point.input.allow_destruction.caption')
                              }}</label>
                              <ToggleButton
                                id="allow-destruction"
                                v-model="initialValues.configuration.allow_destruction"
                                onLabel="Yes"
                                offLabel="No"
                              />
                            </div>
                          </div>
                        </div>
                      </Fieldset>
                      <Fieldset legend="Benefit Management">
                        <Splitter style="height: auto">
                          <SplitterPanel class="flex items-center justify-center">
                            <div class="flex flex-wrap justify-center gap-3 m-3">
                              <FormField
                                v-slot="$field"
                                name="benefit_type"
                                class="flex flex-col gap-1 w-6"
                              >
                                <FloatLabel variant="on">
                                  <Select
                                    v-model="initialValues.configuration.benefit_margin_type"
                                    :options="ui.benefit_type.item"
                                    class="w-full md:w-56"
                                    :loading="ui.benefit_type.loading"
                                    optionLabel="name"
                                    size="small"
                                    filter
                                  />
                                  <label for="benefit_type">Type</label>
                                </FloatLabel>
                                <Message
                                  v-if="$field?.invalid"
                                  severity="error"
                                  size="small"
                                  variant="simple"
                                  >{{ $field.error?.message }}</Message
                                >
                              </FormField>
                              <FormField
                                v-slot="$field"
                                :initialValue="initialValues.configuration.benefit_margin_value"
                                name="configuration.benefit_margin_value"
                                :resolver="benefitValueResolver"
                                class="flex flex-col gap-1 w-2"
                              >
                                <FloatLabel variant="on">
                                  <InputNumber
                                    id="configuration.benefit_margin_value"
                                    v-model="initialValues.configuration.benefit_margin_value"
                                    autocomplete="off"
                                    class="w-full"
                                  />
                                  <label for="configuration.benefit_margin_value">Value</label>
                                </FloatLabel>
                                <Message
                                  v-if="$field?.invalid"
                                  severity="error"
                                  size="small"
                                  variant="simple"
                                  >{{ $field.error?.message }}</Message
                                >
                              </FormField>
                            </div>
                          </SplitterPanel>
                          <SplitterPanel class="flex items-center justify-center">
                            <div class="flex flex-wrap justify-center gap-3 m-3">
                              <Message
                                ><b>Simulation:</b> In case of buy price is [<NumberLabel
                                  class="text-cyan-600"
                                  lang="ID"
                                  code="ID"
                                  currency="IDR"
                                  :number="simulator.basic_price"
                                  :decimal="0"
                                />], then sell prices will be [<NumberLabel
                                  class="text-cyan-600"
                                  lang="ID"
                                  code="ID"
                                  currency="IDR"
                                  :number="simulator.sell_price"
                                  :decimal="0"
                                />]
                              </Message>
                              <Button
                                class="p-button-info p-button-rounded p-button-raised button-sm m-2"
                                label="Calculate"
                                v-on:click="calculate_price"
                              />
                            </div>
                          </SplitterPanel>
                        </Splitter>
                      </Fieldset>
                    </div>
                  </div>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </template>
          <template #footer>
            <div class="flex flex-row-reverse p-6">
              <Button
                class="p-button-success p-button-rounded p-button-raised button-sm m-2"
                label="Save"
                type="submit"
              />
              <Button
                class="p-button-secondary p-button-rounded p-button-raised button-sm m-2"
                label="Cancel"
                v-on:click="back"
              />
            </div>
          </template>
        </Card>
      </Form>
      <ConfirmDialog group="confirm_changes"></ConfirmDialog>
      <ConfirmDialog group="keep_editing"></ConfirmDialog>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { storeCore } from '@/store/index'
import {
  storeMasterItem,
  storeMasterItemUnit,
  storeMasterItemCategory,
  storeMasterItemBrand,
} from '../store'
import { mapStores, mapActions } from 'pinia'
import { valibotResolver } from '@primevue/forms/resolvers/valibot'
import * as valibot from 'valibot'
import type { CoreResponse } from '@/interfaces/api'
import NumberLabel from '@/components/Number.vue'
// import type { CoreResponse } from '@/interfaces/api'

export default defineComponent({
  name: 'MasterItemEdit',
  components: { NumberLabel },
  data() {
    return {
      benefit_type: [
        { code: 'n', name: 'None' },
        { code: 'p', name: 'Percentage' },
        { code: 'v', name: 'Value' },
      ],
      simulator: {
        basic_price: 10000,
        sell_price: 0,
      },
      initialValues: {
        code: '',
        name: '',
        alias: '',
        remark: '',
        category: [],
        unit: [],
        brand: {
          id: '',
          code: '',
          name: '',
        },
        configuration: {
          allow_grn: false,
          allow_incoming: false,
          allow_outgoing: false,
          allow_destruction: false,
          benefit_margin_type: { code: 'n', name: 'None' },
          benefit_margin_value: 0,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      ui: {
        category: {
          loading: false,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          item: [] as any,
        },
        unit: {
          loading: false,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          item: [] as any,
        },
        brand: {
          loading: false,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          item: [] as any,
        },
        benefit_type: {
          loading: false,
          item: [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ] as any,
        },
      },
      resolver: valibotResolver(
        valibot.object({
          //
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any,
      codeResolver: valibotResolver(
        valibot.pipe(valibot.string(), valibot.minLength(1, 'Code is required.')),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any,
      nameResolver: valibotResolver(
        valibot.pipe(valibot.string(), valibot.minLength(1, 'Name is required')),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any,
      benefitValueResolver: valibotResolver(
        valibot.pipe(
          valibot.number('Benefit value must be number'),
          valibot.minValue(0, 'Minimum value is 0'),
        ),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any,
      id: '',
      v: 0,
    }
  },
  validations() {},
  mounted() {
    this.detail(this.$route.params.id.toString())
    this.id = this.$route.params.id.toString()
    this.ui.benefit_type.item = this.benefit_type
  },
  computed: {
    ...mapStores(storeMasterItem),
    ...mapStores(storeMasterItemUnit),
    ...mapStores(storeMasterItemBrand),
    ...mapStores(storeMasterItemCategory),
  },
  methods: {
    ...mapActions(storeCore, ['allowDispatch', 'UIToggleEditingData']),
    back() {
      this.$router.push({
        path: `/master/item`,
      })
    },
    calculate_price() {
      if (this.initialValues.configuration.benefit_margin_type.code === 'n') {
        this.simulator.sell_price = this.simulator.basic_price
      } else if (this.initialValues.configuration.benefit_margin_type.code === 'p') {
        this.simulator.sell_price =
          this.simulator.basic_price +
          (this.initialValues.configuration.benefit_margin_value * this.simulator.basic_price) / 100
      } else {
        this.simulator.sell_price =
          this.simulator.basic_price + this.initialValues.configuration.benefit_margin_value
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async filterCategory(event: any) {
      const filterValue = event.value
      this.ui.category.loading = true
      await this.masterItemCategoryStore
        .list({
          first: 0,
          rows: 10,
          projection: { _id: 0, id: 1, code: 1, name: 1 },
          sortField: 'name',
          sortOrder: 1,
          filters: { name: { value: filterValue, matchMode: 'contains' } },
        })
        .then((response: CoreResponse) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data: any = response.payload.data
          const mergedArray = [...this.initialValues.category, ...data]
          this.ui.category.item = [...new Map(mergedArray.map((item) => [item.id, item])).values()]
          this.ui.category.loading = false
        })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async filterUnit(event: any) {
      const filterValue = event.value
      this.ui.unit.loading = true
      await this.masterItemUnitStore
        .list({
          first: 0,
          rows: 10,
          projection: { _id: 0, id: 1, code: 1, name: 1 },
          sortField: 'name',
          sortOrder: 1,
          filters: { name: { value: filterValue, matchMode: 'contains' } },
        })
        .then((response: CoreResponse) => {
          const data = response.payload.data
          this.ui.unit.item = data
          this.ui.unit.loading = false
        })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async filterBrand(event: any) {
      const filterValue = event.value
      this.ui.brand.loading = true
      await this.masterItemBrandStore
        .list({
          first: 0,
          rows: 10,
          projection: { _id: 0, id: 1, code: 1, name: 1 },
          sortField: 'name',
          sortOrder: 1,
          filters: { name: { value: filterValue, matchMode: 'contains' } },
        })
        .then((response: CoreResponse) => {
          const data = response.payload.data
          this.ui.brand.item = data
          this.ui.brand.loading = false
        })
    },
    async detail(id: string) {
      await this.masterItemStore.detail(id).then((response: CoreResponse) => {
        const data = response.payload
        this.initialValues.code = data.code
        this.initialValues.name = data.name
        this.initialValues.alias = data.alias
        this.initialValues.remark = data.remark
        this.initialValues.category.push(...data.category)
        this.initialValues.category = [
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...new Map(this.initialValues.category.map((item: any) => [item.id, item])).values(),
        ]
        this.ui.category.item.push(...data.category)

        const unit = [data.unit]
        this.initialValues.unit.push(...unit)
        this.initialValues.unit = [
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...new Map(this.initialValues.unit.map((item: any) => [item.id, item])).values(),
        ]
        this.ui.unit.item.push(...unit)
        if (data.brand) this.initialValues.brand = data.brand
        this.initialValues.configuration = data.configuration
        this.initialValues.configuration.benefit_margin_type = this.benefit_type.filter(
          (item) => item.code === data.configuration.benefit_margin_type,
        )[0]
        this.v = data.__v

        this.calculate_price()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const refs: any = this.$refs.form
        refs.setValues({
          code: data.code,
          name: data.name,
        })
      })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async submit(event: any) {
      console.clear()
      console.log(JSON.stringify(this.initialValues, null, 2))
      if (event.valid) {
        const confirmation = this.$confirm
        confirmation.require({
          group: 'confirm_changes',
          target: event.originalEvent.submitter,
          header: 'Confirmation',
          message: `Update data?`,
          icon: 'pi pi-exclamation-triangle',
          acceptClass: 'p-button-warning',
          rejectClass: 'p-button-secondary',
          acceptIcon: 'pi pi-check-circle',
          acceptLabel: 'Yes',
          rejectLabel: 'Abort',
          rejectIcon: 'pi pi-times-circle',
          accept: async () => {
            this.initialValues.configuration.benefit_margin_type =
              this.initialValues.configuration.benefit_margin_type.code
            await this.masterItemStore
              .edit(this.id.toString(), { ...this.initialValues, __v: this.v })
              .then(async (response) => {
                this.$confirm.require({
                  group: 'keep_editing',
                  message: `${response.message}. Back to data list?`,
                  header: 'Keep editting?',
                  icon: 'pi pi-exclamation-triangle',
                  acceptClass: 'p-button-success',
                  rejectClass: 'p-button-secondary',
                  acceptLabel: 'Yes',
                  acceptIcon: 'pi pi-check-circle',
                  rejectLabel: 'Keep Editing',
                  rejectIcon: 'pi pi-times-circle',
                  accept: () => {
                    this.$router.push('/master/item')
                  },
                  reject: async () => {
                    await this.detail(this.id)
                  },
                })
              })
          },
        })
      }
    },
  },
})
</script>
