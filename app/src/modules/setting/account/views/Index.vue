<template>
  <div class="grid">
    <div class="col-12">
      <Card class="slim">
        <template #content>
          <Panel
            header="Account Management"
            :toggleable="false"
          >
            <template #icons>
              <Button
                class="p-button-info p-button-rounded p-button-raised button-sm"
                @click="accountAdd"
              ><span class="material-icons">add</span>
                Add Account</Button>
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
                      v-if="permission.btnAccountEdit !== undefined"
                      class="button p-button-success button-sm button-raised"
                      @click="accountEdit(slotProps.data.id)"
                    >
                      <span class="material-icons">edit</span> Edit
                    </Button>
                    <Button
                      v-if="permission.btnAccountDelete !== undefined"
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
<script>
import DateManagement from '@/modules/function'
import Card from 'primevue/card'
import Panel from 'primevue/panel'
// import ConfirmPopup from 'primevue/confirmpopup'
// import Toolbar from 'primevue/toolbar'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import AccountService from '@/modules/setting/account/service'

export default {
  name: 'AccountList',
  components: {
    Card,
    DataTable,
    Column,
    InputText,
    Button,
    Panel,
  },
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
    permission() {
      return this.$store.state.credential.permission
    },
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
    loadLazyData() {
      this.loading = true
      AccountService.getAccountList(JSON.stringify(this.lazyParams)).then((response) => {
        const data = response.data.payload.data
        const totalRecords = response.data.totalRecords
        this.items = data
        this.totalRecords = totalRecords
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
        path: `/account/edit/${id}`,
        query: {
          id: id,
        },
      })
    },
    accountAdd() {
      this.$router.push({
        path: '/account/add',
      })
    },
  },
}
</script>
