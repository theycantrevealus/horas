<template>
  <div class="grid">
    <div class="col-12">
      <Card>
        <template #title>Account Authority Management</template>
        <template #content>
          <DataTable
            v-if="authorityListRaw.length > 0 && filters != undefined && DTTotalRecord != undefined"
            :value="authorityListRaw"
            :lazy="true"
            :paginator="true"
            :rows="20"
            v-model:filters="filters"
            ref="dt"
            stripedRows
            paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
            :rowsPerPageOptions="[20, 50, 100]"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
            :totalRecords="DTTotalRecord"
            :loading="DTLoading"
            @page="onPage($event)"
            @sort="onSort($event)"
            @filter="onFilter($event)"
            filterDisplay="row"
            :globalFilterFields="['name', 'created_at']"
            responsiveLayout="scroll"
          >
            <Column header="#" class="align-right">
              <template #body="slotProps">{{ slotProps.data.autonum }}</template>
            </Column>
            <Column header="Action">
              <template #body="slotProps">
                <span class="buttonset wrap_content">
                  <Button
                    v-if="permission.btnAccountAuthorityEdit !== undefined"
                    @click="accountAuthorityEdit(slotProps.data.uid)"
                    class="button button-info button-sm button-raised"
                  >
                    <span class="material-icons">edit</span> Edit
                  </Button>
                  <Button
                    v-if="permission.btnAccountAuthorityDelete !== undefined"
                    @click="accountAuthorityDelete(slotProps.data.uid)"
                    class="button button-danger button-sm button-raised"
                  >
                    <span class="material-icons">delete</span>
                  </Button>
                </span>
              </template>
            </Column>
            <Column
              field="name"
              header="Name"
              filterMatchMode="startsWith"
              ref="name"
              :sortable="true"
            >
              <template #filter="{ filterModel, filterCallback }">
                <InputText
                  type="text"
                  v-model="filterModel.value"
                  @keydown.enter="filterCallback()"
                  class="column-filter"
                  placeholder="Search by name"
                />
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
    Card, DataTable, Column, Button, InputText
  },
  data () {
    return {
      filters: {
        name: { value: '', matchMode: 'contains' }
      },
      lazyParams: {},
      columns: [
        { field: 'name', header: 'Name' },
        { field: 'created_at', header: 'Created Date' }
      ]
    }
  },
  mounted () {
    this.lazyParams = {
      first: 0,
      rows: 10,
      sortField: 'created_at',
      sortOrder: 1,
      filters: this.filters
    }
    this.$store.dispatch('authorityModule/fetchAuthority', this.lazyParams)
  },
  computed: {
    permission () {
      return this.$store.state.credential.permission
    },
    ...mapState('authorityModule', ['DTLoading', 'DTTotalRecord', 'items']),
    ...mapGetters({
      authorityListRaw: 'authorityModule/getAuthority'
    })
  },
  methods: {
    formatDate (date, format) {
      return DateManagement.formatDate(date, format)
    },
    onPage (event) {
      this.lazyParams = event
      this.$store.dispatch('authorityModule/fetchAuthority', this.lazyParams)
    },
    onSort (event) {
      this.lazyParams = event
      this.$store.dispatch('authorityModule/fetchAuthority', this.lazyParams)
    },
    onFilter (event) {
      this.lazyParams = event
      this.$store.dispatch('authorityModule/fetchAuthority', this.lazyParams)
    },
    accountAuthorityEdit (uid) {
      this.$router.push(`/authority/edit/:${uid}`)
    }
  }
}
</script>
