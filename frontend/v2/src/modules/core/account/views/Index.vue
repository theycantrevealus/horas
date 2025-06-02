<template>
  <div class="grid">
    <div class="col-12">
      <Card class="slim">
        <template #header>
          <Panel :toggleable="false">
            <template #header>
              <p class="font-bold text-2xl w-10">Account List</p>
            </template>
            <template #icons>
              <Button
                class="p-button-info p-button-rounded p-button-raised button-sm"
                @click="accountAdd"
                ><span class="material-icons">add</span> Add Account</Button
              >
            </template>
          </Panel>
        </template>
        <template #content>
          <DataTable
            ref="dt"
            v-model:filters="filters"
            :value="items"
            :lazy="true"
            :paginator="true"
            :rows="20"
            stripedRows
            paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
            :rowsPerPageOptions="[20, 50, 100]"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
            :totalRecords="totalRecords"
            :loading="loading"
            filterDisplay="row"
            :globalFilterFields="['email', 'first_name', 'last_name', 'created_at']"
            responsiveLayout="scroll"
            @page="onPage($event)"
            @sort="onSort($event)"
            @filter="onFilter($event)"
          >
            <Column header="#" class="align-right wrap_content">
              <template #body="slotProps">
                <h6 class="d-inline-flex">#{{ slotProps.data.autonum }}</h6>
              </template>
            </Column>
            <Column class="wrap_content" header="Action">
              <template #body="slotProps">
                <span class="p-buttonset wrap_content">
                  <Button
                    :disabled="!allowDispatch('btnAccountEdit')"
                    class="button p-button-info button-sm button-raised"
                    @click="accountEdit(slotProps.data.id)"
                  >
                    <span class="material-icons">edit</span> Edit
                  </Button>
                  <Button
                    :disabled="!allowDispatch('btnAccountDelete')"
                    class="button p-button-danger button-sm button-raised"
                    @click="accountDelete($event, slotProps.data.id)"
                  >
                    <span class="material-icons">delete</span> Delete
                  </Button>
                </span>
              </template>
            </Column>
            <Column
              ref="email"
              field="email"
              header="Email"
              filterMatchMode="startsWith"
              :sortable="true"
            >
              <template #filter="{ filterModel, filterCallback }">
                <InputText
                  v-model="filterModel.value"
                  type="text"
                  class="column-filter"
                  placeholder="Search by email"
                  @keydown.enter="filterCallback()"
                />
              </template>
            </Column>
            <Column
              ref="first_name"
              field="first_name"
              header="First Name"
              filterMatchMode="startsWith"
              :sortable="true"
            >
              <template #filter="{ filterModel, filterCallback }">
                <InputText
                  v-model="filterModel.value"
                  type="text"
                  class="column-filter"
                  placeholder="Search by first name"
                  @keydown.enter="filterCallback()"
                />
              </template>
            </Column>
            <Column
              ref="last_name"
              field="last_name"
              header="Last Name"
              filterMatchMode="startsWith"
              :sortable="true"
            >
              <template #filter="{ filterModel, filterCallback }">
                <InputText
                  v-model="filterModel.value"
                  type="text"
                  class="column-filter"
                  placeholder="Search by last name"
                  @keydown.enter="filterCallback()"
                />
              </template>
            </Column>
            <Column
              ref="created_at"
              field="created_at"
              header="Join Date"
              :sortable="true"
              class="wrap_content text-right"
            >
              <template #body="slotProps">
                <b>{{ formatDate(slotProps.data.created_at, 'DD MMMM YYYY') }}</b>
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>
      <ConfirmPopup group="confirm_delete"></ConfirmPopup>
    </div>
  </div>
</template>
<script lang="ts">
import DateManagement from '@/utils/core/date.management'
import { storeCore } from '@/store/index'
import { storeAccount } from '../store'
import { mapStores, mapActions } from 'pinia'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'AccountList',
  data() {
    return {
      loading: false,
      totalRecords: 0,
      items: [],
      filters: {
        email: { value: '', matchMode: 'contains' },
        first_name: { value: '', matchMode: 'contains' },
        last_name: { value: '', matchMode: 'contains' },
      },
      lazyParams: {},
      columns: [
        { field: 'email', header: 'Email' },
        { field: 'first_name', header: 'First Name' },
        { field: 'last_name', header: 'Last Name' },
        { field: 'created_at', header: 'Join Date' },
      ],
    }
  },
  computed: {
    ...mapStores(storeAccount),
  },
  mounted() {
    const dataTableRef = this.$refs.dt as { rows: number } | null
    this.lazyParams = {
      first: 0,
      rows: dataTableRef ? dataTableRef.rows : 20,
      sortField: '',
      sortOrder: '',
      filters: this.filters ? this.filters : {},
    }
    this.loading = false
    this.loadLazyData()
  },
  methods: {
    ...mapActions(storeCore, ['allowDispatch', 'UIToggleEditingData']),
    async accountDelete(event: MouseEvent, id: string) {
      this.$confirm.require({
        group: 'confirm_delete',
        header: 'Delete Confirmation',
        target: event.currentTarget as HTMLElement,
        message: 'Are you sure to delete this account?',
        acceptClass: 'p-button-danger',
        rejectClass: 'p-button-secondary',
        acceptLabel: 'Yes. Delete it!',
        rejectLabel: 'Cancel',
        accept: async () => {
          await this.accountStore.delete(id).then((response) => {
            this.$toast.add({
              severity: 'success',
              summary: 'Success',
              detail: response.payload.message,
              life: 3000,
            })
            this.loadLazyData()
          })
        },
        reject: () => {
          // callback to execute when user rejects the action
        },
      })
    },
    async loadLazyData() {
      this.loading = true
      await this.accountStore
        .list(this.lazyParams)
        .then((response) => {
          const data = response.payload.data
          const totalRecords = response.payload.totalRecords
          this.items = data
          this.totalRecords = totalRecords
          this.loading = false
        })
        .catch(() => {
          this.items = []
          this.totalRecords = 0
          this.loading = false
        })
    },
    formatDate(date: string, format: string) {
      return DateManagement.formatDate(date, format)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onPage(event: any) {
      this.lazyParams = event
      this.loadLazyData()
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSort(event: any) {
      this.lazyParams = event
      this.loadLazyData()
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onFilter(event: any) {
      this.lazyParams = event
      // this.lazyParams.filters = this.filters
      this.loadLazyData()
    },
    accountEdit(id: string) {
      this.$router.push({
        path: `/core/account/edit/${id}`,
        query: {
          id: id,
        },
      })
    },
    accountAdd() {
      this.$router.push({
        path: '/core/account/add',
      })
    },
  },
})
</script>
