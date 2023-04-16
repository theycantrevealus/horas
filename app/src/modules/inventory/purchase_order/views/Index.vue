<template>
  <div>
    <Card class="card-fluid">
      <template #header>
        <Toolbar>
          <template #left>
            <Button
              v-if="permission.btnAddPurchaseOrder !== undefined"
              label="New"
              icon="pi pi-plus"
              class="mr-2 button-rounded"
              @click="purchaseOrderAdd"
            />
          </template>

          <template #right></template>
        </Toolbar>
      </template>
      <template #content>
        <DataTable
          ref="dt"
          v-model:filters="filters"
          :value="items"
          :lazy="true"
          :paginator="true"
          :rows="20"
          :totalRecords="totalRecords"
          :loading="loading"
          filterDisplay="row"
          :globalFilterFields="['code', 'supplier', 'created_by']"
          responsiveLayout="scroll"
          @page="onPage($event)"
          @sort="onSort($event)"
          @filter="onFilter($event)"
        >
          <Column
            header="#"
            class="wrap_content text-right"
          >
            <template #body="slotProps">
              <strong class="d-inline-flex">
                <span class="material-icons-outlined">hashtag</span>
                {{ slotProps.data.autonum}}
              </strong>
            </template>
          </Column>
          <Column header="Action" class="wrap_content">
            <template #body="slotProps">
              <span class="p-buttonset">
                <Button
                  v-if="permission.btnEditPurchaseOrder !== undefined"
                  class="p-button-info p-button-sm p-button-raised"
                  @click="purchaseOrderEdit(slotProps.data.id)"
                >
                  <span class="material-icons">edit</span>
                </Button>
                <Button
                  v-if="permission.btnDeletePurchaseOrder !== undefined"
                  class="p-button-danger p-button-sm p-button-raised"
                  @click="purchaseOrderDelete($event, slotProps.data.id)"
                >
                  <span class="material-icons">delete</span>
                </Button>
              </span>
            </template>
          </Column>
          <Column
            ref="code"
            field="code"
            header="Code"
            filterMatchMode="startsWith"
            :sortable="true"
            class="wrap_content"
          >
            <template #filter="{ filterModel, filterCallback }">
              <InputText
                v-model="filterModel.value"
                type="text"
                class="column-filter"
                placeholder="Search by code"
                @keydown.enter="filterCallback()"
              />
            </template>
          </Column>
          <Column
            ref="supplier"
            field="supplier.name"
            header="Supplier Name"
            filterField="supplier.name"
            filterMatchMode="contains"
            :sortable="true"
          >
            <template #filter="{ filterModel, filterCallback }">
              <InputText
                v-model="filterModel.value"
                type="text"
                class="column-filter"
                placeholder="Search by supplier"
                @keydown.enter="filterCallback()"
              />
            </template>
          </Column>
          <Column
            ref="created_at"
            field="created_at"
            header="Created Date"
            :sortable="true"
          >
            <template #body="slotProps">
              <b>{{ formatDate(slotProps.data.created_at, 'DD MMMM YYYY') }}</b>
            </template>
          </Column>
        </DataTable>
      </template>
      <template #footer></template>
    </Card>
    <ConfirmPopup></ConfirmPopup>
  </div>
</template>

<script>
import DateManagement from '@/modules/function'
import Card from 'primevue/card'
import ConfirmPopup from 'primevue/confirmpopup'
import Toolbar from 'primevue/toolbar'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import PurchaseOrderService from '@/modules/inventory/purchase_order/service'

export default {
  components: {
    DataTable,
    Column,
    InputText,
    Button,
    Card,
    Toolbar,
    ConfirmPopup,
  },
  data() {
    return {
      loading: false,
      totalRecords: 0,
      items: [],
      filters: {
        code: { value: '', matchMode: 'contains' },
        'supplier.name': { value: '', matchMode: 'contains' },
      },
      lazyParams: {},
      columns: [
        { field: 'code', header: 'Code' },
        { field: 'supplier.name', header: 'Name' },
        { field: 'created_at', header: 'Join Date' },
      ],
    }
  },
  computed: {
    permission() {
      return this.$store.state.credential.permission
    },
  },
  mounted() {
    this.lazyParams = {
      first: 0,
      rows: this.$refs.dt.rows,
      sortField: 'created_at',
      sortOrder: 1,
      filters: this.filters,
    }

    this.loadLazyData()
  },
  methods: {
    purchaseOrderAdd() {
      this.$router.push('/inventory/purchase_order/add')
    },
    purchaseOrderEdit(id) {
      this.$router.push(`/inventory/purchase_order/edit/${id}`)
    },
    itemDelete(event, id) {
      this.$confirm.require({
        target: event.currentTarget,
        message: 'Are you sure to delete this data?',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'button-danger',
        acceptLabel: 'Yes. Delete it!',
        rejectLabel: 'Cancel',
        accept: () => {
          this.loading = true
        },
        reject: () => {
          // Reject
        },
      })
    },
    formatDate(date, format) {
      return DateManagement.formatDate(date, format)
    },
    loadLazyData() {
      this.loading = true

      PurchaseOrderService.getItemList(this.lazyParams).then((response) => {
        if (response) {
          const data = response.data.payload.data
          const totalRecords = response.data.payload.totalRecords
          this.items = data
          this.totalRecords = totalRecords
        } else {
          this.items = []
          this.totalRecords = 0
        }
        this.loading = false
      })
    },
    onPage(event) {
      this.lazyParams = event
      this.loadLazyData()
    },
    onSort(event) {
      this.lazyParams = event
      this.loadLazyData()
    },
    onFilter() {
      this.lazyParams.filters = this.filters
      this.loadLazyData()
    },
  },
}
</script>
