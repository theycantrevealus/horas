<template>
  <div>
    <Card class="card-fluid">
      <template #header>
        <Toolbar>
          <template #left>
            <Button
              v-if="permission.btnAddUser !== undefined"
              @click="userAddForm"
              label="New"
              icon="pi pi-plus"
              class="mr-2 button-rounded"
            />
          </template>

          <template #right>
            <Button label="Upload" icon="pi pi-upload" class="button-success button-rounded" />
          </template>
        </Toolbar>
      </template>
      <template #content>
        <DataTable
          :value="users"
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
          :globalFilterFields="['first_name', 'last_name', 'email']"
          responsiveLayout="scroll"
        >
          <Column header="Action">
            <template #body="slotProps">
              <span class="buttonset wrap_content">
                <Button
                  v-if="permission.btnEditUser !== undefined"
                  @click="userEditForm(slotProps.data.uid)"
                  class="button button-info button-sm button-raised"
                >
                  <span class="material-icons">edit</span>
                </Button>
                <Button
                  @click="userResetPass(slotProps.data.uid)"
                  class="button button-warning button-sm button-raised"
                >
                  <span class="material-icons">refresh</span>
                </Button>
                <Button
                  v-if="permission.btnDeleteUser !== undefined"
                  @click="userDelete($event, slotProps.data.uid)"
                  class="button button-danger button-sm button-raised"
                >
                  <span class="material-icons">delete</span>
                </Button>
              </span>
            </template>
          </Column>
          <Column header="#">
            <template #body="slotProps">{{ slotProps.data.autonum }}</template>
          </Column>
          <Column
            field="first_name"
            header="First Name"
            filterMatchMode="startsWith"
            ref="first_name"
            :sortable="true"
          >
            <template #filter="{ filterModel, filterCallback }">
              <InputText
                type="text"
                v-model="filterModel.value"
                @keydown.enter="filterCallback()"
                class="column-filter"
                placeholder="Search by first name"
              />
            </template>
          </Column>
          <Column
            field="last_name"
            header="Last Name"
            filterField="last_name"
            filterMatchMode="contains"
            ref="last_name"
            :sortable="true"
          >
            <template #filter="{ filterModel, filterCallback }">
              <InputText
                type="text"
                v-model="filterModel.value"
                @keydown.enter="filterCallback()"
                class="column-filter"
                placeholder="Search by last name"
              />
            </template>
          </Column>
          <Column
            field="email"
            header="Email"
            filterMatchMode="contains"
            ref="email"
            :sortable="true"
          >
            <template #filter="{ filterModel, filterCallback }">
              <InputText
                type="text"
                v-model="filterModel.value"
                @keydown.enter="filterCallback()"
                class="column-filter"
                placeholder="Search by email"
              />
            </template>
            <template #body="slotProps">
              <Button class="button-link">
                <span class="material-icons">email</span>
                {{ slotProps.data.email }}
              </Button>
            </template>
          </Column>
          <Column
            field="created_at"
            header="Join Date"
            ref="created_at"
            :sortable="true"
            class="wrap_content text-right"
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
import UserService from '../service'

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
      users: [],
      filters: {
        first_name: { value: '', matchMode: 'contains' },
        last_name: { value: '', matchMode: 'contains' },
        email: { value: '', matchMode: 'contains' }
      },
      lazyParams: {},
      columns: [
        { field: 'first_name', header: 'First Name' },
        { field: 'last_name', header: 'Last Name' },
        { field: 'email', header: 'Email' },
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
    userAddForm () {
      this.$router.push('/user/add')
    },
    userEditForm (uid) {
      this.$router.push(`/user/edit/${uid}`)
    },
    userDelete (event, uid) {
      this.$confirm.require({
        target: event.currentTarget,
        message: 'Are you sure to delete this user?',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'button-danger',
        acceptLabel: 'Yes. Delete it!',
        rejectLabel: 'Cancel',
        accept: () => {
          this.loading = true
          UserService.deleteUser(uid).then(data => {
            if (data > 0) {
              this.loadLazyData()
            }
          })
        },
        reject: () => {
          // callback to execute when user rejects the action
        }
      })
    },
    formatDate (date, format) {
      return DateManagement.formatDate(date, format)
    },
    loadLazyData () {
      this.loading = true

      UserService.getList(this.lazyParams)
        .then(data => {
          this.users = data.response_data
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
