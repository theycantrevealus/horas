<template>
  <div>
<!--    <Card class="card-fluid">-->
<!--      <template #header>-->
<!--        <Toolbar>-->
<!--          <template #left>-->
<!--            <Button-->
<!--              v-if="permission.btnAddUser !== undefined"-->
<!--              label="New"-->
<!--              icon="pi pi-plus"-->
<!--              class="mr-2 button-rounded"-->
<!--              @click="userAddForm"-->
<!--            />-->
<!--          </template>-->

<!--          <template #right>-->
<!--            <Button-->
<!--              label="Upload"-->
<!--              icon="pi pi-upload"-->
<!--              class="button-success button-rounded"-->
<!--            />-->
<!--          </template>-->
<!--        </Toolbar>-->
<!--      </template>-->
<!--      <template #content>-->
<!--        <DataTable-->
<!--          ref="dt"-->
<!--          v-model:filters="filters"-->
<!--          :value="users"-->
<!--          :lazy="true"-->
<!--          :paginator="true"-->
<!--          :rows="20"-->
<!--          :totalRecords="totalRecords"-->
<!--          :loading="loading"-->
<!--          filterDisplay="row"-->
<!--          :globalFilterFields="['first_name', 'last_name', 'email']"-->
<!--          responsiveLayout="scroll"-->
<!--          @page="onPage($event)"-->
<!--          @sort="onSort($event)"-->
<!--          @filter="onFilter($event)"-->
<!--        >-->
<!--          <Column header="Action">-->
<!--            <template #body="slotProps">-->
<!--              <span class="buttonset wrap_content">-->
<!--                <Button-->
<!--                  v-if="permission.btnEditUser !== undefined"-->
<!--                  class="button button-info button-sm button-raised"-->
<!--                  @click="userEditForm(slotProps.data.id)"-->
<!--                >-->
<!--                  <span class="material-icons">edit</span>-->
<!--                </Button>-->
<!--                <Button-->
<!--                  class="button button-warning button-sm button-raised"-->
<!--                  @click="userResetPass(slotProps.data.id)"-->
<!--                >-->
<!--                  <span class="material-icons">refresh</span>-->
<!--                </Button>-->
<!--                <Button-->
<!--                  v-if="permission.btnDeleteUser !== undefined"-->
<!--                  class="button button-danger button-sm button-raised"-->
<!--                  @click="userDelete($event, slotProps.data.id)"-->
<!--                >-->
<!--                  <span class="material-icons">delete</span>-->
<!--                </Button>-->
<!--              </span>-->
<!--            </template>-->
<!--          </Column>-->
<!--          <Column header="#">-->
<!--            <template #body="slotProps">{{ slotProps.data.autonum }}</template>-->
<!--          </Column>-->
<!--          <Column-->
<!--            ref="first_name"-->
<!--            field="first_name"-->
<!--            header="First Name"-->
<!--            filterMatchMode="startsWith"-->
<!--            :sortable="true"-->
<!--          >-->
<!--            <template #filter="{ filterModel, filterCallback }">-->
<!--              <InputText-->
<!--                v-model="filterModel.value"-->
<!--                type="text"-->
<!--                class="column-filter"-->
<!--                placeholder="Search by first name"-->
<!--                @keydown.enter="filterCallback()"-->
<!--              />-->
<!--            </template>-->
<!--          </Column>-->
<!--          <Column-->
<!--            ref="last_name"-->
<!--            field="last_name"-->
<!--            header="Last Name"-->
<!--            filterField="last_name"-->
<!--            filterMatchMode="contains"-->
<!--            :sortable="true"-->
<!--          >-->
<!--            <template #filter="{ filterModel, filterCallback }">-->
<!--              <InputText-->
<!--                v-model="filterModel.value"-->
<!--                type="text"-->
<!--                class="column-filter"-->
<!--                placeholder="Search by last name"-->
<!--                @keydown.enter="filterCallback()"-->
<!--              />-->
<!--            </template>-->
<!--          </Column>-->
<!--          <Column-->
<!--            ref="email"-->
<!--            field="email"-->
<!--            header="Email"-->
<!--            filterMatchMode="contains"-->
<!--            :sortable="true"-->
<!--          >-->
<!--            <template #filter="{ filterModel, filterCallback }">-->
<!--              <InputText-->
<!--                v-model="filterModel.value"-->
<!--                type="text"-->
<!--                class="column-filter"-->
<!--                placeholder="Search by email"-->
<!--                @keydown.enter="filterCallback()"-->
<!--              />-->
<!--            </template>-->
<!--            <template #body="slotProps">-->
<!--              <Button class="button-link">-->
<!--                <span class="material-icons">email</span>-->
<!--                {{ slotProps.data.email }}-->
<!--              </Button>-->
<!--            </template>-->
<!--          </Column>-->
<!--          <Column-->
<!--            ref="created_at"-->
<!--            field="created_at"-->
<!--            header="Join Date"-->
<!--            :sortable="true"-->
<!--            class="wrap_content text-right"-->
<!--          >-->
<!--            <template #body="slotProps">-->
<!--              <b>{{ formatDate(slotProps.data.created_at, 'DD MMMM YYYY') }}</b>-->
<!--            </template>-->
<!--          </Column>-->
<!--        </DataTable>-->
<!--      </template>-->
<!--      <template #footer></template>-->
<!--    </Card>-->
    <ConfirmPopup></ConfirmPopup>
  </div>
</template>

<script>
import DateManagement from '@/modules/function'
// import Card from 'primevue/card'
import ConfirmPopup from 'primevue/confirmpopup'
// import Toolbar from 'primevue/toolbar'
// import DataTable from 'primevue/datatable'
// import Column from 'primevue/column'
// import Button from 'primevue/button'
// import InputText from 'primevue/inputtext'
import UserService from '../service'

export default {
  components: {
    ConfirmPopup,
  },
  data() {
    return {
      loading: false,
      totalRecords: 0,
      users: [],
      filters: {
        first_name: { value: '', matchMode: 'contains' },
        last_name: { value: '', matchMode: 'contains' },
        email: { value: '', matchMode: 'contains' },
      },
      lazyParams: {},
      columns: [
        { field: 'first_name', header: 'First Name' },
        { field: 'last_name', header: 'Last Name' },
        { field: 'email', header: 'Email' },
        { field: 'created_at', header: 'Join Date' },
      ],
    }
  },
  mounted() {
    // this.lazyParams = {
    //   first: 0,
    //   rows: this.$refs.dt.rows,
    //   sortField: null,
    //   sortOrder: null,
    //   filters: this.filters,
    // }
    //
    // this.loadLazyData()
  },
  methods: {
    userAddForm() {
      this.$router.push('/user/add')
    },
    userEditForm(id) {
      this.$router.push(`/user/edit/${id}`)
    },
    userDelete(event, uid) {
      this.$confirm.require({
        target: event.currentTarget,
        message: 'Are you sure to delete this user?',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'button-danger',
        acceptLabel: 'Yes. Delete it!',
        rejectLabel: 'Cancel',
        accept: () => {
          this.loading = true
          UserService.deleteUser(id).then((data) => {
            if (data > 0) {
              this.loadLazyData()
            }
          })
        },
        reject: () => {
          // callback to execute when user rejects the action
        },
      })
    },
    formatDate(date, format) {
      return DateManagement.formatDate(date, format)
    },
    loadLazyData() {
      this.loading = true

      UserService.getList(this.lazyParams).then((data) => {
        this.users = data.response_data
        this.totalRecords = data.totalRecords
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
      this.lazyParams.filters = this.filters
      this.loadLazyData()
    },
  },
}
</script>
