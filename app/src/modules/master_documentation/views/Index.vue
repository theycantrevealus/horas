<template>
  <div>
    <Card class="card-fluid">
      <template #header>
        <Toolbar>
          <template #left>
            <Button
              v-if="permission.btnAddItem !== undefined"
              @click="itemAddForm"
              label="New"
              icon="pi pi-plus"
              class="p-mr-2 p-button-rounded"
            />
          </template>

          <template #right>

          </template>
        </Toolbar>
      </template>
      <template #content>
        <DataTable
          :value="items"
          :lazy="true"
          :paginator="true"
          :rows="20"
          v-model:filters="filters"
          ref="dt"
          :totalRecords="totalRecords"
          :loading="loading"
          @page="onPage($event)"
          @sort="onSort($event)"
          @filter="onFilter($event)"
          filterDisplay="row"
          :globalFilterFields="['title', 'creator', 'created_at']"
          responsiveLayout="scroll"
        >
          <Column header="Action">
            <template #body="slotProps">
              <span class="p-buttonset wrap_content">
                <Button
                  v-if="permission.btnEditItem !== undefined"
                  @click="itemEditForm(slotProps.data.uid)"
                  class="p-button p-button-info p-button-sm p-button-raised"
                >
                  <span class="material-icons">edit</span>
                </Button>
                <Button
                  v-if="permission.btnDeleteItem !== undefined"
                  @click="itemDelete($event, slotProps.data.uid)"
                  class="p-button p-button-danger p-button-sm p-button-raised"
                >
                  <span class="material-icons">delete</span>
                </Button>
              </span>
            </template>
          </Column>
          <Column header="#" class="p-align-right">
            <template #body="slotProps">{{ slotProps.data.autonum }}</template>
          </Column>
          <Column
            field="title"
            header="Title"
            filterMatchMode="startsWith"
            ref="title"
            :sortable="true"
          >
            <template #filter="{ filterModel, filterCallback }">
              <InputText
                type="text"
                v-model="filterModel.value"
                @keydown.enter="filterCallback()"
                class="p-column-filter"
                placeholder="Search by title"
              />
            </template>
          </Column>
          <Column
            field="creator"
            header="Creator"
            filterMatchMode="contains"
            ref="creator"
            :sortable="true"
          >
            <template #filter="{ filterModel, filterCallback }">
              <InputText
                type="text"
                v-model="filterModel.value"
                @keydown.enter="filterCallback()"
                class="p-column-filter"
                placeholder="Search by name"
              />
            </template>
          </Column>
          <Column
            field="created_at"
            header="Created Date"
            ref="created_at"
            :sortable="true"
            class="wrap_content p-text-right"
          >
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
import MasterDocumentationService from '@/modules/master_documentation/service'

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
      console.log(uid)
      this.$confirm.require({
        target: event.currentTarget,
        message: 'Are you sure to delete this documentation?',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
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
