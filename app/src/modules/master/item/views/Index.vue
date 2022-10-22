<template>
  <div>
    <Card class="card-fluid">
      <template #header>
        <Toolbar>
          <template #left>
            <Button
              v-if="permission.btnAddItem !== undefined"
              label="New"
              icon="pi pi-plus"
              class="mr-2 button-rounded"
              @click="itemAddForm"
            />
          </template>

          <template #right>
            <Button
              label="Upload"
              icon="pi pi-upload"
              class="button-success button-rounded"
            />
          </template>
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
          :globalFilterFields="['first_name', 'last_name', 'email']"
          responsiveLayout="scroll"
          @page="onPage($event)"
          @sort="onSort($event)"
          @filter="onFilter($event)"
        >
          <Column
            header="#"
            class="align-right"
          >
            <template #body="slotProps">
              <h6 class="d-inline-flex">#{{ slotProps.data.autonum
                  }}</h6>
            </template>
          </Column>
          <Column header="Action">
            <template #body="slotProps">
              <span class="buttonset wrap_content">
                <Button
                  v-if="permission.btnEditItem !== undefined"
                  class="button button-info button-sm button-raised"
                  @click="itemEditForm(slotProps.data.id)"
                >
                  <span class="material-icons">edit</span>
                </Button>
                <Button
                  v-if="permission.btnDeleteItem !== undefined"
                  class="button button-danger button-sm button-raised"
                  @click="itemDelete($event, slotProps.data.id)"
                >
                  <span class="material-icons">delete</span>
                </Button>
              </span>
            </template>
          </Column>
          <Column
            ref="first_name"
            field="code"
            header="Code"
            filterMatchMode="startsWith"
            :sortable="true"
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
            ref="last_name"
            field="name"
            header="Name"
            filterField="name"
            filterMatchMode="contains"
            :sortable="true"
          >
            <template #filter="{ filterModel, filterCallback }">
              <InputText
                v-model="filterModel.value"
                type="text"
                class="column-filter"
                placeholder="Search by name"
                @keydown.enter="filterCallback()"
              />
            </template>
          </Column>
          <Column
            ref="created_at"
            field="created_at"
            header="Created Date"
            :sortable="true"
            class="wrap_content text-right"
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
import MasterItemService from '@/modules/master/item/service'
import DataTableFilterMeta from 'primevue/datatable'

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
        name: { value: '', matchMode: 'contains' },
      },
      lazyParams: {},
      columns: [
        { field: 'code', header: 'Code' },
        { field: 'name', header: 'Name' },
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
      sortField: null,
      sortOrder: null,
      filters: this.filters,
    }

    this.loadLazyData()
  },
  methods: {
    itemAddForm() {
      this.$router.push('/master/item/add')
    },
    itemEditForm(id) {
      this.$router.push(`/master/item/edit/${id}`)
    },
    itemDelete(event, id) {
      this.$confirm.require({
        target: event.currentTarget,
        message: 'Are you sure to delete this item?',
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

      MasterItemService.getItemList(this.lazyParams).then((response) => {
        if (response) {
          const data = response.data.list
          const totalRecords = response.data.totalRecords
          this.items = data
          this.totalRecords = totalRecords
          this.loading = false
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
