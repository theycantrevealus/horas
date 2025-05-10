<template>
  <div class="grid">
    <div class="col-12">
      <Card class="slim">
        <template #header>
          <Panel :toggleable="false">
            <template #header>
              <p class="font-bold text-2xl w-10">{{ $t('i18n.label.title.caption') }}</p>
            </template>
            <template #icons>
              <Button
                :disabled="!allowDispatch('btni18nAdd')"
                class="p-button-info p-button-rounded p-button-raised button-sm"
                @click="i18nAdd"
                ><span class="material-icons">add</span> {{ $t('i18n.button.add.caption') }}</Button
              >
            </template>
          </Panel>
        </template>
        <template #content>
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
            :globalFilterFields="['iso_2_digits', 'iso_3_digits', 'name', 'created_at']"
            responsiveLayout="scroll"
            @page="onPage($event)"
            @sort="onSort($event)"
            @filter="onFilter($event)"
          >
            <Column header="ID" class="align-right wrap_content">
              <template #body="slotProps">
                <h6 class="d-inline-flex">#{{ slotProps.data.autonum }}</h6>
              </template>
            </Column>
            <Column class="wrap_content" :header="$t('i18n.datatable.column.action.caption')">
              <template #body="slotProps">
                <span class="p-buttonset wrap_content">
                  <Button
                    :disabled="!allowDispatch('btni18nEdit')"
                    class="p-button-info p-button-sm p-button-raised"
                    @click="i18nEdit(slotProps.data.id)"
                  >
                    <span class="material-icons">edit</span>
                    {{ $t('i18n.datatable.button.edit.caption') }}
                  </Button>
                  <Button
                    :disabled="!allowDispatch('btni18nDelete')"
                    class="p-button-danger p-button-sm p-button-raised"
                    @click="i18nDelete($event, slotProps.data.id)"
                  >
                    <span class="material-icons">delete</span>
                    {{ $t('i18n.datatable.button.delete.caption') }}
                  </Button>
                </span>
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
                  :placeholder="$t('i18n.datatable.column.iso_2_digits.placeholder')"
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
                  :placeholder="$t('i18n.datatable.column.iso_3_digits.placeholder')"
                  @keydown.enter="filterCallback()"
                />
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
                  :placeholder="$t('i18n.datatable.column.name.placeholder')"
                  @keydown.enter="filterCallback()"
                />
              </template>
            </Column>
            <Column
              ref="created_at"
              field="created_at"
              :header="$t('i18n.datatable.column.created_at.caption')"
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
<script lang="ts">
import DateManagement from '@/utils/core/date.management'
import { storeCore } from '@/store/index'
import { storei18n } from '../store'
import { mapStores, mapActions } from 'pinia'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'i18nList',
  data() {
    return {
      loading: false,
      totalRecords: 0,
      items: [],
      filters: {
        iso_2_digits: { value: '', matchMode: 'contains' },
        iso_3_digits: { value: '', matchMode: 'contains' },
        name: { value: '', matchMode: 'contains' },
      },
      lazyParams: {},
      columns: [
        { field: 'iso_2_digits', header: this.$t('i18n.datatable.column.iso_2_digits.caption') },
        { field: 'iso_3_digits', header: this.$t('i18n.datatable.column.iso_3_digits.caption') },
        { field: 'name', header: this.$t('i18n.datatable.column.name.caption') },
        { field: 'created_at', header: this.$t('i18n.datatable.column.created_at.caption') },
      ],
    }
  },
  computed: {
    ...mapStores(storei18n),
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
    ...mapActions(storeCore, ['allowDispatch', 'UIToggleEditingData']),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async i18nDelete(event: any, id: string) {},
    async loadLazyData() {
      this.loading = true
      await this.i18nStore
        .list(this.lazyParams)
        .then((response) => {
          const data = response.payload.data
          const totalRecords = response.payload.totalRecords
          this.items = data
          this.totalRecords = totalRecords
          this.loading = false
        })
        .catch(() => {
          this.items = []
          this.totalRecords = 0
          this.loading = false
        })
    },
    formatDate(date: string, format: string) {
      return DateManagement.formatDate(date, format)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onPage(event: any) {
      this.lazyParams = event
      this.loadLazyData()
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSort(event: any) {
      this.lazyParams = event
      this.loadLazyData()
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onFilter(event: any) {
      this.lazyParams = event
      // this.lazyParams.filters = this.filters
      this.loadLazyData()
    },
    i18nEdit(id: string) {
      this.$router.push({
        path: `/core/i18n/edit/${id}`,
        query: {
          id: id,
        },
      })
    },
    i18nAdd() {
      this.$router.push({
        path: '/core/i18n/add',
      })
    },
  },
})
</script>
