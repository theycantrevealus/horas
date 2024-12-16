<template>
  <div>
    <Card class="card-fluid">
      <template #header>
        <Toolbar>
          <template #left>
            <Button
              v-if="credential.btnAddItem !== undefined"
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
          :rowsPerPageOptions="[5, 10, 20, 50]"
          :totalRecords="totalRecords"
          :loading="loading"
          filterDisplay="row"
          :globalFilterFields="['code', 'name']"
          responsiveLayout="scroll"
          @page="onPage($event)"
          @sort="onSort($event)"
          @filter="onFilter($event)"
        >
          <Column
            header="#"
            class="text-right wrap_content"
          >
            <template #body="slotProps">
              <strong class="d-inline-flex">
                <span class="material-icons-outlined material-symbols-outlined">tag</span>
                {{ slotProps.data.autonum}}
              </strong>
            </template>
          </Column>
          <Column
            header="Action"
            class="text-right wrap_content">
            <template #body="slotProps">
              <span class="p-buttonset">
                <Button
                  class="p-button-info p-button-sm p-button-raised"
                  @click="itemEditForm(slotProps.data.id)"
                >
                  <span class="material-icons">edit</span> Edit
                </Button>
                <Button
                  class="p-button-danger p-button-sm p-button-raised"
                  @click="itemDelete($event, slotProps.data.id)"
                >
                  <span class="material-icons">delete</span> Delete
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
            style="width: 12.5% !important;"
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
            <template #body="slotProps">
              <label class="currency-label text-600">{{ slotProps.data.code }}</label>
            </template>
          </Column>
          <Column
            ref="name"
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
            <template #body="slotProps">
              <b>{{ slotProps.data.name }} / {{ slotProps.data.alias }}</b>
            </template>
          </Column>
          <Column
            ref="unit"
            field="unit"
            header="Unit"
            :sortable="false"
            style="width: 12.5% !important;"
          >
            <template #body="slotProps">
              <b>{{ slotProps.data.unit.name }}</b>
            </template>
          </Column>
          <Column
            ref="created_at"
            class="text-right wrap_content"
            field="created_at"
            header="Created Date"
            :sortable="true"
          >
            <template #body="slotProps">
              <b>{{ formatDate(slotProps.data.created_at, 'DD MMMM YYYY') }}</b>
            </template>
          </Column>
          <template #footer>
            <div class="text-xs">
              <NumberLabel class="text-cyan-600" lang="ID" code="ID" currency="IDR" :number="lazyParams.page > 0 ? lazyParams.first + 1 : 1" decimal="0" /> - <NumberLabel class="text-cyan-600" lang="ID" code="ID" currency="IDR" :number="lazyParams.first > 0 ? lazyParams.first + lazyParams.rows : lazyParams.rows" decimal="0" /> / <NumberLabel class="text-cyan-600" lang="ID" code="ID" currency="IDR" :number="totalRecords ? totalRecords : 0" decimal="0" /> rows
            </div>
          </template>
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
import {mapState} from "vuex"
import NumberLabel from '@/components/Number.vue'

export default {
  components: {
    DataTable,
    Column,
    InputText,
    Button,
    Card,
    Toolbar,
    ConfirmPopup,
    NumberLabel,
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
    ...mapState('storeCredential', {
      credential: state => state
    }),
  },
  mounted() {
    this.lazyParams = {
      first: 0,
      page: 0,
      rows: this.$refs.dt.rows,
      sortField: 'created_at',
      sortOrder: 1,
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
          const data = response.payload.data
          const totalRecords = response.payload.totalRecords
          this.items = data
          this.totalRecords = totalRecords
        } else {
          this.items = []
          this.totalRecords = 0
        }
        this.loading = false
      }).catch(() => {
        this.items = []
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
      this.lazyParams.page = 0
      this.lazyParams.first = 0
      this.lazyParams.filters = this.filters
      this.loadLazyData()
    },
  },
}
</script>
