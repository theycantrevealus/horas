<template>
  <div>
    <Card class="card-fluid">
      <template #header>
        <div>
          <Toolbar>
            <template #start>
              <Button
                :disabled="!allowDispatch('btnAddLOV')"
                label="New"
                icon="pi pi-plus"
                class="mr-2 button-rounded"
                @click="addLOV"
              />
            </template>

            <template #end> </template>
          </Toolbar>
        </div>
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
          :globalFilterFields="['name', 'group', 'parent', 'value']"
          responsiveLayout="scroll"
          @page="onPage($event)"
          @sort="onSort($event)"
          @filter="onFilter($event)"
        >
          <Column header="#" class="text-right wrap_content">
            <template #body="slotProps">
              <strong class="d-inline-flex">
                <span class="material-icons-outlined material-symbols-outlined">tag</span>
                {{ slotProps.data['autonum'] }}
              </strong>
            </template>
          </Column>
          <Column header="Action" class="text-right wrap_content">
            <template #body="slotProps">
              <span class="p-buttonset">
                <Button
                  class="p-button-info p-button-sm p-button-raised"
                  :disabled="!allowDispatch('btnEditLOV')"
                  @click="editLOV(slotProps.data.id)"
                >
                  <span class="material-icons">edit</span> Edit
                </Button>
                <Button
                  class="p-button-danger p-button-sm p-button-raised"
                  :disabled="!allowDispatch('btnDeleteLOV')"
                  @click="deleteLOV($event, slotProps.data.id)"
                >
                  <span class="material-icons">delete</span> Delete
                </Button>
              </span>
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
              <b>{{ slotProps.data.name }}</b>
            </template>
          </Column>
          <Column
            ref="group"
            field="group"
            header="Group"
            filterMatchMode="startsWith"
            :sortable="true"
            style="width: 12.5% !important"
          >
            <template #filter="{ filterModel, filterCallback }">
              <InputText
                v-model="filterModel.value"
                type="text"
                class="column-filter"
                placeholder="Search by group"
                @keydown.enter="filterCallback()"
              />
            </template>
            <template #body="slotProps">
              <label class="currency-label text-600">{{ slotProps.data.group }}</label>
            </template>
          </Column>
          <Column
            ref="value"
            field="value"
            header="Value"
            filterMatchMode="startsWith"
            :sortable="true"
            style="width: 12.5% !important"
          >
            <template #filter="{ filterModel, filterCallback }">
              <InputText
                v-model="filterModel.value"
                type="text"
                class="column-filter"
                placeholder="Search by value"
                @keydown.enter="filterCallback()"
              />
            </template>
            <template #body="slotProps">
              <label class="currency-label text-600">{{ slotProps.data.value }}</label>
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
              <b>{{ formatDate(slotProps.data['created_at'], 'DD MMMM YYYY') }}</b>
            </template>
          </Column>
          <template #footer>
            <div class="text-xs">
              <NumberLabel
                class="text-cyan-600"
                lang="ID"
                code="ID"
                currency="IDR"
                :number="lazyParams.page > 0 ? lazyParams.first + 1 : 1"
                :decimal="0"
              />
              -
              <NumberLabel
                class="text-cyan-600"
                lang="ID"
                code="ID"
                currency="IDR"
                :number="
                  lazyParams.first > 0 ? lazyParams.first + lazyParams.rows : lazyParams.rows
                "
                :decimal="0"
              />
              /
              <NumberLabel
                class="text-cyan-600"
                lang="ID"
                code="ID"
                currency="IDR"
                :number="totalRecords ? totalRecords : 0"
                :decimal="0"
              />
              rows
            </div>
          </template>
        </DataTable>
      </template>
      <template #footer></template>
    </Card>
    <ConfirmPopup></ConfirmPopup>
    <DynamicDialog />
  </div>
</template>

<script>
import DateManagement from '@/utils/core/date.ts'
import Card from 'primevue/card'
import ConfirmPopup from 'primevue/confirmpopup'
import Toolbar from 'primevue/toolbar'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import NumberLabel from '@/components/Number.vue'
import { defineAsyncComponent } from "vue"
import DynamicDialog from "primevue/dynamicdialog";
import { storeCore } from '@/store/index'
import { mapActions, mapState } from 'pinia'
import { storeLOV } from '@/modules/master/lov/store'

const LOVForm = defineAsyncComponent(() => import('@/modules/master/lov/components/Form.vue'))
export default {
  components: {
    DataTable,
    DynamicDialog,
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
      credential: {},
      loading: false,
      totalRecords: 0,
      items: [],
      filters: {
        name: { value: '', matchMode: 'contains' },
        group: { value: '', matchMode: 'contains' },
        value: { value: '', matchMode: 'contains' },
      },
      lazyParams: {},
      columns: [
        { field: 'name', header: 'Name' },
        { field: 'group', header: 'Group' },
        { field: 'value', header: 'Value' },
        { field: 'created_at', header: 'Created Date' },
      ],
    }
  },
  computed: {

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
    this.UIToggleEditingData(true)
    this.loadLazyData()
  },
  methods: {
    ...mapActions(storeCore, ['allowDispatch', 'UIToggleEditingData']),
    ...mapActions(storeLOV, ['getList']),
    addLOV() {
      this.$dialog.open(LOVForm, {
        props: {
          header: 'Add LOV',
          style: {
            width: '90vw'
          },
          breakpoints: {
            '960px': '75vw',
            '640px': '90vw'
          },
          modal: true,
        },
        data: {
          mode: 'add'
        },
        onClose: () => {
          this.loadLazyData()
        }
      })
    },
    editLOV(id) {
      this.$dialog.open(LOVForm, {
        props: {
          header: 'Edit LOV',
          style: {
            width: '90vw'
          },
          breakpoints: {
            '960px': '75vw',
            '640px': '90vw'
          },
          modal: true,
        },
        data: {
          mode: 'edit',
          id: id
        },
        onClose: () => {
          this.loadLazyData()
        }
      })
    },
    deleteLOV(event, id) {
      this.$confirm.require({
        target: event.currentTarget,
        message: 'Are you sure to delete this data?',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'button-danger',
        acceptLabel: 'Yes. Delete it!',
        rejectLabel: 'Cancel',
        accept: async () => {
          // LOVService.deleteLOV(id).then(() => {
          //   this.loadLazyData()
          // })
        },
        reject: () => {
          // Reject
        },
      })
    },
    formatDate(date, format) {
      return DateManagement.formatDate(date, format)
    },
    async loadLazyData() {
      this.loading = true

      await this.getList(this.lazyParams).then((response) => {
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
