<template>
  <div class="grid">
    <div class="col-12">
      <Card class="slim">
        <template #content>
          <Panel
            header="Add New Purchase Order"
            :toggleable="false"
          >
            <template #icons>
              <Button class="p-button-text p-button-info p-button-rounded p-button-raised button-sm"><span class="material-icons">help</span>
                Info</Button>
            </template>
          </Panel>
          <TabView>
            <TabPanel header="Main Info">
              <div class="grid">
                <div class="col-12 form-mode">
                  <div class="p-inputgroup">
                    <span class="p-inputgroup-addon">
                      <span class="material-icons-outlined">qr_code</span>
                    </span>
                    <InputText
                      v-model="formData.email"
                      class="inputtext-sm"
                      placeholder="Code"
                    />
                  </div>
                  <div class="p-inputgroup">
                    <span class="p-inputgroup-addon">
                      <span class="material-icons-outlined">person</span>
                    </span>
                    <Dropdown
                      v-model="formData.authority"
                      :options="supplier"
                      optionLabel="name"
                      optionValue="id"
                      placeholder="Supplier"
                    />
                    <span class="p-inputgroup-addon">
                      <span class="material-icons-outlined">calendar_month</span>
                    </span>
                    <InputText
                      v-model="formData.first_name"
                      class="inputtext-sm"
                      placeholder="Purchase Date"
                    />
                  </div>
                </div>
                <div class="col-12 form-mode">
                  <Panel
                    header="Items"
                    :toggleable="false"
                  >
                    <template #icons>
                      <Button class="p-button p-button-info p-button-rounded p-button-raised button-sm pull-right" @click="addItem">
                        <span class="material-icons">add</span>Add Item
                      </Button>
                    </template>
                    <DataTable
                      v-model:editingRows="autoTable.editingRows"
                      :value="products"
                      editMode="row"
                      dataKey="id"
                      tableClass="editable-cells-table"
                      tableStyle="min-width: 50rem"
                      @row-edit-save="onRowEditSave">
                      <Column field="code" header="Code" style="width: 20%">
                        <template #editor="{ data, field }">
                          <InputText v-model="data[field]" />
                        </template>
                      </Column>
                      <Column field="name" header="Name" style="width: 20%">
                        <template #editor="{ data, field }">
                          <InputText v-model="data[field]" />
                        </template>
                      </Column>
                      <Column field="inventoryStatus" header="Status" style="width: 20%">
                        <template #editor="{ data, field }">
                          <Dropdown v-model="data[field]" :options="statuses" optionLabel="label" optionValue="value" placeholder="Select a Status">
                            <template #option="slotProps">
                              <Tag :value="slotProps.option.value" :severity="getStatusLabel(slotProps.option.value)" />
                            </template>
                          </Dropdown>
                        </template>
                        <template #body="slotProps">
                          <Tag :value="slotProps.data.inventoryStatus" :severity="getStatusLabel(slotProps.data.inventoryStatus)" />
                        </template>
                      </Column>
                      <Column field="price" header="Price" style="width: 20%">
                        <template #body="{ data, field }">
                          {{ formatCurrency(data[field]) }}
                        </template>
                        <template #editor="{ data, field }">
                          <InputNumber v-model="data[field]" mode="currency" currency="USD" locale="en-US" />
                        </template>
                      </Column>
                      <Column :rowEditor="true" style="width: 10%; min-width: 8rem" bodyStyle="text-align:center"></Column>
                    </DataTable>
                  </Panel>
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
          <div class="p-grid">
            <div class="p-col-12">
              <div class="flex jc-between">
                <div class="flex-initial flex align-items-center justify-content-center m-2 px-5 py-3">
                  <Button
                    type="button"
                    class="button-raised button-sm p-button-danger px-3"
                    @click="back()"
                  >
                    <span class="material-icons-outlined">arrow_back</span> Back
                  </Button>
                </div>
                <div class="flex-grow-1 flex align-items-center justify-content-center m-2 px-5 py-3"></div>
                <div
                  v-if="allowSave === true"
                  class="flex-initial flex align-items-right justify-content-center m-2 px-5 py-3"
                >
                  <Button
                    type="button"
                    class="button-raised button-sm p-button-info px-3"
                    @click="updateAccountData($event)"
                  >
                    <span class="material-icons-outlined">check_circle</span> Save Data
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
    <Dialog
      v-model:visible="displayEditorImage"
      header="Avatar Editor"
      :style="{ width: '50vw' }"
      :modal="true"
    >
      <p class="m-0">
        <Cropper @cropImage="setImageData" />
      </p>
      <template #footer>
        <Button
          label="Close"
          icon="pi pi-times"
          class="button-text"
          @click="toggleEditImageWindow"
        />
      </template>
    </Dialog>
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
import Dialog from 'primevue/dialog'
import TabView from 'primevue/tabview'
import InputNumber from 'primevue/inputnumber'
import TabPanel from 'primevue/tabpanel'
import DataTable from 'primevue/datatable'
import Tag from 'primevue/tag'
import Cropper from '@/components/Cropper.vue'
import { getCurrentTimestamp } from '@/util/time'

import { mapActions, mapGetters, mapState } from 'vuex'
export default {
  name: 'AccountEdit',
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
    Tag,
    Dialog,
    TabView,
    TabPanel,
    InputNumber,
    Cropper,
  },
  data() {
    return {
      statuses: [
        { label: 'In Stock', value: 'INSTOCK' },
        { label: 'Low Stock', value: 'LOWSTOCK' },
        { label: 'Out of Stock', value: 'OUTOFSTOCK' }
      ],
      supplier: [],
      autoTable: {
        editingRows: []
      },
      products: [
        {
          id: '1000',
          code: 'f230fh0g3',
          name: 'Bamboo Watch',
          description: 'Product Description',
          image: 'bamboo-watch.jpg',
          price: 65,
          category: 'Accessories',
          quantity: 24,
          inventoryStatus: 'INSTOCK',
          rating: 5
        },
      ],
      displayEditorImage: false,
      formData: {
        id: '',
        email: '',
        first_name: '',
        last_name: '',
        authority: '',
        selectedAccess: [],
        selectedPermission: [],
        __v: 0,
      },
      allowSave: false,
    }
  },
  async mounted() {
    this.allowSave = false
  },
  methods: {
    back() {
      this.$router.push('/account')
    },
    addItem() {
      this.products.push({
        id: `100${this.products.length}`,
        code: 'f230fh0g3',
        name: 'Bamboo Watch',
        description: 'Product Description',
        image: 'bamboo-watch.jpg',
        price: 65,
        category: 'Accessories',
        quantity: 24,
        inventoryStatus: 'INSTOCK',
        rating: 5
      })
    },
    formatCurrency(value) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    },
    onRowEditSave(event) {
      let { newData, index } = event;
      this.products[index] = newData
    },
    getStatusLabel(status) {
      switch (status) {
        case 'INSTOCK':
          return 'success';

        case 'LOWSTOCK':
          return 'warning';

        case 'OUTOFSTOCK':
          return 'danger';

        default:
          return null;
      }
    },
  },
}
</script>
<style>
.profile-display {
  position: relative;
  background: red;
}

.profile-display img {
  position: absolute;
  border-radius: 100%;
  width: 200px;
  height: 200px;
  background: #f2f2f2;
  margin: 0 25%;
}
</style>
