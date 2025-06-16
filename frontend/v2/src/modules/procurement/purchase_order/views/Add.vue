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
                <p class="font-bold text-2xl w-10">Create Purchase Order</p>
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
              <Fieldset legend="Purchase Requisition" class="m-3 gap-2">
                <div class="card flex flex-wrap justify-center items-end gap-3 my-3">
                  <FormField
                    v-slot="$field"
                    :initialValue="purchase_requisition.transaction_date"
                    name="transaction_date"
                    class="flex flex-col"
                  >
                    <FloatLabel variant="on">
                      <DatePicker
                        :disabled="true"
                        name="transaction_date"
                        id="transaction_date"
                        v-model="purchase_requisition.transaction_date"
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
                    :initialValue="purchase_requisition.code"
                    name="mr_code"
                    class="flex flex-col gap-1"
                  >
                    <FloatLabel variant="on">
                      <InputText
                        id="mr_code"
                        class="w-full md:w-56 w-18rem custom-disabled"
                        :disabled="true"
                        v-model="purchase_requisition.code"
                        autocomplete="off"
                      />
                      <label for="mr_code">Purchase Requisition Code</label>
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
                    :initialValue="`${purchase_requisition.created_by.first_name} ${purchase_requisition.created_by.last_name}`"
                    class="flex flex-col gap-1"
                  >
                    <FloatLabel variant="on">
                      <InputText
                        name="mr_created_by"
                        type="text"
                        v-model="getPurchaseRequisitionFullName"
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
                  <p v-html="purchase_requisition.remark"></p>
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
                    :initialValue="initialValues.purchase_date"
                    name="purchase_date"
                    class="flex flex-col"
                  >
                    <FloatLabel variant="on">
                      <DatePicker
                        name="purchase_date"
                        id="purchase_date"
                        v-model="initialValues.purchase_date"
                        iconDisplay="input"
                        inputId="purchase_date"
                        dateFormat="yy/mm/dd"
                        showButtonBar
                      />
                      <label for="purchase_date">Purchase Date</label>
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
                    :initialValue="initialValues.supplier"
                    name="supplier"
                    class="flex flex-col gap-1"
                    :resolver="supplierResolver"
                  >
                    <FloatLabel variant="on">
                      <Select
                        name="supplier"
                        size="small"
                        v-model="initialValues.supplier"
                        :options="ui.supplier.data"
                        :loading="ui.supplier.loading"
                        lazy="true"
                        :filter-fields="['code', 'name']"
                        filter-match-mode="contains"
                        filter
                        @filter="loadSupplier($event)"
                        placeholder="Select a supplier"
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
                      <label for="supplier">Supplier</label>
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
                      <label for="code">Purchase Order Code</label>
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
              <div class="max-w-max">
                <div class="flex flex-row-reverse">
                  <Button
                    class="p-button-secondary p-button-rounded p-button-raised button-sm m-2"
                    label="Reset Item"
                    v-on:click="reset"
                  />
                  <ToggleButton
                    class="p-button-secondary p-button-rounded p-button-raised button-sm m-2"
                    v-model="ui.detail.lock.total"
                    onIcon="pi pi-lock"
                    offIcon="pi pi-lock-open"
                    onLabel="Total Lock"
                    offLabel="Total Unlock"
                  />
                </div>
                <DataTable
                  v-model:editingRows="ui.items.editing"
                  editMode="row"
                  stripedRows
                  removableSort
                  scrollable
                  scrollHeight="650px"
                  class="mt-6"
                  :value="initialValues.detail"
                  @row-edit-save="onRowEditSave"
                >
                  <template #empty> No detail item. Please add item </template>
                  <Column
                    field="id"
                    header="ID"
                    style="min-width: 100px"
                    class="wrap_content"
                    frozen
                  >
                    <template #body="slotProps">
                      <h6 class="d-inline-flex">#{{ slotProps.data.id }}</h6>
                    </template>
                  </Column>
                  <Column
                    field="item"
                    header="Item"
                    style="min-width: 400px"
                    frozen
                    class="shadow-right"
                  >
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
                  <Column field="qty" header="Qty" class="text-right" style="min-width: 200px">
                    <template #body="slotProps">
                      <NumberLabel
                        class="text-cyan-600"
                        lang="ID"
                        code="ID"
                        currency="IDR"
                        :number="slotProps.data.qty"
                        :decimal="2"
                      />
                    </template>
                    <template #editor="{ data, field }">
                      <InputNumber
                        class="w-12 text-right"
                        v-model="data[field]"
                        inputId="minmaxfraction"
                        :minFractionDigits="2"
                        :maxFractionDigits="5"
                        fluid
                      />
                    </template>
                  </Column>
                  <Column field="unit" header="Unit" style="min-width: 200px">
                    <template #body="slotProps">
                      {{ slotProps.data.unit.name }}
                    </template>
                    <template #editor="{ data, field }">
                      {{ data[field].name }}
                    </template>
                  </Column>
                  <Column
                    field="price"
                    header="Buy Price"
                    class="text-right wrap_content"
                    style="min-width: 300px"
                  >
                    <template #body="slotProps">
                      <NumberLabel
                        class="text-cyan-600"
                        lang="ID"
                        code="ID"
                        currency="IDR"
                        :number="slotProps.data.price"
                        :decimal="2"
                      />
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
                  <Column
                    field="discount_type"
                    header="Discount Type"
                    class="wrap_content"
                    style="min-width: 200px"
                  >
                    <template #body="slotProps">
                      {{ slotProps.data.discount_type.name }}
                    </template>
                    <template #editor="{ data, field }">
                      <Select
                        v-model="data[field]"
                        :options="ui.discount_type"
                        optionLabel="name"
                        placeholder="Select discount type"
                        class="w-full md:w-56"
                      />
                    </template>
                  </Column>
                  <Column
                    field="discount_value"
                    header="Discount Value"
                    class="text-right wrap_content"
                    style="min-width: 300px"
                  >
                    <template #body="slotProps">
                      <NumberLabel
                        class="text-cyan-600"
                        lang="ID"
                        code="ID"
                        currency="IDR"
                        :number="slotProps.data.discount_value"
                        :decimal="2"
                      />
                    </template>
                    <template #editor="{ data, field }">
                      <InputNumber
                        class="w-full"
                        v-model="data[field]"
                        inputId="minmaxfraction"
                        :minFractionDigits="2"
                        :maxFractionDigits="5"
                        fluid
                      />
                    </template>
                  </Column>
                  <Column field="remark" header="Remark" style="min-width: 300px">
                    <template #body="slotProps">
                      {{ slotProps.data.remark }}
                    </template>
                    <template #editor="{ data, field }">
                      <InputText type="text" v-model="data[field]" class="w-full" />
                    </template>
                  </Column>
                  <Column
                    field="total"
                    header="Total"
                    style="min-width: 300px"
                    class="shadow-left wrap_content"
                    alignFrozen="right"
                    :frozen="ui.detail.lock.total"
                  >
                    <template #body="{ data }">
                      <NumberLabel
                        class="text-cyan-600"
                        lang="ID"
                        code="ID"
                        currency="IDR"
                        :number="data.total ?? 0"
                        :decimal="2"
                      />
                    </template>
                  </Column>
                  <Column
                    :rowEditor="true"
                    style="width: 10%; min-width: 8rem"
                    class="wrap_content shadow-left"
                    frozen
                    alignFrozen="right"
                    bodyStyle="text-align:center"
                  ></Column>
                  <Column field="id" class="wrap-content" alignFrozen="right" frozen>
                    <template #body="slotProps">
                      <Button
                        class="p-button p-component p-button-icon-only p-button-secondary p-button-rounded p-button-text p-datatable-row-editor-cancel custom-edit-row-button"
                        icon="pi pi-trash"
                        v-on:click="removeRow(slotProps.data.id)"
                      />
                    </template>
                  </Column>
                  <!--ColumnGroup type="footer">
                    <Row>
                      <Column footer="Totals:" :colspan="6" footerStyle="text-align:right" />
                      <Column footer="Test:" footerStyle="text-align:right" />
                    </Row>
                  </ColumnGroup-->
                </DataTable>
              </div>
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
import { storeProcurementPurchaseRequisition } from '@/modules/procurement/purchase_requisition/store'
import { storeProcurementPurchaseOrder } from '../store'
import { storeMasterItem } from '@/modules/master/item/store'
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'
import type { CoreResponse } from '@/interfaces/api'
import { storeMasterSupplier } from '@/modules/master/supplier/store'
import NumberLabel from '@/components/Number.vue'

