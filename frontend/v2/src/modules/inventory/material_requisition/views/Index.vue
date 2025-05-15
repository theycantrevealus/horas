<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="grid">
    <div class="col-12">
      <Card class="slim">
        <template #header>
          <Panel :toggleable="false">
            <template #header>
              <p class="font-bold text-2xl w-10">Material Requisition</p>
            </template>
            <template #icons>
              <Button
                class="p-button-info p-button-rounded p-button-raised button-sm"
                @click="dataAdd"
                ><span class="material-icons">add</span> Create Material Requisition</Button
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
            scrollable
            scrollHeight="800px"
            paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
            :rowsPerPageOptions="[20, 50, 100]"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
            :totalRecords="ui.table.totalRecords"
            :loading="ui.table.loading"
            filterDisplay="menu"
            :globalFilterFields="['code', 'stock_point', 'status', 'created_at']"
            responsiveLayout="scroll"
            dataKey="id"
            v-model:expandedRows="ui.table.expandedRows"
            @page="onPage($event)"
            @sort="onSort($event)"
            @filter="onFilter($event)"
          >
            <template #empty> No material requisitions found. </template>
            <template #loading> Loading material requisitions. Please wait. </template>
            <Column expander style="width: 5rem" />
            <template #expansion="slotProps">
              <div class="p-2">
                <Splitter>
                  <SplitterPanel class="p-3">
                    <h4>{{ slotProps.data.code }}</h4>
                    <Divider />
                    <h5>Remark:</h5>
                    <p v-html="slotProps.data.remark"></p>
                  </SplitterPanel>
                  <SplitterPanel class="flex items-center justify-center p-3">
                    <Timeline :value="slotProps.data.approval_history">
                      <template #opposite="TimeLineSlotProps">
                        <small class="text-surface-500 dark:text-surface-400"
                          ><strong
                            >{{ TimeLineSlotProps.item.created_by.last_name }},
                            {{ TimeLineSlotProps.item.created_by.first_name }}</strong
                          ></small
                        ><br />
                        <small class="text-surface-500 dark:text-surface-400">{{
                          formatDate(TimeLineSlotProps.item.logged_at, 'DD MMMM YYYY, HH:mm')
                        }}</small>
                      </template>
                      <template #content="TimeLineSlotProps">
                        <Message
                          class="mt-3"
                          :severity="`${ui.timeline.severity[TimeLineSlotProps.item.status].class}`"
                          ><strong>{{
                            ui.timeline.severity[TimeLineSlotProps.item.status].caption
                          }}</strong>
                          :
                          <p v-html="TimeLineSlotProps.item.remark"></p>
                        </Message>
                      </template>
                    </Timeline>
                  </SplitterPanel>
                </Splitter>
              </div>
            </template>
            <Column header="ID" class="align-right wrap_content">
              <template #body="slotProps">
                <h6 class="d-inline-flex">#{{ slotProps.data.autonum }}</h6>
              </template>
            </Column>
            <Column class="wrap_content" header="Action">
              <template #body="slotProps">
                <span class="p-buttonset wrap_content">
                  <Button
                    v-if="slotProps.data.status.code === 'new'"
                    :disabled="
                      checkPermission(
                        'btnMaterialRequisitionEdit',
                        slotProps.data.created_by.id.toString(),
                        slotProps.data.status.code,
                      )
                    "
                    class="p-button-info p-button-sm p-button-raised"
                    @click="dataEdit(slotProps.data.id)"
                  >
                    <span class="material-icons">edit</span>
                    Edit
                  </Button>
                  <Button
                    v-if="slotProps.data.status.code === 'new'"
                    :disabled="
                      checkPermission(
                        'btnMaterialRequisitionDelete',
                        slotProps.data.created_by.id.toString(),
                        slotProps.data.status.code,
                      )
                    "
                    class="p-button-danger p-button-sm p-button-raised"
                    @click="dataDelete($event, slotProps.data.id)"
                  >
                    <span class="material-icons">delete</span>
                    Delete
                  </Button>
                  <Button
                    v-if="slotProps.data.status.code === 'new'"
                    :disabled="
                      checkPermission(
                        'btnMaterialRequisitionAskApproval',
                        slotProps.data.created_by.id.toString(),
                        slotProps.data.status.code,
                      )
                    "
                    class="p-button-secondary p-button-sm p-button-raised"
                    @click="
                      dataApproval(
                        $event,
                        'ask_approval',
                        slotProps.data.id,
                        slotProps.data.code,
                        slotProps.data.__v,
                      )
                    "
                  >
                    <span class="material-icons">schedule</span>
                    Ask Approval
                  </Button>
                  <Button
                    v-if="slotProps.data.status.code === 'need_approval'"
                    :disabled="
                      checkPermission(
                        'btnMaterialRequisitionApprove',
                        slotProps.data.created_by.id.toString(),
                        slotProps.data.status.code,
                      )
                    "
                    class="p-button-success p-button-sm p-button-raised"
                    @click="
                      dataApproval(
                        $event,
                        'approve',
                        slotProps.data.id,
                        slotProps.data.code,
                        slotProps.data.__v,
                      )
                    "
                  >
                    <span class="material-icons">task_alt</span>
                    Approve
                  </Button>
                  <Button
                    v-if="slotProps.data.status.code === 'need_approval'"
                    :disabled="
                      checkPermission(
                        'btnMaterialRequisitionDecline',
                        slotProps.data.created_by.id.toString(),
                        slotProps.data.status.code,
                      )
                    "
                    class="p-button-warn p-button-sm p-button-raised"
                    @click="
                      dataApproval(
                        $event,
                        'decline',
                        slotProps.data.id,
                        slotProps.data.code,
                        slotProps.data.__v,
                      )
                    "
                  >
                    <span class="material-icons">dangerous</span>
                    Decline
                  </Button>
                </span>
              </template>
            </Column>
            <Column
              ref="code"
              field="code"
              header="Code"
              filterMatchMode="startsWith"
              :sortable="true"
              class="wrap_content"
            >
              <template #filter="{ filterModel, filterCallback }">
                <InputText
                  v-model="filterModel.value"
                  type="text"
                  class="column-filter"
                  placeholder="Search by code"
                  @keydown.enter="filterCallback()"
                />
              </template>
            </Column>
            <Column
              ref="stock_point"
              field="stock_point"
              header="Stock Point"
              filterMatchMode="startsWith"
              :sortable="true"
            >
              <template #body="slotProps">
                {{ slotProps.data.stock_point.name }}
              </template>
              <template #filter="{ filterModel, filterCallback }">
                <InputText
                  v-model="filterModel.value"
                  type="text"
                  class="column-filter"
                  placeholder="Search by stock point"
                  @keydown.enter="filterCallback()"
                />
              </template>
            </Column>
            <Column
              ref="status"
              field="status"
              header="Status"
              :showFilterMatchModes="false"
              filterField="status"
              :sortable="true"
              class="wrap_content"
            >
              <template #body="slotProps">
                <Tag
                  :icon="`pi ${slotProps.data.status.icon ?? 'pi-circle-fill'}`"
                  :severity="slotProps.data.status.class ?? 'secondary'"
                  :value="slotProps.data.status.name"
                />
              </template>
              <template #filter="{ filterModel }">
                <MultiSelect
                  v-model="filterModel.value"
                  :options="ui.availStatus"
                  optionLabel="name"
                  optionValue="code"
                  placeholder="Search by status"
                />
              </template>
            </Column>
            <Column
              ref="created_by"
              field="created_by"
              header="Created By"
              filterMatchMode="contains"
              :sortable="true"
              class="wrap_content"
            >
              <template #body="slotProps">
                <AccountBadge
                  :first_name="slotProps.data.created_by.first_name"
                  :last_name="slotProps.data.created_by.last_name"
                />
              </template>
              <template #filter="{ filterModel, filterCallback }">
                <InputText
                  v-model="filterModel.value"
                  type="text"
                  class="column-filter"
                  placeholder="Search by created by"
                  @keydown.enter="filterCallback()"
                />
              </template>
            </Column>
            <Column
              ref="created_at"
              field="created_at"
              header="Created at"
              :sortable="true"
              class="wrap_content text-right"
            >
              <template #body="slotProps">
                <b>{{ formatDate(slotProps.data.created_at, 'DD MMMM YYYY, HH:mm') }}</b>
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>
      <DynamicDialog />
      <ConfirmPopup group="confirm_delete"></ConfirmPopup>
      <ConfirmPopup group="confirm_approval"></ConfirmPopup>
    </div>
  </div>
