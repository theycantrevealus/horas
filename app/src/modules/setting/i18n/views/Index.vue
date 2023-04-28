<template>
  <div class="grid">
    <div class="col-12">
      <Card class="slim">
        <template #content>
          <Panel
            :header="$t('i18n.label.index')"
            :toggleable="false"
          >
            <template #icons>
              <Button
                class="p-button-info p-button-rounded p-button-raised button-sm"
                @click="i18nAdd"
              ><span class="material-icons">add</span>
                {{ $t('i18n.button.add_language') }}</Button>
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
              :currentPageReportTemplate="`${$t('global.datatable.paginate.showing')} {first} ${$t('global.datatable.paginate.to')} {last} ${$t('global.datatable.paginate.of')} {totalRecords}`"
              :totalRecords="totalRecords"
              :loading="loading"
              filterDisplay="row"
              :globalFilterFields="['iso_2_digits', 'iso_3_digits', 'created_at']"
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
                  <h6 class="d-inline-flex">#{{ slotProps.data.autonum}}</h6>
                </template>
              </Column>
              <Column :header="$t('i18n.datatable.column.action')">
                <template #body="slotProps">
                  <span class="buttonset wrap_content">
                    <Button
                      v-if="permission.btni18nEdit !== undefined"
                      class="button p-button-success button-sm button-raised m-1"
                      @click="dataEdit(slotProps.data.id)"
                    >
                      <span class="material-icons">edit</span> {{ $t('i18n.datatable.button.edit') }}
                    </Button>
                    <Button
                      v-if="permission.btni18nDelete !== undefined"
                      class="button p-button-danger button-sm button-raised m-1"
                      @click="dataDelete($event, slotProps.data.id)"
                    >
                      <span class="material-icons">delete</span> {{ $t('i18n.datatable.button.delete') }}
                    </Button>
                  </span>
                </template>
              </Column>
              <Column
                ref="name"
                field="name"
                :header="$t('i18n.datatable.column.name.caption')"
                filterMatchMode="startsWith"
                :sortable="true"
              >
                <template #filter="{ filterModel, filterCallback }">
                  <InputText
                    v-model="filterModel.value"
                    type="text"
                    class="column-filter"
                    :placeholder="$t('i18n.datatable.column.name.search')"
                    @keydown.enter="filterCallback()"
                  />
                </template>
                <template #body="slotProps">
                  <div class="country-item">
                    <img :class="`flag flag-${slotProps.data.iso_2_digits.toLowerCase()}`" />
                  </div>
                  {{ slotProps.data.name }}
                </template>
              </Column>
              <Column
                ref="iso_2_digits"
                field="iso_2_digits"
                :header="$t('i18n.datatable.column.iso_2_digits.caption')"
                filterMatchMode="startsWith"
                :sortable="true"
              >
                <template #filter="{ filterModel, filterCallback }">
                  <InputText
                    v-model="filterModel.value"
                    type="text"
                    class="column-filter"
                    :placeholder="$t('i18n.datatable.column.iso_2_digits.search')"
                    @keydown.enter="filterCallback()"
                  />
                </template>
              </Column>
              <Column
                ref="iso_3_digits"
                field="iso_3_digits"
                :header="$t('i18n.datatable.column.iso_3_digits.caption')"
                filterMatchMode="startsWith"
                :sortable="true"
              >
                <template #filter="{ filterModel, filterCallback }">
                  <InputText
                    v-model="filterModel.value"
                    type="text"
                    class="column-filter"
                    :placeholder="$t('i18n.datatable.column.iso_3_digits.search')"
                    @keydown.enter="filterCallback()"
                  />
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
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Corei18nService from '@/modules/setting/i18n/service'

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
        name: { value: '', matchMode: 'contains' },
        iso_2_digits: { value: '', matchMode: 'contains' },
        iso_3_digits: { value: '', matchMode: 'contains' },
      },
      lazyParams: {},
      columns: [
        { field: 'name', header: 'Email' },
        { field: 'iso_2_digits', header: 'First Name' },
        { field: 'iso_3_digits', header: 'Last Name' },
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
      Corei18nService.i18nList(this.lazyParams)
        .then((response) => {
          const data = response.data.payload.data
          const totalRecords = response.data.payload.totalRecords
          this.items = data
          this.totalRecords = totalRecords
          this.loading = false
        })
        .error((e) => {
          //
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
    dataEdit(id) {
      this.$router.push({
        path: `/setting/i18n/edit/${id}`,
        params: { id: id },
      })
    },
    i18nAdd() {
      this.$router.push({
        path: '/setting/i18n/add',
      })
    },
  },
}
</script>
