<template>
  <div>
    <Tabs value="0">
      <TabList>
        <Tab value="0" as="div" class="flex items-center gap-2">
          <span class="material-icons-outlined dark-mode-switch"> apps </span>
          <span class="font-bold whitespace-nowrap">Item Management</span>
        </Tab>
        <Tab value="1" as="div" class="flex items-center gap-2">
          <span class="material-icons-outlined dark-mode-switch"> account_tree </span>
          <span class="font-bold whitespace-nowrap">Category Management</span>
        </Tab>
        <Tab value="2" as="div" class="flex items-center gap-2">
          <span class="material-icons-outlined dark-mode-switch"> sell </span>
          <span class="font-bold whitespace-nowrap">Brand Management</span>
        </Tab>
        <Tab value="3" as="div" class="flex items-center gap-2">
          <span class="material-icons-outlined dark-mode-switch"> workspaces </span>
          <span class="font-bold whitespace-nowrap">Unit Management</span>
        </Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="0" as="p" class="m-0">
          <div class="grid">
            <div class="col-12">
              <Card class="slim">
                <template #header>
                  <Panel :toggleable="false">
                    <template #header>
                      <p class="font-bold text-2xl w-10">Master Item Management</p>
                    </template>
                    <template #icons>
                      <Button
                        class="p-button-info p-button-rounded p-button-raised button-sm"
                        @click="itemAdd"
                        :disabled="!allowDispatch('btnMasterItemAdd')"
                        ><span class="material-icons">add</span> Add Item</Button
                      >
                      <Button
                        class="p-button-success p-button-rounded p-button-raised button-sm mx-1"
                        @click="itemImport"
                        :disabled="!allowDispatch('btnMasterItemAdd')"
                        ><span class="material-icons">upload_file</span> Import Item</Button
                      >
                    </template>
                  </Panel>
                </template>
                <template #content>
                  <div class="grid">
                    <div class="col-12">
                      <DataTable
                        ref="dt_item"
                        v-model:filters="ui.table.item.lazyParams.filters"
                        :value="ui.table.item.data"
                        :lazy="true"
                        :paginator="true"
                        :rows="20"
                        stripedRows
                        paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
                        :rowsPerPageOptions="[20, 50, 100]"
                        currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
                        :totalRecords="ui.table.item.totalRecords"
                        :loading="ui.table.item.loading"
                        filterDisplay="row"
                        :globalFilterFields="['code', 'name', 'alias', 'created_at']"
                        responsiveLayout="scroll"
                        @page="onPage($event, ui.table.item)"
                        @sort="onSort($event, ui.table.item)"
                        @filter="onFilter($event, ui.table.item)"
                      >
                        <Column header="ID" class="align-right wrap_content">
                          <template #body="slotProps">
                            <h6 class="d-inline-flex">#{{ slotProps.data.autonum }}</h6>
                          </template>
                        </Column>
                        <Column
                          class="wrap_content"
                          :header="$t('master.item.datatable.column.action.caption')"
                        >
                          <template #body="slotProps">
                            <span class="p-buttonset wrap_content">
                              <Button
                                :disabled="!allowDispatch('btnMasterItemCategoryEdit')"
                                class="p-button-info p-button-sm p-button-raised"
                                @click="itemEdit(slotProps.data.id)"
                              >
                                <span class="material-icons">edit</span>
                                {{ $t('master.item.datatable.button.edit.caption') }}
                              </Button>
                              <Button
                                :disabled="!allowDispatch('btnMasterItemCategoryDelete')"
                                class="p-button-danger p-button-sm p-button-raised"
                                @click="itemDelete($event, slotProps.data.id)"
                              >
                                <span class="material-icons">delete</span>
                                {{ $t('master.item.datatable.button.delete.caption') }}
                              </Button>
                            </span>
                          </template>
                        </Column>
                        <Column
                          ref="code"
                          class="wrap_content"
                          field="code"
                          :header="$t('master.item.datatable.column.code.caption')"
                          filterMatchMode="startsWith"
                          :sortable="true"
                        >
                          <template #filter="{ filterModel, filterCallback }">
                            <InputText
                              v-model="filterModel.value"
                              type="text"
                              class="column-filter"
                              :placeholder="$t('master.item.datatable.column.code.placeholder')"
                              @keydown.enter="filterCallback()"
                            />
                          </template>
                          <template #body="slotProps">
                            <label class="currency-label">{{ slotProps.data.code }}</label>
                          </template>
                        </Column>
                        <Column
                          ref="name"
                          field="name"
                          :header="$t('master.item.datatable.column.name.caption')"
                          filterMatchMode="startsWith"
                          :sortable="true"
                        >
                          <template #filter="{ filterModel, filterCallback }">
                            <InputText
                              v-model="filterModel.value"
                              type="text"
                              class="column-filter"
                              :placeholder="$t('master.item.datatable.column.name.placeholder')"
                              @keydown.enter="filterCallback()"
                            />
                          </template>
                        </Column>
                        <Column
                          ref="alias"
                          field="alias"
                          :header="$t('master.item.datatable.column.alias.caption')"
                          filterMatchMode="startsWith"
                          :sortable="true"
                        >
                          <template #filter="{ filterModel, filterCallback }">
                            <InputText
                              v-model="filterModel.value"
                              type="text"
                              class="column-filter"
                              :placeholder="$t('master.item.datatable.column.alias.placeholder')"
                              @keydown.enter="filterCallback()"
                            />
                          </template>
                        </Column>
                        <Column
                          ref="created_at"
                          field="created_at"
                          :header="$t('master.item.datatable.column.created_at.caption')"
                          :sortable="true"
                          class="wrap_content text-right"
                        >
                          <template #body="slotProps">
                            <b>{{ formatDate(slotProps.data.created_at, 'DD MMMM YYYY') }}</b>
                          </template>
                        </Column>
                      </DataTable>
                    </div>
                  </div>
                </template>
              </Card>
            </div>
          </div>
        </TabPanel>
        <TabPanel value="1" as="p" class="m-0">
          <div class="grid">
            <div class="col-12">
              <Card class="slim">
                <template #header>
                  <Panel :toggleable="false">
                    <template #header>
                      <p class="font-bold text-2xl w-10">Master Item Category Management</p>
                    </template>
                    <template #icons>
                      <Button
                        class="p-button-info p-button-rounded p-button-raised button-sm"
                        :disabled="!allowDispatch('btnMasterItemCategoryAdd')"
                        @click="categoryAdd"
                        ><span class="material-icons">add</span> Add Category</Button
                      >
                    </template>
                  </Panel>
                </template>
                <template #content>
                  <div class="grid">
                    <div class="col-12">
                      <DataTable
                        ref="dt_category"
                        v-model:filters="ui.table.category.lazyParams.filters"
                        :value="ui.table.category.data"
                        :lazy="true"
                        :paginator="true"
                        :rows="20"
                        stripedRows
                        paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
                        :rowsPerPageOptions="[20, 50, 100]"
                        currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
                        :totalRecords="ui.table.category.totalRecords"
                        :loading="ui.table.category.loading"
                        filterDisplay="row"
                        :globalFilterFields="['code', 'name', 'created_at']"
                        responsiveLayout="scroll"
                        @page="onPage($event, ui.table.category)"
                        @sort="onSort($event, ui.table.category)"
                        @filter="onFilter($event, ui.table.category)"
                      >
                        <Column header="ID" class="align-right wrap_content">
                          <template #body="slotProps">
                            <h6 class="d-inline-flex">#{{ slotProps.data.autonum }}</h6>
                          </template>
                        </Column>
                        <Column
                          class="wrap_content"
                          :header="$t('master.item.category.datatable.column.action.caption')"
                        >
                          <template #body="slotProps">
                            <span class="p-buttonset wrap_content">
                              <Button
                                :disabled="!allowDispatch('btnMasterItemCategoryEdit')"
                                class="p-button-info p-button-sm p-button-raised"
                                @click="categoryEdit(slotProps.data.id)"
                              >
                                <span class="material-icons">edit</span>
                                {{ $t('master.item.category.datatable.button.edit.caption') }}
                              </Button>
                              <Button
                                :disabled="!allowDispatch('btnMasterItemCategoryDelete')"
                                class="p-button-danger p-button-sm p-button-raised"
                                @click="categoryDelete($event, slotProps.data.id)"
                              >
                                <span class="material-icons">delete</span>
                                {{ $t('master.item.category.datatable.button.delete.caption') }}
                              </Button>
                            </span>
                          </template>
                        </Column>
                        <Column
                          ref="code"
                          field="code"
                          class="wrap_content"
                          :header="$t('master.item.category.datatable.column.code.caption')"
                          filterMatchMode="startsWith"
                          :sortable="true"
                        >
                          <template #filter="{ filterModel, filterCallback }">
                            <InputText
                              v-model="filterModel.value"
                              type="text"
                              class="column-filter"
                              :placeholder="
                                $t('master.item.category.datatable.column.code.placeholder')
                              "
                              @keydown.enter="filterCallback()"
                            />
                          </template>
                        </Column>
                        <Column
                          ref="name"
                          field="name"
                          :header="$t('master.item.category.datatable.column.name.caption')"
                          filterMatchMode="startsWith"
                          :sortable="true"
                        >
                          <template #filter="{ filterModel, filterCallback }">
                            <InputText
                              v-model="filterModel.value"
                              type="text"
                              class="column-filter"
                              :placeholder="
                                $t('master.item.category.datatable.column.name.placeholder')
                              "
                              @keydown.enter="filterCallback()"
                            />
                          </template>
                        </Column>
                        <Column
                          ref="created_at"
                          field="created_at"
                          :header="$t('master.item.category.datatable.column.created_at.caption')"
                          :sortable="true"
                          class="wrap_content text-right"
                        >
                          <template #body="slotProps">
                            <b>{{ formatDate(slotProps.data.created_at, 'DD MMMM YYYY') }}</b>
                          </template>
                        </Column>
                      </DataTable>
                    </div>
                  </div>
                </template>
              </Card>
            </div>
          </div>
        </TabPanel>
        <TabPanel value="2" as="p" class="m-0">
          <div class="grid">
            <div class="col-12">
              <Card class="slim">
                <template #header>
                  <Panel :toggleable="false">
                    <template #header>
                      <p class="font-bold text-2xl w-10">Master Item Brand Management</p>
                    </template>
                    <template #icons>
                      <Button
                        :disabled="!allowDispatch('btnMasterItemBrandAdd')"
                        class="p-button-info p-button-rounded p-button-raised button-sm"
                        @click="brandAdd"
                        ><span class="material-icons">add</span> Add Brand</Button
                      >
                    </template>
                  </Panel>
                </template>
                <template #content>
                  <div class="grid">
                    <div class="col-12">
                      <DataTable
                        ref="dt_brand"
                        v-model:filters="ui.table.brand.lazyParams.filters"
                        :value="ui.table.brand.data"
                        :lazy="true"
                        :paginator="true"
                        :rows="20"
                        stripedRows
                        paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
                        :rowsPerPageOptions="[20, 50, 100]"
                        currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
                        :totalRecords="ui.table.brand.totalRecords"
                        :loading="ui.table.brand.loading"
                        filterDisplay="row"
                        :globalFilterFields="['code', 'name', 'created_at']"
                        responsiveLayout="scroll"
                        @page="onPage($event, ui.table.brand)"
                        @sort="onSort($event, ui.table.brand)"
                        @filter="onFilter($event, ui.table.brand)"
                      >
                        <Column header="ID" class="align-right wrap_content">
                          <template #body="slotProps">
                            <h6 class="d-inline-flex">#{{ slotProps.data.autonum }}</h6>
                          </template>
                        </Column>
                        <Column
                          class="wrap_content"
                          :header="$t('master.item.brand.datatable.column.action.caption')"
                        >
                          <template #body="slotProps">
                            <span class="p-buttonset wrap_content">
                              <Button
                                :disabled="!allowDispatch('btnMasterItemBrandEdit')"
                                class="p-button-info p-button-sm p-button-raised"
                                @click="brandEdit(slotProps.data.id)"
                              >
                                <span class="material-icons">edit</span>
                                {{ $t('master.item.brand.datatable.button.edit.caption') }}
                              </Button>
                              <Button
                                :disabled="!allowDispatch('btnMasterItemBrandDelete')"
                                class="p-button-danger p-button-sm p-button-raised"
                                @click="brandDelete($event, slotProps.data.id)"
                              >
                                <span class="material-icons">delete</span>
                                {{ $t('master.item.brand.datatable.button.delete.caption') }}
                              </Button>
                            </span>
                          </template>
                        </Column>
                        <Column
                          ref="code"
                          field="code"
                          class="wrap_content"
                          :header="$t('master.item.datatable.column.code.caption')"
                          filterMatchMode="startsWith"
                          :sortable="true"
                        >
                          <template #filter="{ filterModel, filterCallback }">
                            <InputText
                              v-model="filterModel.value"
                              type="text"
                              class="column-filter"
                              :placeholder="
                                $t('master.item.brand.datatable.column.code.placeholder')
                              "
                              @keydown.enter="filterCallback()"
                            />
                          </template>
                        </Column>
                        <Column
                          ref="name"
                          field="name"
                          :header="$t('master.item.brand.datatable.column.name.caption')"
                          filterMatchMode="startsWith"
                          :sortable="true"
                        >
                          <template #filter="{ filterModel, filterCallback }">
                            <InputText
                              v-model="filterModel.value"
                              type="text"
                              class="column-filter"
                              :placeholder="
                                $t('master.item.brand.datatable.column.name.placeholder')
                              "
                              @keydown.enter="filterCallback()"
                            />
                          </template>
                        </Column>
                        <Column
                          ref="created_at"
                          field="created_at"
                          :header="$t('master.item.brand.datatable.column.created_at.caption')"
                          :sortable="true"
                          class="wrap_content text-right"
                        >
                          <template #body="slotProps">
                            <b>{{ formatDate(slotProps.data.created_at, 'DD MMMM YYYY') }}</b>
                          </template>
                        </Column>
                      </DataTable>
                    </div>
                  </div>
                </template>
              </Card>
            </div>
          </div>
        </TabPanel>
        <TabPanel value="3" as="p" class="m-0">
          <div class="grid">
            <div class="col-12">
              <Card class="slim">
                <template #header>
                  <Panel :toggleable="false">
                    <template #header>
                      <p class="font-bold text-2xl w-10">Master Item Unit Management</p>
                    </template>
                    <template #icons>
                      <Button
                        :disabled="!allowDispatch('btnMasterItemUnitAdd')"
                        class="p-button-info p-button-rounded p-button-raised button-sm"
                        @click="unitAdd"
                        ><span class="material-icons">add</span> Add Unit</Button
                      >
                    </template>
                  </Panel>
                </template>
                <template #content>
                  <div class="grid">
                    <div class="col-12">
                      <DataTable
                        ref="dt_unit"
                        v-model:filters="ui.table.unit.lazyParams.filters"
                        :value="ui.table.unit.data"
                        :lazy="true"
                        :paginator="true"
                        :rows="20"
                        stripedRows
                        paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
                        :rowsPerPageOptions="[20, 50, 100]"
                        currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
                        :totalRecords="ui.table.unit.totalRecords"
                        :loading="ui.table.unit.loading"
                        filterDisplay="row"
                        :globalFilterFields="['code', 'name', 'created_at']"
                        responsiveLayout="scroll"
                        @page="onPage($event, ui.table.unit)"
                        @sort="onSort($event, ui.table.unit)"
                        @filter="onFilter($event, ui.table.unit)"
                      >
                        <Column header="ID" class="align-right wrap_content">
                          <template #body="slotProps">
                            <h6 class="d-inline-flex">#{{ slotProps.data.autonum }}</h6>
                          </template>
                        </Column>
                        <Column
                          class="wrap_content"
                          :header="$t('master.unit.datatable.column.action.caption')"
                        >
                          <template #body="slotProps">
                            <span class="p-buttonset wrap_content">
                              <Button
                                :disabled="!allowDispatch('btnMasterItemBrandEdit')"
                                class="p-button-info p-button-sm p-button-raised"
                                @click="unitEdit(slotProps.data.id)"
                              >
                                <span class="material-icons">edit</span>
                                {{ $t('master.item.unit.datatable.button.edit.caption') }}
                              </Button>
                              <Button
                                :disabled="!allowDispatch('btnMasterItemBrandDelete')"
                                class="p-button-danger p-button-sm p-button-raised"
                                @click="unitDelete($event, slotProps.data.id)"
                              >
                                <span class="material-icons">delete</span>
                                {{ $t('master.item.unit.datatable.button.delete.caption') }}
                              </Button>
                            </span>
                          </template>
                        </Column>
                        <Column
                          ref="code"
                          field="code"
                          class="wrap_content"
                          :header="$t('master.item.unit.datatable.column.code.caption')"
                          filterMatchMode="startsWith"
                          :sortable="true"
                        >
                          <template #filter="{ filterModel, filterCallback }">
                            <InputText
                              v-model="filterModel.value"
                              type="text"
                              class="column-filter"
                              :placeholder="
                                $t('master.item.unit.datatable.column.code.placeholder')
                              "
                              @keydown.enter="filterCallback()"
                            />
                          </template>
                        </Column>
                        <Column
                          ref="name"
                          field="name"
                          :header="$t('master.item.unit.datatable.column.name.caption')"
                          filterMatchMode="startsWith"
                          :sortable="true"
                        >
                          <template #filter="{ filterModel, filterCallback }">
                            <InputText
                              v-model="filterModel.value"
                              type="text"
                              class="column-filter"
                              :placeholder="
                                $t('master.item.unit.datatable.column.name.placeholder')
                              "
                              @keydown.enter="filterCallback()"
                            />
                          </template>
                        </Column>
                        <Column
                          ref="created_at"
                          field="created_at"
                          :header="$t('master.item.unit.datatable.column.created_at.caption')"
                          :sortable="true"
                          class="wrap_content text-right"
                        >
                          <template #body="slotProps">
                            <b>{{ formatDate(slotProps.data.created_at, 'DD MMMM YYYY') }}</b>
                          </template>
                        </Column>
                      </DataTable>
                    </div>
                  </div>
                </template>
              </Card>
            </div>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
    <DynamicDialog />
    <ConfirmPopup group="confirm_delete"></ConfirmPopup>
  </div>
