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
                <p class="font-bold text-2xl w-10">Create Purchase Requisition</p>
                <p class="text-blue-600">Doc Ver. {{ v }}</p>
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
            <BlockUI :blocked="ui.blocked">
              <Fieldset legend="Material Requisition" class="m-3 gap-2">
                <div class="card flex flex-wrap justify-center items-end gap-3 my-3">
                  <FormField
                    v-slot="$field"
                    :initialValue="material_requisition.transaction_date"
                    name="transaction_date"
                    class="flex flex-col"
                  >
                    <FloatLabel variant="on">
                      <DatePicker
                        :disabled="true"
                        name="transaction_date"
                        id="transaction_date"
                        v-model="material_requisition.transaction_date"
                        iconDisplay="input"
                        inputId="transaction_date"
                        dateFormat="yy/mm/dd"
                        class="custom-disabled"
                        showButtonBar
                      />
                      <label for="transaction_date">Transaction Date</label>
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
                    :initialValue="material_requisition.code"
                    name="mr_code"
                    class="flex flex-col gap-1"
                  >
                    <FloatLabel variant="on">
                      <InputText
                        id="mr_code"
                        class="w-full md:w-56 w-18rem custom-disabled"
                        :disabled="true"
                        v-model="material_requisition.code"
                        autocomplete="off"
                      />
                      <label for="mr_code">Material Requisition Code</label>
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
                    :initialValue="material_requisition.stock_point"
                    name="stock_point"
                    class="flex flex-col gap-1"
                  >
                    <FloatLabel variant="on">
                      <Select
                        name="stock_point"
                        size="small"
                        v-model="material_requisition.stock_point"
                        :options="ui.stock_point"
                        :disabled="true"
                        filter
                        placeholder="Select a stock point"
                        class="md:w-56 w-20rem custom-disabled"
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
                    :initialValue="`${material_requisition.created_by.first_name} ${material_requisition.created_by.last_name}`"
                    class="flex flex-col gap-1"
                  >
                    <FloatLabel variant="on">
                      <InputText
                        name="mr_created_by"
                        type="text"
                        v-model="getMaterialRequisitionFullName"
                        class="custom-disabled"
                        :disabled="true"
                      />
                      <label for="mr_created_by">Created By</label>
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
                <div class="card gap-3 my-3">
                  <h5>Remark:</h5>
                  <p v-html="material_requisition.remark"></p>
                </div>
              </Fieldset>
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
                      <label for="code">Purchase Requisition Code</label>
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
                    <Message
                      v-if="$field?.invalid"
                      severity="error"
                      size="small"
                      variant="simple"
                      >{{ $field.error?.message }}</Message
                    >
                  </FormField>
                </div>
              </Fieldset>
              <Fieldset legend="Detail" class="m-3">
                <div class="flex flex-row-reverse">
                  <Button
                    class="p-button-secondary p-button-rounded p-button-raised button-sm m-2"
                    label="Reset Item"
                    v-on:click="reset"
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
                      <div class="flex overflow-hidden" v-if="data[field].id !== ''">
                        <div class="flex-none flex">
                          <Tag severity="info" :value="data[field].code"></Tag>
                        </div>
                        <div class="flex-grow-1 flex mx-3 align-items-center">
                          <small>{{ data[field].name }}</small>
                        </div>
                      </div>
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
                      {{ data[field].name }}
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
            </BlockUI>
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
// import { FilterMatchMode, FilterOperator } from '@primevue/core/api'
import * as valibot from 'valibot'
import { valibotResolver } from '@primevue/forms/resolvers/valibot'
import { storeCore } from '@/store/index'
import { storeInventoryMaterialRequisition } from '@/modules/inventory/material_requisition/store'
import { storeProcurementPurchaseRequisition } from '../store'
import { storeMasterItem } from '@/modules/master/item/store'
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'
import type { CoreResponse } from '@/interfaces/api'

export default defineComponent({
  name: 'PurchaseRequisitionEdit',
  data() {
    return {
      ui: {
        stock_point: [],
        blocked: true,
        items: {
          loading: false,
          data: [],
          editing: [],
        },
      },
      id: '',
      material_requisition: {
        id: '',
        code: '',
        stock_point: {
          id: '',
          code: '',
          name: '',
        },
        remark: '',
        transaction_date: new Date(),
        created_by: {
          id: '',
          email: '',
          first_name: '',
          last_name: '',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        detail: [] as any[],
      },
      initialValues: {
        code: '',
        remark: '',
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
      v: 0,
    }
  },
  computed: {
    ...mapStores(storeMasterItem),
    ...mapStores(storeInventoryMaterialRequisition),
    ...mapStores(storeProcurementPurchaseRequisition),
    ...mapStores(storeCore),
    getAccount() {
      return this.coreStore.getAccount
    },
    getMaterialRequisitionFullName() {
      return `${this.material_requisition.created_by.first_name} ${this.material_requisition.created_by.last_name}`
    },
  },
  async mounted() {
    const path = this.$route.path
    this.id = path.split('/').pop()?.toString() || ''
    this.material_requisition.id = this.$route.params.id.toString().trim()
    await this.MRLoad(this.$route.params.id.toString().trim())
  },
  methods: {
    async MRLoad(id: string) {
      await this.inventoryMaterialRequisitionStore.detail(id).then((response: CoreResponse) => {
        const data = response.payload

        this.material_requisition.code = data.code
        this.material_requisition.transaction_date = data.transaction_date
        this.material_requisition.remark = data.remark
        this.material_requisition.stock_point = data.stock_point
        this.material_requisition.detail = data.detail
        this.material_requisition.created_by = data.created_by

        this.initialValues.detail = data.detail

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const refs: any = this.$refs.form
        refs.setValues({
          code: data.code,
          remark: data.remark,
        })

        this.ui.blocked = false
      })
    },
    async reset() {
      await this.MRLoad(this.id)
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
          message: `Submit purchase requisition?`,
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
            await this.procurementPurchaseRequisitionStore
              .add({
                ...this.initialValues,
                material_requisition: this.material_requisition.id,
                detail: detail,
                extras: '',
              })
              .then(async () => {
                this.$router.push({
                  path: `/procurement/purchase_requisition`,
                })
              })
          },
        })
      }
    },
  },
})
</script>
