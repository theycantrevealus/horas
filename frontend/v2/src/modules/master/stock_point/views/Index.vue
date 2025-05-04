<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="grid">
    <div class="col-12">
      <Card class="slim">
        <template #header>
          <Panel :toggleable="false">
            <template #header>
              <p class="font-bold text-2xl w-10">
                {{ $t('master.stock_point.label.index.title.caption') }}
              </p>
            </template>
            <template #icons>
              <Button
                class="p-button-info p-button-rounded p-button-raised button-sm"
                @click="dataAdd"
                ><span class="material-icons">add</span>
                {{ $t('master.stock_point.button.index.add.caption') }}</Button
              >
            </template>
          </Panel>
        </template>
        <template #content>
          <DataTable
            ref="dt"
            v-model:filters="ui.table.lazyParams.filters"
            :value="ui.table.data"
            :lazy="true"
            :paginator="true"
            :rows="20"
            stripedRows
            paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
            :rowsPerPageOptions="[20, 50, 100]"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
            :totalRecords="ui.table.totalRecords"
            :loading="ui.table.loading"
            filterDisplay="row"
            :globalFilterFields="['code', 'name', 'created_at']"
            responsiveLayout="scroll"
            @page="onPage($event)"
            @sort="onSort($event)"
            @filter="onFilter($event)"
          >
            <Column header="ID" class="align-right">
              <template #body="slotProps">
                <h6 class="d-inline-flex">#{{ slotProps.data.autonum }}</h6>
              </template>
            </Column>
            <Column :header="$t('master.stock_point.datatable.column.action.caption')">
              <template #body="slotProps">
                <span class="p-buttonset wrap_content">
                  <Button
                    :disabled="!allowDispatch('btnMasterStockPointEdit')"
                    class="p-button-info p-button-sm p-button-raised"
                    @click="dataEdit(slotProps.data.id)"
                  >
                    <span class="material-icons">edit</span>
                    {{ $t('master.stock_point.datatable.button.edit.caption') }}
                  </Button>
                  <Button
                    :disabled="!allowDispatch('btnMasterStockPointDelete')"
                    class="p-button-danger p-button-sm p-button-raised"
                    @click="dataDelete($event, slotProps.data.id)"
                  >
                    <span class="material-icons">delete</span>
                    {{ $t('master.stock_point.datatable.button.delete.caption') }}
                  </Button>
                </span>
              </template>
            </Column>
            <Column
              ref="code"
              field="code"
              :header="$t('master.stock_point.datatable.column.code.caption')"
              filterMatchMode="startsWith"
              :sortable="true"
            >
              <template #filter="{ filterModel, filterCallback }">
                <InputText
                  v-model="filterModel.value"
                  type="text"
                  class="column-filter"
                  :placeholder="$t('master.stock_point.datatable.column.code.placeholder')"
                  @keydown.enter="filterCallback()"
                />
              </template>
            </Column>
            <Column
              ref="name"
              field="name"
              :header="$t('master.stock_point.datatable.column.name.caption')"
              filterMatchMode="startsWith"
              :sortable="true"
            >
              <template #filter="{ filterModel, filterCallback }">
                <InputText
                  v-model="filterModel.value"
                  type="text"
                  class="column-filter"
                  :placeholder="$t('master.stock_point.datatable.column.name.placeholder')"
                  @keydown.enter="filterCallback()"
                />
              </template>
            </Column>
            <Column
              ref="created_at"
              field="created_at"
              :header="$t('master.stock_point.datatable.column.created_at.caption')"
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
      <ConfirmPopup group="confirm_delete"></ConfirmPopup>
    </div>
  </div>
</template>
<script lang="ts">
import DateManagement from '@/utils/core/date.management'
import { storeCore } from '@/store/index'
import { storeMasterStockPoint } from '@/modules/master/stock_point/store'
import { mapStores, mapActions } from 'pinia'
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'MasterStockPointList',
  data() {
    return {
      ui: {
        table: {
          loading: true,
          totalRecords: 0,
          data: [],
          lazyParams: {
            first: 0,
            rows: 0,
            sortField: '',
            sortOrder: '',
            filters: {
              code: { value: '', matchMode: 'contains' },
              name: { value: '', matchMode: 'contains' },
            },
          },
          columns: [
            { field: 'code', header: this.$t('master.stock_point.datatable.column.code.caption') },
            { field: 'name', header: this.$t('master.stock_point.datatable.column.name.caption') },
            {
              field: 'created_at',
              header: this.$t('master.stock_point.datatable.column.created_at.caption'),
            },
          ],
        },
      },
    }
  },
  computed: {
    ...mapStores(storeMasterStockPoint),
  },
  mounted() {
    this.ui.table.lazyParams.rows = this.$refs.dt.rows
    this.loadLazyData()
  },
  methods: {
    ...mapActions(storeCore, ['allowDispatch', 'UIToggleEditingData']),
    formatDate(date: string, format: string) {
      return DateManagement.formatDate(date, format)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onPage(event: any) {
      this.ui.table.lazyParams = event
      this.loadLazyData()
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSort(event: any) {
      this.ui.table.lazyParams = event
      this.loadLazyData()
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onFilter(event: any) {
      this.ui.table.lazyParams = event
      this.loadLazyData()
    },
    async loadLazyData() {
      this.ui.table.loading = true
      await this.masterStockPointStore
        .list(this.ui.table.lazyParams)
        .then((response) => {
          this.ui.table.data = response.payload.data
          this.ui.table.totalRecords = response.payload.totalRecords
          this.ui.table.loading = false
        })
        .catch(() => {
          this.ui.table.data = []
          this.ui.table.totalRecords = 0
          this.ui.table.loading = false
        })
    },
    async dataEdit(id: string) {
      this.$router.push({
        path: `/master/stock_point/edit/${id}`,
        query: {
          id: id,
        },
      })
    },
    async dataDelete(event: MouseEvent, id: string) {
      const confirmation = this.$confirm
      confirmation.require({
        group: 'confirm_delete',
        target: event.currentTarget as HTMLElement,
        header: 'Confirmation',
        message: `Delete data?`,
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        rejectClass: 'p-button-secondary',
        acceptIcon: 'pi pi-check-circle',
        acceptLabel: 'Yes',
        rejectLabel: 'Abort',
        rejectIcon: 'pi pi-times-circle',
        accept: async () => {
          await this.masterStockPointStore.delete(id).then(async () => {
            await this.loadLazyData()
          })
        },
        reject: () => {
          //
        },
      })
    },
    async dataAdd() {
      this.$router.push({
        path: '/master/stock_point/add',
      })
    },
  },
})
</script>