export default defineComponent({
  name: 'PurchaseRequisitionAdd',
  components: {
    NumberLabel,
  },
  data() {
    return {
      ui: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        selectedItem: null as any,
        supplier: {
          data: [],
          loading: true,
        },
        detail: {
          lock: {
            total: false,
          },
        },
        discount_type: [
          { name: 'None', code: 'n' },
          { name: 'Percentage', code: 'p' },
          { name: 'Value', code: 'v' },
        ],
        blocked: true,
        items: {
          loading: false,
          data: [],
          editing: [],
        },
      },
      id: '',
      purchase_requisition: {
        id: '',
        code: '',
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
        purchase_date: new Date(),
        purchase_requisition: '',
        supplier: {
          id: '',
          code: '',
          name: '',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        detail: [] as any[],
        discount_type: 'n' as 'n' | 'p' | 'v',
        discount_value: 0,
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
      supplierResolver: valibotResolver(
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
    ...mapStores(storeMasterSupplier),
    ...mapStores(storeMasterItem),
    ...mapStores(storeProcurementPurchaseRequisition),
    ...mapStores(storeProcurementPurchaseOrder),
    ...mapStores(storeCore),
    getAccount() {
      return this.coreStore.getAccount
    },
    getPurchaseRequisitionFullName() {
      return `${this.purchase_requisition.created_by.first_name} ${this.purchase_requisition.created_by.last_name}`
    },
  },
  async mounted() {
    // UI Manager
    this.ui.supplier.loading = false
    const path = this.$route.path
    this.id = path.split('/').pop()?.toString() || ''
    this.purchase_requisition.id = this.$route.params.id.toString().trim()
    await this.PRLoad(this.$route.params.id.toString().trim())
  },
  methods: {
    calculateTotal(type: string, value: number, price: number) {
      if (type === 'n') {
        return price
      } else if (type === 'p') {
        return price - (price * value) / 100
      } else if (type === 'v') {
        return price - value
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async loadSupplier(event: any) {
      const targetSearch = event.value ?? ''
      this.ui.supplier.loading = true
      this.ui.supplier.data = await this.masterSupplierStore
        .list({
          first: 0,
          rows: 10,
          projection: {},
          sortField: 'name',
          sortOrder: 1,
          filters: {
            code: {
              operator: 'OR',
              constraints: [{ value: targetSearch, matchMode: 'contains' }],
            },
            name: {
              operator: 'OR',
              constraints: [{ value: targetSearch, matchMode: 'contains' }],
            },
          },
        })
        .then((response) => {
          const data = response.payload.data
          this.ui.supplier.loading = false
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return data.map((item: any) => {
            return {
              id: item.id,
              code: item.code,
              name: item.name,
            }
          })
        })
    },
    async PRLoad(id: string) {
      await this.procurementPurchaseRequisitionStore.detail(id).then((response: CoreResponse) => {
        const data = response.payload

        this.purchase_requisition.code = data.code
        this.purchase_requisition.transaction_date = data.transaction_date
        this.purchase_requisition.remark = data.remark
        this.purchase_requisition.detail = data.detail
        this.purchase_requisition.created_by = data.created_by

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.initialValues.detail = data.detail.map((e: any) => {
          return {
            ...e,
            price: 0,
            discount_type: this.ui.discount_type.find((item) => item.code === 'n'),
            discount_value: 0,
            total: 0,
          }
        })

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
      await this.PRLoad(this.id)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async onRowEditSave(event: any) {
      const data = event.newData

      data.total = this.calculateTotal(
        data.discount_type.code,
        data.discount_value,
        data.qty * data.price,
      )

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
        path: `/procurement/purchase_requisition`,
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
            await this.procurementPurchaseOrderStore
              .add({
                ...this.initialValues,
                supplier: this.initialValues.supplier.id,
                purchase_requisition: this.purchase_requisition.id,
                discount_type: this.initialValues.discount_type,
                discount_value: this.initialValues.discount_value,
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
