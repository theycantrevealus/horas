<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div>
    <Card class="card-fluid">
      <template #header>
        <div>
          <Toolbar>
            <template #start>
              <Button
                :disabled="!allowDispatch('btnAddMasterItemBrand')"
                :label="$t('master_item_brand.button.add_item_brand')"
                icon="pi pi-plus"
                class="mr-2 button-rounded"
                @click="add"
              />
            </template>

            <template #end> </template>
          </Toolbar>
        </div>
      </template>
      <template #content>
        <DataTable
          ref="dt"
          v-model:filters="filters"
          :value="items"
          :lazy="true"
          :paginator="true"
          :rows="20"
          :rowsPerPageOptions="[5, 10, 20, 50]"
          :totalRecords="totalRecords"
          :loading="loading"
          filterDisplay="row"
          :globalFilterFields="['name', 'group', 'parent', 'value']"
          responsiveLayout="scroll"
          @page="onPage($event)"
          @sort="onSort($event)"
          @filter="onFilter()"
        >
          <Column header="#" class="text-left wrap_content">
            <template #body="slotProps">
              <strong class="d-inline-flex">
                <span class="material-icons-outlined material-symbols-outlined">tag</span>
                {{ slotProps.data['autonum'] ?? slotProps.data['id'] }}
              </strong>
            </template>
          </Column>
          <Column
            :header="$t('master_item_brand.datatable.column.action.caption')"
            class="text-right wrap_content"
          >
            <template #body="slotProps">
              <span class="p-buttonset">
                <Button
                  class="p-button-info p-button-sm p-button-raised"
                  :disabled="!allowDispatch('btnEditMasterItemBrand')"
                  @click="editMasterItemBrand(slotProps.data.id)"
                >
                  <span class="material-icons">edit</span> Edit
                </Button>
                <Button
                  class="p-button-danger p-button-sm p-button-raised"
                  :disabled="!allowDispatch('btnDeleteMasterItemBrand')"
                  @click="deleteMasterItemBrand($event, slotProps.data.id)"
                >
                  <span class="material-icons">delete</span> Delete
                </Button>
              </span>
            </template>
          </Column>
          <Column
            ref="code"
            field="code"
            :header="$t('master_item_brand.datatable.column.code.caption')"
            filterMatchMode="startsWith"
            :sortable="true"
            style="width: 12.5% !important"
          >
            <template #filter="{ filterModel, filterCallback }">
              <InputText
                v-model="filterModel.value"
                type="text"
                class="column-filter"
                :placeholder="$t('master_item_brand.datatable.column.code.search')"
                @keydown.enter="filterCallback()"
              />
            </template>
            <template #body="slotProps">
              <label class="currency-label text-600">{{ slotProps.data.code }}</label>
            </template>
          </Column>
          <Column
            ref="name"
            field="name"
            :header="$t('master_item_brand.datatable.column.name.caption')"
            filterField="name"
            filterMatchMode="contains"
            :sortable="true"
          >
            <template #filter="{ filterModel, filterCallback }">
              <InputText
                v-model="filterModel.value"
                type="text"
                class="column-filter"
                :placeholder="$t('master_item_brand.datatable.column.name.search')"
                @keydown.enter="filterCallback()"
              />
            </template>
            <template #body="slotProps">
              <b>{{ slotProps.data.name }}</b>
            </template>
          </Column>
          <Column
            ref="created_at"
            class="text-right wrap_content"
            field="created_at"
            :header="$t('master_item_brand.datatable.column.created_at.caption')"
            :sortable="true"
          >
            <template #body="slotProps">
              <b>{{ formatDate(slotProps.data['created_at'], 'DD MMMM YYYY') }}</b>
            </template>
          </Column>
          <template #footer>
            <div class="text-xs">
              <NumberLabel
                class="text-cyan-600"
                lang="ID"
                code="ID"
                currency="IDR"
                :number="lazyParams.page > 0 ? lazyParams.first + 1 : 1"
                :decimal="0"
              />
              -
              <NumberLabel
                class="text-cyan-600"
                lang="ID"
                code="ID"
                currency="IDR"
                :number="
                  lazyParams.first > 0 ? lazyParams.first + lazyParams.rows : lazyParams.rows
                "
                :decimal="0"
              />
              /
              <NumberLabel
                class="text-cyan-600"
                lang="ID"
                code="ID"
                currency="IDR"
                :number="totalRecords ? totalRecords : 0"
                :decimal="0"
              />
              rows
            </div>
          </template>
        </DataTable>
      </template>
      <template #footer></template>
    </Card>
    <ConfirmPopup group="delete_confirm_master_item_brand" />
    <DynamicDialog />
  </div>
