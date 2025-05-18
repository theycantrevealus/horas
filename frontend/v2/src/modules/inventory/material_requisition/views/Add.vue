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
                <p class="font-bold text-2xl w-10">Create Material Requisition</p>
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
                <Editor v-model="initialValues.remark" class="w-full" editorStyle="height: 120px" />
              </div>
            </Fieldset>
            <Fieldset legend="Detail" class="m-3">
              <div class="flex flex-row-reverse">
                <Button
                  class="p-button-secondary p-button-rounded p-button-raised button-sm m-2"
                  label="Add Item"
                  v-on:click="autorow"
                />
              </div>
              <DataTable
                v-model:editingRows="ui.items.editing"
                editMode="row"
                :value="initialValues.detail"
                tableStyle="min-width: 50rem"
                @row-edit-save="onRowEditSave"
              >
                <template #empty> No detail item. Please add item </template>
                <Column field="id" header="ID" class="wrap_content">
                  <template #body="slotProps">
                    <h6 class="d-inline-flex">#{{ slotProps.data.id }}</h6>
                  </template>
                </Column>
                <Column field="item" header="Item" class="w-4">
                  <template #body="slotProps">
                    <div class="flex overflow-hidden" v-if="slotProps.data.item.id !== ''">
                      <div class="flex-none flex">
                        <Tag severity="info" :value="slotProps.data.item.code"></Tag>
                      </div>
                      <div class="flex-grow-1 flex mx-3 align-items-center">
                        <small>{{ slotProps.data.item.name }}</small>
                      </div>
                    </div>
                  </template>
                  <template #editor="{ data, field }">
                    <Select
                      v-model="data[field]"
                      :options="ui.items.data"
                      filter
                      optionLabel="name"
                      placeholder="Select an item"
                      class="w-full md:w-56"
                      size="small"
                      @filter="filterItem"
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
                <Column field="qty" header="Qty" class="w-1">
                  <template #body="slotProps">
                    {{ slotProps.data.qty }}
                  </template>
                  <template #editor="{ data, field }">
                    <InputNumber
                      class="w-12"
                      v-model="data[field]"
                      inputId="minmaxfraction"
                      :minFractionDigits="2"
                      :maxFractionDigits="5"
                      fluid
                    />
                  </template>
                </Column>
                <Column field="unit" header="Unit" class="w-2">
                  <template #body="slotProps">
                    {{ slotProps.data.unit.name }}
                  </template>
                  <template #editor="{ data, field }">
                    <Select
                      v-model="data[field]"
                      :options="data['item'].unit"
                      filter
                      optionLabel="name"
                      placeholder="Select item unit"
                      class="w-full md:w-56"
                      size="small"
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
                    {{ slotProps.data.remark }}
                  </template>
                  <template #editor="{ data, field }">
                    <InputText type="text" v-model="data[field]" class="w-full" />
                  </template>
                </Column>
                <Column
                  :rowEditor="true"
                  style="width: 10%; min-width: 8rem"
                  class="wrap_content"
                  bodyStyle="text-align:center"
                ></Column>
                <Column field="qty" header="" class="wrap-content">
                  <template #body="slotProps">
                    <Button
                      class="p-button p-component p-button-icon-only p-button-secondary p-button-rounded p-button-text p-datatable-row-editor-cancel custom-edit-row-button"
                      icon="pi pi-trash"
                      v-on:click="removeRow(slotProps.data.id)"
                    />
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
      ava: [],
      ui: {
        stock_point: [],
        items: {
          loading: false,
          data: [],
          editing: [],
        },
      },
      initialValues: {
        code: '',
        stock_point: {
          id: '',
          code: '',
          name: '',
        },
        remark: '-',
        transaction_date: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        detail: [] as any[],
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
  mounted() {
    const { stock_point } = this.getAccount
    this.ui.stock_point = stock_point
    this.initialValues.stock_point = stock_point[0]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refs: any = this.$refs.form
    refs.setValues({
      stock_point: stock_point[0],
    })
  },
  methods: {
    async autorow() {
      this.initialValues.detail.push({
        id: this.initialValues.detail.length + 1,
        item: {
          id: '',
          code: '',
          name: '',
          unit: [],
        },
        qty: 0,
        unit: {
          id: '',
          code: '',
          name: '',
        },
        remark: '',
      })
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
    async onRowEditSave(event: any) {
      const data = event.newData

      this.ui.items.data = []

      this.initialValues.detail[event.index] = data
    },
    async removeRow(id: number) {
      this.initialValues.detail.splice(id - 1, 1)
      this.reOrderRow()
    },
    async reOrderRow() {
      for (const a in this.initialValues.detail) {
        this.initialValues.detail[a].id = parseInt(a) + 1
      }
    },
    back() {
      this.$router.push({
        path: `/inventory/material_requisition`,
      })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async submit(event: any) {
      if (this.ui.items.editing.length > 0) {
        this.coreStore.setToast({
          severity: 'warn',
          summary: 'Forbidden Method',
          detail: 'Please confirm all editing item first',
          life: 5000,
        })
        return
      }

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
              .map(({ id, ...detail }) => detail)
              .filter((detail) => detail.item.id !== '' && detail.unit.id !== '' && detail.qty > 0)
            await this.inventoryMaterialRequisitionStore
              .add({ ...this.initialValues, detail: detail, extras: '' })
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