</template>
<script lang="ts">
import { FilterMatchMode, FilterOperator } from '@primevue/core/api'
import DateManagement from '@/utils/core/date.management'
import { storeCore } from '@/store/index'
import { storeInventoryMaterialRequisition } from '@/modules/inventory/material_requisition/store'
import { mapStores, mapActions } from 'pinia'
import { defineComponent, defineAsyncComponent } from 'vue'
import AccountBadge from '@/components/Account.Badge.vue'

const FormMaterialRequisitionApproval = defineAsyncComponent(
  () => import('@/modules/inventory/material_requisition/components/Form.Approval.vue'),
)

export default defineComponent({
  name: 'InventoryMaterialRequisitionList',
  components: { AccountBadge },
  data() {
    return {
      ui: {
        timeline: {
          severity: {
            new: {
              class: 'info',
              caption: 'New',
            },
            need_approval: {
              class: 'warn',
              caption: 'Need Approval',
            },
            approved: {
              class: 'success',
              caption: 'Approved',
            },
            declined: {
              class: 'error',
              caption: 'Declined',
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        },
        availStatus: [
          { name: 'New', code: 'new', class: 'info', icon: 'pi-bolt' },
          {
            name: 'Need Approval',
            code: 'need_approval',
            class: 'warn',
            icon: 'pi-exclamation-circle',
          },
          { name: 'Approved', code: 'approved', class: 'success', icon: 'pi-check-circle' },
          { name: 'Declined', code: 'declined', class: 'danger', icon: 'pi-times' },
        ],
        table: {
          expandedRows: {},
          loading: true,
          totalRecords: 0,
          data: [],
          lazyParams: {
            first: 0,
            rows: 0,
            sortField: '',
            sortOrder: '',
            filters: {
              code: {
                operator: FilterOperator.OR,
                constraints: [{ value: '', matchMode: FilterMatchMode.CONTAINS }],
              },
              stock_point: {
                operator: FilterOperator.AND,
                constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }],
              },
              status: { value: null, matchMode: FilterMatchMode.IN },
              created_by: {
                operator: FilterOperator.AND,
                constraints: [{ value: '', matchMode: FilterMatchMode.CONTAINS }],
              },
            },
          },
          // columns: [
          //   {
          //     field: 'code',
          //     header: this.$t('inventory.material_requisition.datatable.column.code.caption'),
          //   },
          //   {
          //     field: 'stock_point',
          //     header: this.$t(
          //       'inventory.material_requisition.datatable.column.stock_point.caption',
          //     ),
          //   },
          //   {
          //     field: 'created_by',
          //     header: this.$t('inventory.material_requisition.datatable.column.created_by.caption'),
          //   },
          //   {
          //     field: 'created_at',
          //     header: this.$t('inventory.material_requisition.datatable.column.created_at.caption'),
          //   },
          // ],
        },
      },
    }
  },
  computed: {
    ...mapStores(storeInventoryMaterialRequisition),
    ...mapStores(storeCore),
    getAccount() {
      return this.coreStore.getAccount
    },
  },
  mounted() {
    const dataTable = this.$refs.dt as { rows: number }
    this.ui.table.lazyParams.rows = dataTable.rows
    this.loadLazyData()
  },
  methods: {
    ...mapActions(storeCore, ['allowDispatch', 'UIToggleEditingData']),
    checkPermission(target: string, account: string, status: string): boolean {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const notCreatorPrivileges: any = {
        btnMaterialRequisitionApprove: ['need_approval'],
        btnMaterialRequisitionDecline: ['need_approval'],
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const creatorPrivileges: any = {
        btnMaterialRequisitionEdit: ['new'],
        btnMaterialRequisitionDelete: ['new'],
        btnMaterialRequisitionAskApproval: ['new'],
      }

      const isCreator = account.toString() === this.getAccount.id.toString()

      let permission: boolean = true

      if (isCreator) {
        if (Object.keys(creatorPrivileges).includes(target)) {
          permission = creatorPrivileges[target].indexOf(status) >= 0
        } else {
          permission = false
        }
      } else {
        if (Object.keys(notCreatorPrivileges).includes(target)) {
          permission = notCreatorPrivileges[target].indexOf(status) >= 0
        } else {
          permission = false
        }
      }

      return !permission
    },
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
      await this.inventoryMaterialRequisitionStore
        .list(this.ui.table.lazyParams)
        .then((response) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parsedData = response.payload.data.map((item: any) => ({
            ...item,
            status: this.ui.availStatus.find((statusItem) => statusItem.code === item.status),
          }))
          this.ui.table.data = parsedData
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
        path: `/inventory/material_requisition/edit/${id}`,
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
        acceptClass: 'p-button-danger',
        rejectClass: 'p-button-secondary',
        acceptIcon: 'pi pi-check-circle',
        acceptLabel: 'Yes',
        rejectLabel: 'Abort',
        rejectIcon: 'pi pi-times-circle',
        accept: async () => {
          await this.inventoryMaterialRequisitionStore.delete(id).then(async () => {
            await this.loadLazyData()
          })
        },
        reject: async () => {
          await this.loadLazyData()
        },
      })
    },
    async dataApproval(event: MouseEvent, mode: string, id: string, code: string, v: number) {
      this.$dialog.open(FormMaterialRequisitionApproval, {
        props: {
          header: 'Ask Material Requisition Approval',
          style: {
            width: '45vw',
          },
          breakpoints: {
            '960px': '75vw',
            '640px': '90vw',
          },
          modal: true,
        },
        data: {
          mode: mode,
          id: id,
          code: code,
          v: v,
        },
        onClose: async () => {
          await this.loadLazyData()
        },
      })
    },
    async dataAdd() {
      this.$router.push({
        path: '/inventory/material_requisition/add',
      })
    },
  },
})
</script>
