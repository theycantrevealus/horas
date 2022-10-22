<template>
  <div class="grid">
    <div class="col-12">
      <Card>
        <template #title>Account Authority Management</template>
        <template #content>
          <DataTable
            v-if="authorityListRaw.length > 0 && filters != undefined && DTTotalRecord != undefined"
            ref="dt"
            v-model:filters="filters"
            :value="authorityListRaw"
            :lazy="true"
            :paginator="true"
            :rows="20"
            stripedRows
            paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
            :rowsPerPageOptions="[20, 50, 100]"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
            :totalRecords="DTTotalRecord"
            :loading="DTLoading"
            filterDisplay="row"
            :globalFilterFields="['name', 'created_at']"
            responsiveLayout="scroll"
            @page="onPage($event)"
            @sort="onSort($event)"
            @filter="onFilter($event)"
          >
            <Column
              header="#"
              class="align-right"
            >
              <template #body="slotProps">{{ slotProps.data.autonum }}</template>
            </Column>
            <Column header="Action">
              <template #body="slotProps">
                <span class="buttonset wrap_content">
                  <Button
                    v-if="permission.btnAccountAuthorityEdit !== undefined"
                    class="button button-info button-sm button-raised"
                    @click="accountAuthorityEdit(slotProps.data.id)"
                  >
                    <span class="material-icons">edit</span> Edit
                  </Button>
                  <Button
                    v-if="permission.btnAccountAuthorityDelete !== undefined"
                    class="button button-danger button-sm button-raised"
                    @click="accountAuthorityDelete(slotProps.data.id)"
                  >
                    <span class="material-icons">delete</span>
                  </Button>
                </span>
              </template>
            </Column>
            <Column
              ref="name"
              field="name"
              header="Name"
              filterMatchMode="startsWith"
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
    </div>
  </div>
</template>
<script>
import Card from 'primevue/card'
import DateManagement from '@/modules/function'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

import { mapGetters, mapState } from 'vuex'

export default {
  name: 'AccountAuthorityList',
  components: {
    Card,
    DataTable,
    Column,
    Button,
    InputText,
  },

  data() {
    return {
      filters: {
        name: { value: '', matchMode: 'contains' },
      },
      lazyParams: {},
      columns: [
        { field: 'name', header: 'Name' },
        { field: 'created_at', header: 'Created Date' },
      ],
    }
  },
  computed: {
    permission() {
      return this.$store.state.credential.permission
    },
    ...mapState('authorityModule', ['DTLoading', 'DTTotalRecord', 'items']),
    ...mapGetters({
      authorityListRaw: 'authorityModule/getAuthority',
    }),
  },
  async mounted() {
    this.lazyParams = {
      first: 0,
      rows: 10,
      sortField: 'created_at',
      sortOrder: 1,
      filters: this.filters,
    }
    await this.$store.dispatch(
      'authorityModule/fetchAuthority',
      this.lazyParams
    )
  },

  methods: {
    formatDate(date, format) {
      return DateManagement.formatDate(date, format)
    },
    async onPage(event) {
      this.lazyParams = event
      await this.$store.dispatch(
        'authorityModule/fetchAuthority',
        this.lazyParams
      )
    },
    async onSort(event) {
      this.lazyParams = event
      await this.$store.dispatch(
        'authorityModule/fetchAuthority',
        this.lazyParams
      )
    },
    async onFilter(event) {
      this.lazyParams = event
      await this.$store.dispatch(
        'authorityModule/fetchAuthority',
        this.lazyParams
      )
    },
    accountAuthorityEdit(id) {
      this.$router.push(`/authority/edit/:${id}`)
    },
  },
}
</script>
