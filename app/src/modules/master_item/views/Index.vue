<template>
  <div>
    <Card class="card-fluid">
      <template #header>
        <Toolbar>
          <template #left>
            <Button v-if="permission.btnAddItem !== undefined" @click="itemAddForm" label="New" icon="pi pi-plus"
              class="mr-2 button-rounded" />
          </template>

          <template #right>
            <Button label="Upload" icon="pi pi-upload" class="button-success button-rounded" />
          </template>
        </Toolbar>
      </template>
      <template #content>
        <DataTable :value="items" :lazy="true" :paginator="true" :rows="20" v-model:filters="filters" ref="dt"
          :totalRecords="totalRecords" :loading="loading" @page="onPage($event)" @sort="onSort($event)"
          @filter="onFilter($event)" filterDisplay="row" :globalFilterFields="['first_name', 'last_name', 'email']"
          responsiveLayout="scroll">
          <Column header="Action">
            <template #body="slotProps">
              <span class="buttonset wrap_content">
                <Button v-if="permission.btnEditItem !== undefined" @click="itemEditForm(slotProps.data.uid)"
                  class="button button-info button-sm button-raised">
                  <span class="material-icons">edit</span>
                </Button>
                <Button v-if="permission.btnDeleteItem !== undefined" @click="itemDelete($event, slotProps.data.uid)"
                  class="button button-danger button-sm button-raised">
                  <span class="material-icons">delete</span>
                </Button>
              </span>
            </template>
          </Column>
          <Column header="#" class="align-right">
            <template #body="slotProps">{{ slotProps.data.autonum }}</template>
          </Column>
          <Column field="code" header="Code" filterMatchMode="startsWith" ref="first_name" :sortable="true">
            <template #filter="{ filterModel, filterCallback }">
              <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()"
                class="column-filter" placeholder="Search by code" />
            </template>
          </Column>
          <Column field="name" header="Name" filterField="name" filterMatchMode="contains" ref="last_name"
            :sortable="true">
            <template #filter="{ filterModel, filterCallback }">
              <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()"
                class="column-filter" placeholder="Search by name" />
            </template>
          </Column>
          <Column field="created_at" header="Created Date" ref="created_at" :sortable="true"
            class="wrap_content text-right">
            <template #body="slotProps">
              <b>{{ this.formatDate(slotProps.data.created_at, 'DD MMMM YYYY') }}</b>
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
import MasterItemService from '@/modules/master_item/service'

export default {
  components: {
    DataTable, Column, InputText, Button, Card, Toolbar, ConfirmPopup
  },
  computed: {
    permission () {
      return this.$store.state.credential.permission
    }
  },
  data () {
    return {
      loading: false,
      totalRecords: 0,
      items: [],
      filters: {
        code: { value: '', matchMode: 'contains' },
        name: { value: '', matchMode: 'contains' }
      },
      lazyParams: {},
      columns: [
        { field: 'code', header: 'Code' },
        { field: 'name', header: 'Name' },
        { field: 'created_at', header: 'Join Date' }
      ]
    }
  },
  mounted () {
    this.lazyParams = {
      first: 0,
      rows: this.$refs.dt.rows,
      sortField: null,
      sortOrder: null,
      filters: this.filters
    }

    this.loadLazyData()
  },
  methods: {
    itemAddForm () {
      this.$router.push('/master/item/add')
    },
    itemEditForm (uid) {
      this.$router.push(`/master/item/edit/${uid}`)
    },
    itemDelete (event, uid) {
      this.$confirm.require({
        target: event.currentTarget,
        message: 'Are you sure to delete this item?',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'button-danger',
        acceptLabel: 'Yes. Delete it!',
        rejectLabel: 'Cancel',
        accept: () => {
          this.loading = true
          //   UserService.deleteUser(uid).then(data => {
          //     if (data > 0) {
          //       this.loadLazyData()
          //     }
          //   })
        },
        reject: () => {
          // Reject
        }
      })
    },
    formatDate (date, format) {
      return DateManagement.formatDate(date, format)
    },
    loadLazyData () {
      this.loading = true

      MasterItemService.getItemList(this.lazyParams)
        .then(data => {
          this.items = data.response_data
          this.totalRecords = data.totalRecords
          this.loading = false
        })
    },
    onPage (event) {
      this.lazyParams = event
      this.loadLazyData()
    },
    onSort (event) {
      this.lazyParams = event
      this.loadLazyData()
    },
    onFilter () {
      this.lazyParams.filters = this.filters
      this.loadLazyData()
    }
  }
}
</script>