</template>
<script lang="ts">
import DateManagement from '@/utils/core/date.management'
import { storeCore } from '@/store/index'
import {
  storeMasterItem,
  storeMasterItemBrand,
  storeMasterItemCategory,
  storeMasterItemUnit,
} from '@/modules/master/item/store'
import { mapStores, mapActions } from 'pinia'
import { defineComponent, defineAsyncComponent } from 'vue'

const FormMasterItemBrand = defineAsyncComponent(
  () => import('@/modules/master/item/components/Form.Brand.vue'),
)

const FormMasterItemCategory = defineAsyncComponent(
  () => import('@/modules/master/item/components/Form.Category.vue'),
)

const FormMasterItemUnit = defineAsyncComponent(
  () => import('@/modules/master/item/components/Form.Unit.vue'),
)

const FormMasterItemImport = defineAsyncComponent(
  () => import('@/modules/master/item/components/Form.Import.Item.vue'),
)

export default defineComponent({
  name: 'MasterItemList',
  data() {
    return {
      ui: {
        table: {
          item: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            store: {} as any,
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
                alias: { value: '', matchMode: 'contains' },
              },
            },
            columns: [
              {
                field: 'code',
                header: this.$t('master.item.datatable.column.code.caption'),
              },
              {
                field: 'name',
                header: this.$t('master.item.datatable.column.name.caption'),
              },
              {
                field: 'alias',
                header: this.$t('master.item.datatable.column.alias.caption'),
              },
              {
                field: 'created_at',
                header: this.$t('master.item.datatable.column.created_at.caption'),
              },
            ],
          },
          category: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            store: {} as any,
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
              {
                field: 'code',
                header: this.$t('master.item_category.datatable.column.code.caption'),
              },
              {
                field: 'name',
                header: this.$t('master.item_category.datatable.column.name.caption'),
              },
              {
                field: 'created_at',
                header: this.$t('master.item_category.datatable.column.created_at.caption'),
              },
            ],
          },
          brand: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            store: {} as any,
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
              {
                field: 'code',
                header: this.$t('master.item_brand.datatable.column.code.caption'),
              },
              {
                field: 'name',
                header: this.$t('master.item_brand.datatable.column.name.caption'),
              },
              {
                field: 'created_at',
                header: this.$t('master.item_brand.datatable.column.created_at.caption'),
              },
            ],
          },
          unit: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            store: {} as any,
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
              {
                field: 'code',
                header: this.$t('master.item_unit.datatable.column.code.caption'),
              },
              {
                field: 'name',
                header: this.$t('master.item_unit.datatable.column.name.caption'),
              },
              {
                field: 'created_at',
                header: this.$t('master.item_unit.datatable.column.created_at.caption'),
              },
            ],
          },
        },
      },
    }
  },
  computed: {
    ...mapStores(storeMasterItem),
    ...mapStores(storeMasterItemBrand),
    ...mapStores(storeMasterItemCategory),
    ...mapStores(storeMasterItemUnit),
  },
  mounted() {
    this.ui.table.item.store = this.masterItemStore
    this.ui.table.category.store = this.masterItemCategoryStore
    this.ui.table.brand.store = this.masterItemBrandStore
    this.ui.table.unit.store = this.masterItemUnitStore
    ;[
      { model: this.ui.table.item, ref: this.$refs.dt_item },
      { model: this.ui.table.category, ref: this.$refs.dt_category },
      { model: this.ui.table.brand, ref: this.$refs.dt_brand },
      { model: this.ui.table.unit, ref: this.$refs.dt_unit },
    ].forEach((item) => {
      const dataTable = item.ref as { rows: number }
      item.model.lazyParams.rows = dataTable.rows
      this.loadLazyData(item.model)
    })
  },
  methods: {
    ...mapActions(storeCore, ['allowDispatch', 'UIToggleEditingData']),
    formatDate(date: string, format: string) {
      return DateManagement.formatDate(date, format)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onPage(event: any, target: any) {
      // this.ui.table.brand.lazyParams = event
      target.lazyParams = event
      this.loadLazyData(target)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSort(event: any, target: any) {
      target.lazyParams = event
      this.loadLazyData(target)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onFilter(event: any, target: any) {
      target.lazyParams = event
      this.loadLazyData(target)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async loadLazyData(target: any) {
      target.loading = true
      await target.store
        .list(target.lazyParams)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((response: any) => {
          target.data = response.payload.data
          target.totalRecords = response.payload.totalRecords
          target.loading = false
        })
        .catch(() => {
          target.data = []
          target.totalRecords = 0
          target.loading = false
        })
    },
    async itemAdd() {
      this.$router.push({
        path: '/master/item/add',
      })
    },
    async itemEdit(id: string) {
      this.$router.push({
        path: `/master/item/edit/${id}`,
        query: {
          id: id,
        },
      })
    },
    async itemDelete(event: MouseEvent, id: string) {
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
          await this.masterItemStore.delete(id).then(async () => {
            this.loadLazyData(this.ui.table.item)
          })
        },
        reject: () => {
          //
        },
      })
    },
    async categoryAdd() {
      this.$dialog.open(FormMasterItemCategory, {
        props: {
          header: 'Add Master Item Category',
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
          this.loadLazyData(this.ui.table.category)
        },
      })
    },
    async categoryEdit(id: string) {
      this.$dialog.open(FormMasterItemCategory, {
        props: {
          header: 'Add Master Item Category',
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
          this.loadLazyData(this.ui.table.category)
        },
      })
    },
    async categoryDelete(event: MouseEvent, id: string) {
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
          await this.masterItemCategoryStore.delete(id).then(async () => {
            this.loadLazyData(this.ui.table.category)
          })
        },
        reject: () => {
          //
        },
      })
    },
    async brandAdd() {
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
          this.loadLazyData(this.ui.table.brand)
        },
      })
    },
    async brandEdit(id: string) {
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
          mode: 'edit',
          id: id,
        },
        onClose: () => {
          this.loadLazyData(this.ui.table.brand)
        },
      })
    },
    async brandDelete(event: MouseEvent, id: string) {
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
          await this.masterItemBrandStore.delete(id).then(async () => {
            this.loadLazyData(this.ui.table.brand)
          })
        },
        reject: () => {
          //
        },
      })
    },
    async unitAdd() {
      this.$dialog.open(FormMasterItemBrand, {
        props: {
          header: 'Add Master Item Unit',
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
          this.loadLazyData(this.ui.table.unit)
        },
      })
    },
    async unitEdit(id: string) {
      this.$dialog.open(FormMasterItemUnit, {
        props: {
          header: 'Add Master Item Unit',
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
          this.loadLazyData(this.ui.table.unit)
        },
      })
    },
    async unitDelete(event: MouseEvent, id: string) {
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
          await this.masterItemUnitStore.delete(id).then(async () => {
            this.loadLazyData(this.ui.table.unit)
          })
        },
        reject: () => {
          //
        },
      })
    },
    async itemImport() {
      this.$dialog.open(FormMasterItemImport, {
        props: {
          header: 'Import Master Item',
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
          //
        },
        onClose: () => {
          this.loadLazyData(this.ui.table.item)
        },
      })
    },
  },
})
</script>
