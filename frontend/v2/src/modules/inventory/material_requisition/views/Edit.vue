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
                <p class="font-bold text-2xl w-10">Edit Material Requisition</p>
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
            <Fieldset legend="Basic Data" class="m-3 gap-2">
              <div class="card flex flex-wrap justify-center items-end gap-3 my-3">
                <FormField
                  v-slot="$field"
                  :initialValue="initialValues.transaction_date"
                  name="transaction_date"
                  class="flex flex-col"
                >
                  <FloatLabel variant="on">
                    <DatePicker
                      name="transaction_date"
                      id="transaction_date"
                      v-model="initialValues.transaction_date"
                      iconDisplay="input"
                      inputId="transaction_date"
                      dateFormat="yy/mm/dd"
                      showButtonBar
                    />
                    <label for="transaction_date">Transaction Date</label>
                  </FloatLabel>
                  <Message v-if="$field?.invalid" severity="error" size="small" variant="simple">{{
                    $field.error?.message
                  }}</Message>
                </FormField>
                <FormField
                  v-slot="$field"
                  :initialValue="initialValues.code"
                  name="code"
                  :resolver="codeResolver"
                  class="flex flex-col gap-1"
                >
                  <FloatLabel variant="on">
                    <InputText
                      id="code"
                      class="w-full md:w-56 w-18rem"
                      v-model="initialValues.code"
                      autocomplete="off"
                    />
                    <label for="code">Material Requisition Code</label>
                  </FloatLabel>
                  <Message v-if="$field?.invalid" severity="error" size="small" variant="simple">{{
                    $field.error?.message
                  }}</Message>
                </FormField>
                <FormField
                  v-slot="$field"
                  :initialValue="initialValues.stock_point"
                  name="stock_point"
                  class="flex flex-col gap-1"
                  :resolver="stockPointResolver"
                >
                  <FloatLabel variant="on">
                    <Select
                      name="stock_point"
                      size="small"
                      v-model="initialValues.stock_point"
                      :options="ui.stock_point"
                      filter
                      placeholder="Select a stock point"
                      class="md:w-56 w-20rem"
                    >
                      <template #value="slotProps">
                        <div v-if="slotProps.value.id" class="flex items-center">
                          <div class="flex items-center">
                            <Tag severity="info" :value="slotProps.value.code" />&nbsp;{{
                              slotProps.value.name
                            }}
                          </div>
                        </div>
                        <span v-else>
                          <div class="flex items-center">&nbsp;</div>
                        </span>
                      </template>
                      <template #option="slotProps">
                        <div class="flex items-center">
                          <Tag severity="info" :value="slotProps.option.code" />&nbsp;{{
                            slotProps.option.name
                          }}
                        </div>
                      </template>
                    </Select>
                    <label for="stock_point">Stock Point</label>
                  </FloatLabel>
                  <Message v-if="$field?.invalid" severity="error" size="small" variant="simple">{{
                    $field.error?.message
                  }}</Message>
                </FormField>
              </div>
              <div class="card flex flex-wrap justify-center items-end gap-3 my-3">
                <FormField
                  v-slot="$field"
                  :initialValue="initialValues.remark"
                  name="remark"
                  class="flex flex-col gap-1 w-full"
                >
                  <FloatLabel variant="on">
                    <Editor
                      id="remark"
                      name="remark"
                      v-model="initialValues.remark"
                      class="w-full"
                      editorStyle="height: 120px"
                    >
                      <template v-slot:toolbar>
                        <span class="ql-formats">
                          <button v-tooltip.bottom="'Bold'" class="ql-bold"></button>
                          <button v-tooltip.bottom="'Italic'" class="ql-italic"></button>
                          <button v-tooltip.bottom="'Underline'" class="ql-underline"></button>
                        </span> </template
                    ></Editor>
                  </FloatLabel>
                  <Message v-if="$field?.invalid" severity="error" size="small" variant="simple">{{
                    $field.error?.message
                  }}</Message>
                </FormField>
              </div>
            </Fieldset>
            <Fieldset legend="Detail" class="m-3">
              <DataTable :value="initialValues.detail" tableStyle="min-width: 50rem">
                <Column field="id" header="ID" class="wrap_content">
                  <template #body="slotProps">
                    <h6 class="d-inline-flex">#{{ slotProps.data.id }}</h6>
                  </template>
                </Column>
                <Column field="name" header="Item" class="w-5">
                  <template #body="slotProps">
                    <Select
                      v-model="slotProps.data.item"
                      :options="ui.items.data"
                      filter
                      optionLabel="name"
                      placeholder="Select an item"
                      class="w-full md:w-56"
                      size="small"
                      @filter="filterItem"
                      @change="setItem($event, slotProps.data.id)"
                    >
                      <template #value="slotProps">
                        <div v-if="slotProps.value" class="flex items-center">
                          <div v-if="slotProps.value.code">
                            <div class="flex overflow-hidden">
                              <div class="flex-shrink-0 flex min-w-max">
                                <Tag severity="info" :value="slotProps.value.code"></Tag>
                              </div>
                              <div
                                class="flex-grow-1 flex-shrink-1 flex mx-3 align-items-center justify-content-center"
                              >
                                <small>{{ slotProps.value.name }}</small>
                              </div>
                            </div>
                          </div>
                          <div v-else>
                            {{ slotProps.placeholder }}
                          </div>
                        </div>
                        <span v-else>
                          {{ slotProps.placeholder }}
                        </span>
                      </template>
                      <template #option="slotProps">
                        <div class="flex overflow-hidden">
                          <div class="flex-shrink-0 flex min-w-max">
                            <Tag severity="info" :value="slotProps.option.code"></Tag>
                          </div>
                          <div
                            class="flex-grow-1 flex-shrink-1 flex mx-3 align-items-center justify-content-center"
                          >
                            <small>{{ slotProps.option.name }}</small>
                          </div>
                        </div>
                      </template>
                    </Select>
                  </template>
                </Column>
                <Column field="qty" header="Qty" class="w-2">
                  <template #body="slotProps">
                    <InputNumber
                      class="w-12"
                      v-model="slotProps.data.qty"
                      inputId="minmaxfraction"
                      :minFractionDigits="2"
                      :maxFractionDigits="5"
                      @keyup.enter="autorow"
                      fluid
                    />
                  </template>
                </Column>
                <Column field="unit" header="Unit" class="w-2">
                  <template #body="slotProps">
                    <Select
                      v-model="slotProps.data.unit"
                      :options="slotProps.data.unit_avail"
                      filter
                      optionLabel="name"
                      placeholder="Select item unit"
                      class="w-full md:w-56"
                      size="small"
                      @change="autorow"
                    >
                      <template #value="slotProps">
                        <div v-if="slotProps.value" class="flex items-center">
                          <div v-if="slotProps.value.code">
                            <div class="flex overflow-hidden">
                              <div class="flex-shrink-0 flex min-w-max">
                                <Tag severity="info" :value="slotProps.value.code"></Tag>
                              </div>
                              <div
                                class="flex-grow-1 flex-shrink-1 flex mx-3 align-items-center justify-content-center"
                              >
                                <small>{{ slotProps.value.name }}</small>
                              </div>
                            </div>
                          </div>
                          <div v-else>
                            {{ slotProps.placeholder }}
                          </div>
                        </div>
                        <span v-else>
                          {{ slotProps.placeholder }}
                        </span>
                      </template>
                      <template #option="slotProps">
                        <div class="flex overflow-hidden">
                          <div class="flex-shrink-0 flex min-w-max">
                            <Tag severity="info" :value="slotProps.option.code"></Tag>
                          </div>
                          <div
                            class="flex-grow-1 flex-shrink-1 flex mx-3 align-items-center justify-content-center"
                          >
                            <small>{{ slotProps.option.name }}</small>
                          </div>
                        </div>
                      </template></Select
                    >
                  </template>
                </Column>
                <Column field="remark" header="Remark">
                  <template #body="slotProps">
                    <InputText type="text" v-model="slotProps.data.remark" class="w-full" />
                  </template>
                </Column>
              </DataTable>
            </Fieldset>
          </template>
          <template #footer>
            <div class="flex flex-row-reverse p-6">
              <Button
                class="p-button-success p-button-rounded p-button-raised button-sm m-2"
                label="Submit"
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
    </div>
  </div>
