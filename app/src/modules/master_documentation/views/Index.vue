<template>
  <div>
    <Card class="card-fluid">
      <template #header>
        <Toolbar>
          <template #left>
            <Button
              v-if="permission.btnAddItem !== undefined"
              label="New" icon="pi pi-plus" class="mr-2 button-rounded"
              @click="itemAddForm" />
          </template>

          <template #right>

          </template>
        </Toolbar>
      </template>
      <template #content>
        <DataTable
ref="dt" v-model:filters="filters" :value="items" :lazy="true" :paginator="true" :rows="20"
          :totalRecords="totalRecords" :loading="loading" filterDisplay="row" :globalFilterFields="['title', 'creator', 'created_at']"
          responsiveLayout="scroll" @page="onPage($event)" @sort="onSort($event)"
          @filter="onFilter($event)">
          <Column header="Action">
            <template #body="slotProps">
              <span class="buttonset wrap_content">
                <Button
v-if="permission.btnEditItem !== undefined" class="button button-info button-sm button-raised"
                  @click="itemEditForm(slotProps.data.uid)">
                  <span class="material-icons">edit</span>
                </Button>
                <Button
v-if="permission.btnDeleteItem !== undefined" class="button button-danger button-sm button-raised"
                  @click="itemDelete($event, slotProps.data.uid)">
                  <span class="material-icons">delete</span>
                </Button>
              </span>
            </template>
          </Column>
          <Column header="#" class="align-right">
            <template #body="slotProps">{{ slotProps.data.autonum }}</template>
          </Column>
          <Column ref="title" field="title" header="Title" filterMatchMode="startsWith" :sortable="true">
            <template #filter="{ filterModel, filterCallback }">
              <InputText
v-model="filterModel.value" type="text" class="column-filter"
                placeholder="Search by title" @keydown.enter="filterCallback()" />
            </template>
          </Column>
          <Column ref="creator" field="creator" header="Creator" filterMatchMode="contains" :sortable="true">
            <template #filter="{ filterModel, filterCallback }">
              <InputText
v-model="filterModel.value" type="text" class="column-filter"
                placeholder="Search by name" @keydown.enter="filterCallback()" />
            </template>
          </Column>
          <Column
ref="created_at" field="created_at" header="Created Date" :sortable="true"
            class="wrap_content text-right">
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
import MasterDocumentationService from '@/modules/master_documentation/service'

export default {
  components: {
    DataTable, Column, InputText, Button, Card, Toolbar, ConfirmPopup
  },
  data () {
    return {
      loading: false,
      totalRecords: 0,
      items: [],
      filters: {
        title: { value: '', matchMode: 'contains' },
        creator: { value: '', matchMode: 'contains' }
      },
      lazyParams: {},
      columns: [
        { field: 'title', header: 'Title' },
        { field: 'creator', header: 'Creator' },
        { field: 'created_at', header: 'Created At' }
      ]
    }
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
      sortField: null,
      sortOrder: null,
      filters: this.filters
    }

    this.loadLazyData()
  },
  methods: {
    itemAddForm () {
      this.$router.push('/master/documentation/add')
    },
    itemEditForm (uid) {
      this.$router.push(`/master/documentation/edit/${uid}`)
    },
    itemDelete (event, uid) {
      this.$confirm.require({
        target: event.currentTarget,
        message: 'Are you sure to delete this documentation?',
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
      MasterDocumentationService.getItemList(this.lazyParams)
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
