<template>
  <div class="grid">
    <div class="col-12">
      <Card class="slim">
        <template #content>
          <Panel
            header="New General Receive Note"
            :toggleable="false"
          >
            <template #icons>
              <Button class="p-button-text p-button-info p-button-rounded p-button-raised button-sm"><span class="material-icons">help</span>
                Info</Button>
            </template>
            <TabView>
              <TabPanel header="Main Info">
                <div class="grid">
                  <div class="col-12 form-mode">
                    <div class="grid">
                      <div class="col-4">
                        <div class="flex flex-column gap-2">
                          <label for="code">Code</label>
                          <InputText
                            id="code"
                            v-model="formData.code"
                            :disabled="`${disabler.code}`"
                            class="p-inputtext-sm"
                            placeholder="Code"
                            @keyup="allowSubmit"
                          />
                        </div>
                      </div>
                      <div class="col-4">
                        <div class="flex flex-column gap-2">
                          <label for="supplier">Supplier</label>
                          <Dropdown
                            id="supplier"
                            v-model="formData.supplier"
                            :disabled="`${disabler.supplier}`"
                            :options="dropdown.supplier"
                            optionLabel="name"
                            placeholder="Supplier"
                            class="p-inputtext-sm"
                            filter
                            @change="allowSubmit"
                            @filter="searchSupplier($event.value)">
                            <template #option="slotProps">
                              {{ slotProps.option.code }} - {{ slotProps.option.name }}
                            </template>
                            <template #value="slotProps">
                              {{ slotProps.value.code }} - {{ slotProps.value.name }}
                            </template>
                          </Dropdown>
                        </div>
                      </div>
                      <div class="col-4">
                        <div class="flex flex-column gap-2">
                          <label for="purchase_date">Purchase Date</label>
                          <Calendar
                            id="purchase_date"
                            v-model="formData.purchase_date"
                            :manualInput="false"
                            :disabled="`${disabler.purchase_date}`"
                            dateFormat="yy-mm-dd"
                            class="p-inputtext-sm"
                            placeholder="Purchase Date"
                            @update:modelValue="allowSubmit"/>
                        </div>
                      </div>
                    </div>
                    <hr />
                    <Panel
                      header="Items"
                      :toggleable="false"
                    >
                      <template #icons>

                      </template>
                      <BlockUI :blocked="disabler.detail">
                        <DataTable
                          v-model:editingRows="autoTable.editingRows"
                          :value="products"
                          editMode="row"
                          dataKey="id"
                          tableClass="editable-cells-table largeDataType"
                          tableStyle="min-width: 50rem"
                          @row-edit-save="onRowEditSave">
                          <Column field="id" header="Action" style="width: 200px" class="text-right">
                            <template #editor="{ data, field }">
                              <strong class="flex">
                                <span class="material-icons-outlined material-symbols-outlined">tag</span>{{ data[field] }}
                              </strong>
                            </template>
                            <template #body="{ data, index }">
                              <div class="wrap_content">
                                <Button
                                  v-if="products.length - 1 !== index"
                                  type="button"
                                  class="p-button-raised p-button-sm p-button-danger px-3"
                                  @click="deleteDetail(data)"
                                >
                                  <span class="material-icons-outlined material-symbols-outlined">close</span> Delete
                                </Button>
                              </div>
                            </template>
                          </Column>
                          <Column field="item" header="Name" style="width: 50%">
                            <template #editor="{ data, field }">
                              <div class="grid">
                                <div class="col-12">
                                  <Tag v-if="data[field].code" :value="data[field].code" severity="info" /> {{ data[field].name }}
                                </div>
                                <div class="col-6">
                                  <div class="flex flex-column gap-2">
                                    <label :for="`remark_${data['id']}`">Remark</label>
                                    <Textarea id="`remark_${data['id']}`" v-model="data['remark']" :placeholder="`${data[field].code} Remark`" autoResize rows="5" cols="30" />
                                  </div>
                                </div>
                                <div class="col-6">
                                  <div class="flex flex-column gap-2">
                                    <label :for="`expired_date_${data['id']}`">Code</label>
                                    <Calendar
                                      :id="`expired_date_${data['id']}`"
                                      v-model="data['expired_date']"
                                      dateFormat="yy-mm-dd"
                                      class="p-inputtext-sm"
                                      placeholder="Expired Date" />
                                  </div>
                                </div>
                              </div>
                            </template>
                            <template #body="slotProps">
                              <div><Tag v-if="slotProps.data.item.code" :value="slotProps.data.item.code" severity="info" /> {{ slotProps.data.item.name }}</div>
                            </template>
                          </Column>
                          <Column field="qty" header="Qty" style="width: 80px" class="text-right">
                            <template #editor="{ data, field }">
                              <div class="flex text-right">
                                {{ data[field] }}
                              </div>
                            </template>
                            <template #body="slotProps">
                              {{ slotProps.data.qty }}
                            </template>
                          </Column>
                          <Column field="delivered" header="Delivered" style="width: 80px" class="text-right">
                            <template #editor="{ data, field }">
                              <div class="flex text-right">
                                {{ data[field] ?? 0 }}
                              </div>
                            </template>
                            <template #body="slotProps">
                              {{ slotProps.data.delivered ?? 0 }}
                            </template>
                          </Column>
                          <Column field="receiving" header="Received" style="width: 150px" class="wrap_content text-right">
                            <template #editor="{ data, field }">
                              <div class="p-inputgroup">
                                <InputNumber
                                  v-model="data[field]"
                                  class="p-inputtext-sm"
                                  placeholder="Receiving"
                                />
                              </div>
                            </template>
                            <template #body="slotProps">
                              {{ slotProps.data.receiving ?? 0 }}
                            </template>
                          </Column>
                          <Column :rowEditor="true" style="width: 10%; min-width: 8rem" bodyStyle="text-align:center"></Column>
                        </DataTable>
                      </BlockUI>
                    </Panel>
                    <hr />
                    <div class="grid">
                      <div class="col-12">
                        <div class="flex flex-column gap-2">
                          <label for="remark">Purchase Order Remark</label>
                          {{ formData.remark && formData.remark !== '' ? '' : '-' }}
                          <hr />
                          <label for="remark">Remark</label>
                          <Textarea id="remark" v-model="formData.remark" :disabled="disabler.remark" placeholder="Purchase order remark" autoResize rows="5" cols="30" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabPanel>
              <TabPanel header="Attachment">
                <div class="grid">
                  <div class="col-12">

                  </div>
                </div>
              </TabPanel>
            </TabView>
          </Panel>
          <div class="p-grid">
            <div class="p-col-12">
              <div class="flex jc-between">
                <div class="flex-initial flex align-items-center justify-content-center m-2 px-5 py-3">
                  <Button
                    type="button"
                    class="p-button-raised button-sm p-button-danger px-3"
                    @click="back()"
                  >
                    <span class="material-icons-outlined material-symbols-outlined">arrow_back</span> Back
                  </Button>
                  <label>&nbsp;</label>
                  <Button
                    type="button"
                    class="p-button-raised button-sm p-button-warning px-3"
                    @click="reloadDetailData()"
                  >
                    <span class="material-icons-outlined material-symbols-outlined">autorenew</span> Reset
                  </Button>
                </div>
                <div class="flex-grow-1 flex align-items-center justify-content-center m-2 px-5 py-3"></div>
                <div
                  v-if="allowSave === true"
                  class="flex-initial flex align-items-right justify-content-center m-2 px-5 py-3"
                >
                  <Button
                    type="button"
                    class="p-button-raised button-sm p-button-info px-3"
                    @click="submitPO($event)"
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
      <ConfirmDialog group="keep_editing"></ConfirmDialog>
    </div>
  </div>
