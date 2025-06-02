<template>
  <Card>
    <template #content>
      <BlockUI :blocked="ui.blocked">
        <Fieldset legend="Material Requisition" class="m-3 gap-2">
          <div class="card flex flex-wrap justify-center items-end gap-3 my-3">
            <FormField
              v-slot="$field"
              :initialValue="data.material_requisition.transaction_date"
              name="transaction_date"
              class="flex flex-col"
            >
              <FloatLabel variant="on">
                <DatePicker
                  :disabled="true"
                  name="transaction_date"
                  id="transaction_date"
                  v-model="data.material_requisition.transaction_date"
                  iconDisplay="input"
                  inputId="transaction_date"
                  dateFormat="yy/mm/dd"
                  class="custom-disabled"
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
              :initialValue="data.material_requisition.code"
              name="mr_code"
              class="flex flex-col gap-1"
            >
              <FloatLabel variant="on">
                <InputText
                  id="mr_code"
                  class="w-full md:w-56 w-18rem custom-disabled"
                  :disabled="true"
                  v-model="data.material_requisition.code"
                  autocomplete="off"
                />
                <label for="mr_code">Material Requisition Code</label>
              </FloatLabel>
              <Message v-if="$field?.invalid" severity="error" size="small" variant="simple">{{
                $field.error?.message
              }}</Message>
            </FormField>
            <FormField
              v-slot="$field"
              :initialValue="data.material_requisition.stock_point"
              name="stock_point"
              class="flex flex-col gap-1"
            >
              <FloatLabel variant="on">
                <Select
                  name="stock_point"
                  size="small"
                  v-model="data.material_requisition.stock_point"
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
              <Message v-if="$field?.invalid" severity="error" size="small" variant="simple">{{
                $field.error?.message
              }}</Message>
            </FormField>
            <FormField
              v-slot="$field"
              :initialValue="`${data.material_requisition.created_by.first_name} ${data.material_requisition.created_by.last_name}`"
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
              <Message v-if="$field?.invalid" severity="error" size="small" variant="simple">{{
                $field.error?.message
              }}</Message>
            </FormField>
          </div>
          <div class="card gap-3 my-3">
            <h5>Remark:</h5>
            <p v-html="data.material_requisition.remark"></p>
          </div>
        </Fieldset>
        <Fieldset legend="Basic Data" class="m-3 gap-2">
          <div class="card flex flex-wrap justify-center items-end gap-3 my-3">
            <FormField
              v-slot="$field"
              :initialValue="data.transaction_date"
              name="transaction_date"
              class="flex flex-col"
            >
              <FloatLabel variant="on">
                <DatePicker
                  :disabled="true"
                  class="custom-disabled"
                  name="transaction_date"
                  id="transaction_date"
                  v-model="data.transaction_date"
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
              :initialValue="data.code"
              name="code"
              class="flex flex-col gap-1"
            >
              <FloatLabel variant="on">
                <InputText
                  :disabled="true"
                  id="code"
                  class="w-full md:w-56 w-18rem custom-disabled"
                  v-model="data.code"
                  autocomplete="off"
                />
                <label for="code">Purchase Requisition Code</label>
              </FloatLabel>
              <Message v-if="$field?.invalid" severity="error" size="small" variant="simple">{{
                $field.error?.message
              }}</Message>
            </FormField>
          </div>
          <div class="card gap-3 my-3">
            <h5>Remark:</h5>
            <p v-html="data.remark"></p>
          </div>
        </Fieldset>
        <Fieldset legend="Detail" class="m-3">
          <div class="flex flex-row-reverse"></div>
          <DataTable editMode="row" :value="data.detail" tableStyle="min-width: 50rem">
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
          </DataTable>
        </Fieldset>
      </BlockUI>
    </template>
    <template #footer>
      <div class="flex flex-row-reverse">
        <Button
          id="userFormSubmit"
          label="Close"
          icon="pi pi-close"
          class="p-button-secondary p-button-rounded p-button-raised button-sm m-2"
          @click="closeDialog"
        />
      </div>
    </template>
  </Card>
</template>
<script lang="ts">
import { storeCore } from '@/store/index.ts'
import { mapActions, mapStores } from 'pinia'
import { storeInventoryMaterialRequisition } from '@/modules/inventory/material_requisition/store'
import { defineComponent } from 'vue'
import type { CoreResponse } from '@/interfaces/api'
import { storeProcurementPurchaseRequisition } from '../store'
export default defineComponent({
  name: 'PurchaseRequisitionDetail',
  data() {
    return {
      ui: {
        blocked: true,
        stock_point: [],
      },
      data: {
        material_requisition: {
          code: '',
          transaction_date: new Date(),
          stock_point: {},
          created_by: {
            first_name: '',
            last_name: '',
          },
          remark: '',
        },
        code: '',
        transaction_date: new Date(),
        stock_point: {},
        remark: '',
        detail: [],
        created_by: {
          first_name: '',
          last_name: '',
        },
      },
    }
  },
  inject: {
    dialogRef: {
      from: 'dialogRef',
      default: () => ({ data: { id: '' } }),
    },
  },
  computed: {
    ...mapStores(storeInventoryMaterialRequisition),
    ...mapStores(storeProcurementPurchaseRequisition),
    getMaterialRequisitionFullName() {
      return `${this.data.material_requisition.created_by.first_name} ${this.data.material_requisition.created_by.last_name}`
    },
    getPurhcaseRequisitionFullName() {
      return `${this.data.created_by.first_name} ${this.data.created_by.last_name}`
    },
  },
  async mounted() {
    this.UIToggleEditingData(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dialogRef: any = this.dialogRef
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataRef: any = dialogRef?.data
    await this.procurementPurchaseRequisitionStore
      .detail(dataRef.id.toString())
      .then(async (response: CoreResponse) => {
        const data = response.payload
        this.data.material_requisition.code = data.material_requisition.code
        this.data.material_requisition.transaction_date = data.material_requisition.transaction_date
        // this.data.material_requisition.stock_point = data.material_requisition.stock_point
        this.data.material_requisition.created_by.first_name =
          data.material_requisition.created_by.first_name
        this.data.material_requisition.created_by.last_name =
          data.material_requisition.created_by.last_name
        this.data.material_requisition.remark = data.material_requisition.remark ?? '-'

        await this.inventoryMaterialRequisitionStore
          .detail(data.material_requisition.id)
          .then((MRResponse: CoreResponse) => {
            const MRData = MRResponse.payload

            this.data.material_requisition.stock_point = MRData.stock_point
          })

        this.data.code = data.code
        this.data.detail = data.detail
        this.data.remark = data.remark ?? '-'

        this.data.created_by = data.created_by
        this.ui.blocked = false
      })
    // await this.inventoryMaterialRequisitionStore
    //   .detail(dataRef.id.toString())
    //   .then((response: CoreResponse) => {
    //     const data = response.payload
    //     this.data.code = data.code
    //     this.data.transaction_date = data.transaction_date
    //     this.data.remark = data.remark
    //     this.data.stock_point = data.stock_point
    //     this.data.detail = data.detail
    //     this.data.created_by = data.created_by

    //     this.ui.blocked = false
    //   })
  },
  methods: {
    ...mapActions(storeCore, ['allowDispatch', 'UIToggleEditingData']),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    closeDialog(e: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dialogRef: any = this.dialogRef
      this.UIToggleEditingData(false)
      dialogRef?.close({
        ...dialogRef?.data,
        response: e,
      })
    },
  },
})
</script>
