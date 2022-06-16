<template>
  <div class="p-grid">
    <div class="p-col-12">
      <Card>
        <template #content>
          <Panel header="Account Management" :toggleable="false">
            <template #icons>
              <Button @click="accountAdd" class="p-button p-button-info p-button-sm p-button-raised"><span
                  class="material-icons">add</span>
                Add</Button>
            </template>
            <DataTable :value="items" :lazy="true" :paginator="true" :rows="20" v-model:filters="filters" ref="dt"
              stripedRows
              paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
              :rowsPerPageOptions="[20, 50, 100]"
              currentPageReportTemplate="Showing {first} to {last} of {totalRecords}" :totalRecords="totalRecords"
              :loading="loading" @page="onPage($event)" @sort="onSort($event)" @filter="onFilter($event)"
              filterDisplay="row" :globalFilterFields="['email', 'first_name', 'last_name', 'created_at']"
              responsiveLayout="scroll">
              <Column header="#" class="p-align-right">
                <template #body="slotProps">
                  <h6 class="p-d-inline-flex">#{{ slotProps.data.autonum
                  }}</h6>
                </template>
              </Column>
              <Column header="Action">
                <template #body="slotProps">
                  <span class="p-buttonset wrap_content">
                    <Button v-if="permission.btnAccountEdit !== undefined" @click="accountEdit(slotProps.data.uid)"
                      class="p-button p-button-info p-button-sm p-button-raised">
                      <span class="material-icons">edit</span> Edit
                    </Button>
                    <Button v-if="permission.btnAccountDelete !== undefined"
                      @click="accountDelete($event, slotProps.data.uid)"
                      class="p-button p-button-danger p-button-sm p-button-raised">
                      <span class="material-icons">delete</span>
                    </Button>
                  </span>
                </template>
              </Column>
              <Column field="email" header="Email" filterMatchMode="startsWith" ref="email" :sortable="true">
                <template #filter="{ filterModel, filterCallback }">
                  <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()"
                    class="p-column-filter" placeholder="Search by email" />
                </template>
              </Column>
              <Column field="first_name" header="First Name" filterMatchMode="startsWith" ref="first_name"
                :sortable="true">
                <template #filter="{ filterModel, filterCallback }">
                  <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()"
                    class="p-column-filter" placeholder="Search by first name" />
                </template>
              </Column>
              <Column field="last_name" header="Last Name" filterMatchMode="startsWith" ref="last_name"
                :sortable="true">
                <template #filter="{ filterModel, filterCallback }">
                  <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()"
                    class="p-column-filter" placeholder="Search by last name" />
                </template>
              </Column>
              <Column field="created_at" header="Join Date" ref="created_at" :sortable="true"
                class="wrap_content p-text-right">
                <template #body="slotProps">
                  <b>{{ this.formatDate(slotProps.data.created_at, 'DD MMMM YYYY') }}</b>
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
    Card, DataTable, Column, InputText, Button, Panel
  },
  computed: {
    permission () {
      return this.$store.state.credential.permission
    }
  },
  mounted () {
    this.lazyParams = {
      first: 0,
      rows: this.$refs.dt.rows,
      sortField: '',
      sortOrder: '',
      filters: this.filters
    }
    this.loading = false
    this.loadLazyData()
  },
  data () {
    return {
      loading: false,
      totalRecords: 0,
      items: [],
      filters: {
        email: { value: '', matchMode: 'contains' },
        first_name: { value: '', matchMode: 'contains' },
        last_name: { value: '', matchMode: 'contains' }
      },
      lazyParams: {},
      columns: [
        { field: 'email', header: 'Email' },
        { field: 'first_name', header: 'First Name' },
        { field: 'last_name', header: 'Last Name' },
        { field: 'created_at', header: 'Join Date' }
      ]
    }
  },
  methods: {
    loadLazyData () {
      this.loading = true
      AccountService.getAccountList(this.lazyParams)
        .then(response => {
          const data = response.data.list
          const totalRecords = response.data.totalRecords
          this.items = data
          this.totalRecords = totalRecords
          this.loading = false
        })
    },
    formatDate (date, format) {
      return DateManagement.formatDate(date, format)
    },
    onPage (event) {
      this.lazyParams = event
      this.loadLazyData()
    },
    onSort (event) {
      this.lazyParams = event
      this.loadLazyData()
    },
    onFilter (event) {
      this.lazyParams = event
      // this.lazyParams.filters = this.filters
      this.loadLazyData()
    },
    accountEdit (uid) {
      this.$router.push({
        path: `/account/edit/${uid}`,
        query: {
          uid: uid
        }
      })
    },
    accountAdd () {
      this.$router.push({
        path: '/account/add'
      })
    }
  }
}
</script>