</template>
<script lang="ts">
import { FilterMatchMode, FilterOperator } from '@primevue/core/api'
import * as valibot from 'valibot'
import { valibotResolver } from '@primevue/forms/resolvers/valibot'
import { storeCore } from '@/store/index'
import { storeInventoryMaterialRequisition } from '@/modules/inventory/material_requisition/store'
import { storeMasterItem } from '@/modules/master/item/store'
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'
import type { CoreResponse } from '@/interfaces/api'

export default defineComponent({
  name: 'MaterialRequisitionAdd',
  data() {
    return {
      ui: {
        stock_point: [],
        items: {
          loading: false,
          data: [],
        },
      },
      id: '',
      initialValues: {
        code: '',
        stock_point: {
          id: '',
          code: '',
          name: '',
        },
        remark: '',
        transaction_date: new Date(),
        detail: [
          {
            id: 1,
            item: {
              id: '',
              code: '',
              name: '',
            },
            qty: 0,
            unit: {
              id: '',
              code: '',
              name: '',
            },
            unit_avail: [],
            remark: '',
          },
        ],
      },
      resolver: valibotResolver(
        valibot.object({
          //
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any,
      codeResolver: valibotResolver(
        valibot.pipe(valibot.string(), valibot.minLength(8, 'Code is required with 8 characters.')),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any,
      stockPointResolver: valibotResolver(
        valibot.pipe(
          valibot.object(
            {
              id: valibot.pipe(valibot.string(), valibot.trim(), valibot.minLength(1)),
              code: valibot.pipe(valibot.string(), valibot.trim(), valibot.minLength(1)),
              name: valibot.pipe(valibot.string(), valibot.trim(), valibot.minLength(1)),
            },
            '',
          ),
        ),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any,
      v: 0,
    }
  },
  computed: {
    ...mapStores(storeMasterItem),
    ...mapStores(storeInventoryMaterialRequisition),
    ...mapStores(storeCore),
    getAccount() {
      return this.coreStore.getAccount
    },
  },
  async mounted() {
    const { stock_point } = this.getAccount
    this.ui.stock_point = stock_point
    this.id = this.$route.params.id.toString()
    await this.detail(this.$route.params.id.toString())
  },
  methods: {
    async detail(id: string) {
      await this.inventoryMaterialRequisitionStore.detail(id).then((response: CoreResponse) => {
        const data = response.payload

        console.clear()
        console.log(JSON.stringify(data, null, 2))

        this.initialValues.code = data.code
        this.initialValues.remark = data.remark
        this.initialValues.stock_point = data.stock_point
        this.initialValues.detail = data.detail

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const refs: any = this.$refs.form
        refs.setValues({
          code: data.code,
          stock_point: data.stock_point,
          remark: data.remark,
        })

        this.autorow()
      })
    },
    async autorow() {
      this.ui.items.data = []
      let allowAdd = true
      for await (const i of this.initialValues.detail) {
        if (!i.item || !i.unit || !i.qty) {
          allowAdd = false
          break
        }

        if (i.item.id === '' || i?.unit.id === '' || i.qty <= 0) {
          allowAdd = false
          break
        }
      }

      if (allowAdd) {
        this.initialValues.detail.push({
          id: this.initialValues.detail.length + 1,
          item: {
            id: '',
            code: '',
            name: '',
          },
          qty: 0,
          unit: {
            id: '',
            code: '',
            name: '',
          },
          unit_avail: [],
          remark: '',
        })
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async filterItem(event: any) {
      const filterValue = event.value
      this.ui.items.loading = false
      await this.masterItemStore
        .list({
          first: 0,
          rows: 10,
          projection: { _id: 0, id: 1, code: 1, name: 1, unit: 1 },
          sortField: 'name',
          sortOrder: 1,
          filters: {
            id: {
              operator: FilterOperator.AND,
              constraints: [
                {
                  value: this.initialValues.detail
                    .map((o) => o?.item.id)
                    .filter((id) => typeof id === 'string' && id.trim() !== ''),
                  matchMode: FilterMatchMode.NOT_CONTAINS,
                },
              ],
            },
            name: {
              operator: FilterOperator.AND,
              constraints: [{ value: filterValue, matchMode: FilterMatchMode.CONTAINS }],
            },
          },
        })
        .then((response: CoreResponse) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data: any = response.payload.data
          this.ui.items.data = data
          this.ui.items.loading = false
        })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async setItem(event: any, id: string) {
      this.initialValues.detail[parseInt(id) - 1].unit_avail = event.value.unit
      await this.autorow()
    },
    back() {
      this.$router.push({
        path: `/inventory/material_requisition`,
      })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async submit(event: any) {
      if (event.valid) {
        const confirmation = this.$confirm
        confirmation.require({
          group: 'confirm_changes',
          target: event.originalEvent.submitter,
          header: 'Confirmation',
          message: `Submit material requisition?`,
          acceptClass: 'p-button-warning',
          rejectClass: 'p-button-secondary',
          acceptIcon: 'pi pi-check-circle',
          acceptLabel: 'Yes',
          rejectLabel: 'Abort',
          rejectIcon: 'pi pi-times-circle',
          accept: async () => {
            const detail = this.initialValues.detail
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              .map(({ id, unit_avail, ...detail }) => detail)
              .filter((detail) => detail.item.id !== '' && detail.unit.id !== '' && detail.qty > 0)
            await this.inventoryMaterialRequisitionStore
              .edit(this.id, { ...this.initialValues, detail: detail, extras: '', __v: this.v })
              .then(async () => {
                this.back()
              })
          },
        })
      }
    },
  },
})
</script>