</template>
<script>
import Card from 'primevue/card'
import Panel from 'primevue/panel'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import Column from 'primevue/column'
import ConfirmPopup from 'primevue/confirmpopup'
import ConfirmDialog from 'primevue/confirmdialog'
import Textarea from 'primevue/textarea'
import TabView from 'primevue/tabview'
import InputNumber from 'primevue/inputnumber'
import TabPanel from 'primevue/tabpanel'
import DataTable from 'primevue/datatable'
import Tag from 'primevue/tag'
import BlockUI from 'primevue/blockui'
import Calendar from 'primevue/calendar'
import MasterItemService from '@/modules/master/item/service'
import PurchaseOrderService from '@/modules/inventory/purchase_order/service'
import DateManagement from '@/modules/function'
import { mapGetters, mapState } from 'vuex'
export default {
  name: 'GeneralReceiveNoteAdd',
  components: {
    Card,
    Panel,
    InputText,
    Button,
    Dropdown,
    ConfirmPopup,
    ConfirmDialog,
    DataTable,
    Column,
    BlockUI,
    Tag,
    TabView,
    TabPanel,
    InputNumber,
    Calendar,
    Textarea,
  },
  data() {
    return {
      dropdown: {
        discount_type: [
          { label: 'None', value: 'n' },
          { label: 'Percentage', value: 'p' },
          { label: 'Value', value: 'v' }
        ],
        supplier: [],
        item: [],
      },
      autoTable: {
        editingRows: []
      },
      computer: {
        total: 0,
        final_total: 0,
      },
      products: [],
      formData: {
        code: '',
        purchase_date: '',
        supplier: {
          id: '',
          code: '',
          name: '',
        },
        detail: [],
        discount_type: { label: 'None', value: 'n' },
        discount_value: 0,
        remark: '',
        __v: 0,
      },
      disabler: {
        code: 'disabled',
        purchase_date: 'disabled',
        supplier: 'disabled',
        detail: true,
        discount_type: 'disabled',
        discount_value: 'disabled',
        remark: true,
      },
      allowSave: false,
    }
  },
  computed: {
    ...mapState('storeApplication', {
      application: state => state.configuration
    }),
  },
  async mounted() {
    await this.reloadDetailData()

    await this.sockets.subscribe('data_result', (data) => {
      this.$confirm.require({
        group: 'keep_editing',
        message: `${data.payload.message}. Back to general receive note list?`,
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-success',
        rejectClass: 'p-button-warning',
        acceptLabel: 'Yes',
        acceptIcon: 'pi pi-check-circle',
        rejectLabel: 'Review',
        rejectIcon: 'pi pi-times-circle',
        accept: () => {
          this.$router.push('/inventory/general_receive_note')
        },
        reject: () => {
          //callback to execute when user rejects the action
        },
        onHide: () => {
          //Callback to execute when dialog is hidden
        },
      })
    });

  },
  methods: {
    back() {
      this.$router.push('/inventory/general_receive_note')
    },
    async reloadDetailData() {
      // const cal = Calendar.getInstance()
      await PurchaseOrderService.getDetail(this.$route.query.id.toString()).then((response) => {
        this.openDisabler()
        const data = response.data
        this.formData.code = data.code
        this.formData.supplier = data.supplier
        const purchase_date = new Date(data.purchase_date)
        purchase_date.setUTCHours(0,0,0,0)
        this.formData.purchase_date = purchase_date.toISOString().substring(0, 10)
        this.formData.remark = data.remark
        this.formData.__v = data.__v
        data.detail.map((e, f) => {
          data.detail[f] = {
            id: (f + 1),
            receiving: 0,
            batch: '',
            expired_date: '',
            storing_label: '',
            ...e,
          }
        })
        this.products = data.detail
        this.products.push({
          id: data.detail.length + 1,
          item: {
            id: '',
            code: '',
            name: '-',
            brand: {
              id: '',
              code: '',
              name: '',
            },
          },
          price: 0,
          total: 0,
          qty: 0,
          delivered: 0,
          receiving: 0,
          batch: '',
          expired_date: '',
          storing_label: '',
          discount_type: 'n',
          discount_value: 0,
          remark: '',
        })

        this.allowSave = true
      })
    },
    addItem() {
      if(this.allowAdd()) {
        this.products.push({
          id: this.products.length + 1,
          item: {
            id: '',
            code: '',
            name: '-',
            brand: {
              id: '',
              code: '',
              name: '',
            },
          },
          price: 0,
          qty: 0,
          total: 0,
          discount_type: 'n',
          discount_value: 0,
          remark: '',
        })
      }
    },
    formatCurrency(value) {
      return new Intl.NumberFormat(`${this.application['APPLICATION_LOCALE'].language_code.toLowerCase()}-${this.application['APPLICATION_LOCALE'].iso_2_digits.toUpperCase()}`, { style: 'currency', currency: this.application['APPLICATION_LOCALE'].currency }).format(value);
    },
    allowAdd() {
      return (
        this.products[this.products.length - 1].item.id !== '' &&
        this.products[this.products.length - 1].qty > 0
      )
    },
    async allowSubmit() {
      this.calculateAll()
      let countProduct = 0
      await Promise.all(this.products.map((e) => {
        if(e.item.id !== '' && parseFloat(e.qty) > 0) {
          countProduct++
        }
      }))
      this.allowSave = (this.formData.supplier.id !== '' && countProduct > 0 && this.formData.code !== '')
    },
    calculateAll() {
      let totalAfterDiscount = this.computer.total
      if(this.formData.discount_type.value === 'v') {
        totalAfterDiscount = totalAfterDiscount - this.formData.discount_value
      } else if(this.formData.discount_type.value === 'p') {
        totalAfterDiscount = totalAfterDiscount - (totalAfterDiscount * this.formData.discount_value / 100)
      } else {
        this.computer.final_total = this.computer.total
      }
      this.computer.final_total = totalAfterDiscount
    },
    onRowEditSave(event) {
      let { newData, index } = event;
      const discount_type = newData.discount_type
      const totalPre = newData.qty * newData.price
      if(discount_type === 'v') {
        newData.total = totalPre - newData.discount_value
      } else if(discount_type === 'p') {
        newData.total = totalPre - (totalPre * newData.discount_value / 100)
      } else {
        newData.total = totalPre
      }

      this.computer.total += newData.total

      let totalAfterDiscount = newData.total
      if(this.formData.discount_type.value === 'v') {
        totalAfterDiscount = totalAfterDiscount - newData.discount_value
      } else if(this.formData.discount_type.value === 'p') {
        totalAfterDiscount = totalAfterDiscount - (totalAfterDiscount * newData.discount_value / 100)
      } else {
        totalAfterDiscount = this.computer.total
      }

      this.computer.final_total += totalAfterDiscount

      this.products[index] = newData
      this.addItem()
      this.allowSubmit()
    },
    deleteDetail(data) {
      this.products.splice(this.products.indexOf(data), 1)
      this.computer.total -= data.total
      this.allowSubmit()
    },
    getDiscountLabel(status) {
      switch (status) {
        case 'n':
          return 'None';

        case 'p':
          return 'Percentage';

        case 'v':
          return 'Value';

        default:
          return null;
      }
    },
    closeDisabler() {
      this.disabler = {
        code: true,
        purchase_date: true,
        supplier: true,
        detail: true,
        discount_type: true,
        discount_value: true,
        remark: true,
      }
    },
    openDisabler() {
      this.disabler = {
        code: false,
        purchase_date: false,
        supplier: false,
        detail: false,
        discount_type: false,
        discount_value: false,
        remark: false,
      }
    },
    async submitPO(event) {
      const target = event.target
      const confirmation = this.$confirm
      if (this.allowSave) {
        confirmation.require({
          group: 'confirm_changes',
          target: target,
          message: `Submit General Receive Note?`,
          icon: 'pi pi-exclamation-triangle',
          acceptClass: 'button-success',
          acceptIcon: 'pi pi-check-circle',
          acceptLabel: 'Yes',
          rejectLabel: 'Abort',
          rejectIcon: 'pi pi-times-circle',
          accept: async () => {
            const parseDetail = []
            const detail = this.products
            detail.map((e) => {
              if(parseFloat(e.qty) > 0 && e.item.id !== '') {
                parseDetail.push({
                  item: e.item,
                  qty: parseFloat(e.qty),
                  price: parseFloat(e.price),
                  discount_type: e.discount_type,
                  discount_value: parseFloat(e.discount_value),
                  remark: e.remark,
                })
              }
            })

            this.formData.discount_type = this.formData.discount_type.value
            this.formData.detail = parseDetail
            this.allowSave = false

            this.closeDisabler()

            await PurchaseOrderService.edit(this.$route.query.id.toString(), this.formData).then(() => {

            })
          },
          reject: () => {
            // callback to execute when user rejects the action
          },
        })
      }
    },
    async searchSupplier(search) {
      await MasterItemService.findSupplier(search).then((response) => {
        this.dropdown.supplier = response
      })
    },
    async searchItem(search) {
      await MasterItemService.findItem(search).then((response) => {
        this.dropdown.item = response
      })
    }
  },
}
</script>
