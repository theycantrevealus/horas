<template>
  <div class="grid">
    <div class="col-12">
      <Card class="slim">
        <template #content>
          <Panel header="Account Management" :toggleable="false">
            <template #icons>
              <Button
                class="p-button-info p-button-rounded p-button-raised button-sm"
                @click="accountAdd"
                ><span class="material-icons">add</span> Add Account</Button
              >
            </template>
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
              <Column header="#" class="align-right">
                <template #body="slotProps">
                  <h6 class="d-inline-flex">#{{ slotProps.data.autonum }}</h6>
                </template>
              </Column>
              <Column header="Action">
                <template #body="slotProps">
                  <span class="p-buttonset wrap_content">
                    <Button
                      :disabled="!allowDispatch('btnAccountEdit')"
                      class="button p-button-success button-sm button-raised"
                      @click="accountEdit(slotProps.data.id)"
                    >
                      <span class="material-icons">edit</span> Edit
                    </Button>
                    <Button
                      :disabled="!allowDispatch('btnAccountDelete')"
                      class="button button-danger button-sm button-raised"
                      @click="accountDelete($event, slotProps.data.id)"
                    >
                      <span class="material-icons">delete</span>
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
          </Panel>
        </template>
      </Card>
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
    this.lazyParams = {
      first: 0,
      rows: this.$refs.dt.rows,
      sortField: '',
      sortOrder: '',
      filters: this.filters ? this.filters : {},
    }
    this.loading = false
    this.loadLazyData()
  },
  methods: {
    ...mapActions(storeCore, ['allowDispatch', 'UIToggleEditingData']),
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
    formatDate(date, format) {
      return DateManagement.formatDate(date, format)
    },
    onPage(event) {
      this.lazyParams = event
      this.loadLazyData()
    },
    onSort(event) {
      this.lazyParams = event
      this.loadLazyData()
    },
    onFilter(event) {
      this.lazyParams = event
      // this.lazyParams.filters = this.filters
      this.loadLazyData()
    },
    accountEdit(id) {
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