</template>
<script lang="ts">
import DateManagement from '@/utils/core/date.ts'
import { defineAsyncComponent } from 'vue'
import { defineComponent } from 'vue'
import { storeCore } from '@/store/index'
import { mapActions, mapStores } from 'pinia'
import { storeMasterItemBrand } from '@/modules/master/item/brand/store'
import NumberLabel from '@/components/Number.vue'

const FormMasterItemBrand = defineAsyncComponent(
  () => import('@/modules/master/item/brand/components/Form.vue'),
)

export default defineComponent({
  components: { NumberLabel },
  data() {
    return {
      loading: false,
      totalRecords: 0,
      items: [],
      filters: {
        code: { value: '', matchMode: 'contains' },
        name: { value: '', matchMode: 'contains' },
        remark: { value: '', matchMode: 'contains' },
      },
      lazyParams: {
        filters: {},
        page: 0,
        first: 0,
        rows: 0,
        sortField: 'created_at',
        sortOrder: 1,
      },
      columns: [
        { field: 'code', header: 'Code' },
        { field: 'name', header: 'Name' },
        { field: 'remark', header: 'Remark' },
        { field: 'created_at', header: 'Created Date' },
      ],
    }
  },
  computed: {
    ...mapStores(storeMasterItemBrand),
  },
  mounted() {
    this.lazyParams = {
      first: 0,
      page: 0,
      rows: (this.$refs.dt as { rows: number }).rows,
      sortField: 'created_at',
      sortOrder: 1,
      filters: this.filters,
    }
    this.UIToggleEditingData(true)
    this.loadLazyData()
  },
  methods: {
    ...mapActions(storeCore, ['allowDispatch', 'UIToggleEditingData']),
    add() {
      this.$dialog.open(FormMasterItemBrand, {
        props: {
          header: 'Add Master Item Brand',
          style: {
            width: '90vw',
          },
          breakpoints: {
            '960px': '75vw',
            '640px': '90vw',
          },
          modal: true,
        },
        data: {
          mode: 'add',
        },
        onClose: () => {
          this.loadLazyData()
        },
      })
    },
    editMasterItemBrand(id: string) {
      this.$dialog.open(FormMasterItemBrand, {
        props: {
          header: 'Edit Master Item Brand',
          style: {
            width: '90vw',
          },
          breakpoints: {
            '960px': '75vw',
            '640px': '90vw',
          },
          modal: true,
        },
        data: {
          mode: 'edit',
          id: id,
        },
        onClose: () => {
          this.loadLazyData()
        },
      })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deleteMasterItemBrand(event: any, id: string) {
      this.$confirm.require({
        target: event.currentTarget,
        group: 'delete_confirm_master_item_brand',
        message: 'Are you sure to delete this data?',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-secondary',
        acceptLabel: 'Yes. Delete it!',
        rejectLabel: 'Cancel',
        accept: async () => {
          await this.masterItemBrandStore.delete(id).then(() => {
            this.loadLazyData()
          })
        },
        reject: () => {
          // Reject
        },
      })
    },
    formatDate(date: string, format: string) {
      return DateManagement.formatDate(date, format)
    },
    async loadLazyData() {
      this.loading = true

      await this.masterItemBrandStore
        .list(this.lazyParams)
        .then((response) => {
          if (response) {
            const data = response.payload.data
            const totalRecords = response.payload.totalRecords
            this.items = data
            this.totalRecords = totalRecords
          } else {
            this.items = []
            this.totalRecords = 0
          }
          this.loading = false
        })
        .catch(() => {
          this.items = []
          this.loading = false
        })
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
    onFilter() {
      this.lazyParams.page = 0
      this.lazyParams.first = 0
      this.lazyParams.filters = this.filters
      this.loadLazyData()
    },
  },
})
</script>
