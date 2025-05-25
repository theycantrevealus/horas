<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="grid">
    <div class="col-12">
      <Card class="slim">
        <template #header>
          <Panel :toggleable="false">
            <template #header>
              <p class="font-bold text-2xl w-10">Purchase Requisition</p>
            </template>
            <template #icons> </template>
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
            <template #empty> No purchase requisitions found. </template>
            <template #loading> Loading purchase requisitions. Please wait. </template>
            <Column expander style="width: 5rem" />
            <template #expansion="slotProps">
              <div class="p-2">
                <Splitter>
                  <SplitterPanel :size="50">
                    <Splitter layout="vertical">
                      <SplitterPanel class="p-3" :size="30">
                        <h4 class="text-blue-900">
                          {{ slotProps.data.code }}
                        </h4>
                        <h5>Remark:</h5>
                        <small v-html="slotProps.data.remark"></small>
                      </SplitterPanel>
                    </Splitter>
                  </SplitterPanel>
                  <SplitterPanel class="flex items-center justify-center p-3">
                    <Timeline :value="slotProps.data.approval_history">
                      <template #opposite="TimeLineSlotProps">
                        <div class="flex flex-row-reverse flex-wrap">
                          <AccountBadge
                            :first_name="TimeLineSlotProps.item.created_by.first_name"
                            :last_name="TimeLineSlotProps.item.created_by.last_name"
                            :ltr="true"
                          />
                        </div>
                        <small class="text-surface-500 dark:text-surface-400"
                          ><strong>
                            {{
                              formatDate(TimeLineSlotProps.item.logged_at, 'DD MMMM YYYY, HH:mm')
                            }}
                          </strong></small
                        >
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
                <Button
                  type="button"
                  @click="toggleMenu($event, slotProps.data.id)"
                  class="min-w-48"
                  severity="secondary"
                >
                  <small><span class="material-icons">more_vert</span></small>
                </Button>
                <TieredMenu
                  :ref="`mr_menu_${slotProps.data.id}`"
                  id="overlay_tmenu"
                  :model="slotProps.data.permission"
                  popup
                />
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
              <template #body="slotProps">
                <LabelCode :text="slotProps.data.code" />
              </template>
            </Column>
            <Column
              ref="material_requisition"
              field="material_requisition"
              header="Material Requisition"
              filterMatchMode="startsWith"
              :sortable="true"
            >
              <template #filter="{ filterModel, filterCallback }">
                <InputText
                  v-model="filterModel.value"
                  type="text"
                  class="column-filter"
                  placeholder="Search by MR Code"
                  @keydown.enter="filterCallback()"
                />
              </template>
              <template #body="slotProps">
                <LabelCode :text="slotProps.data.material_requisition.code" />
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
            <Column header="Approval" :sortable="false" class="wrap_content">
              <template #body="slotProps">
                <div class="card flex justify-center">
                  <AvatarGroup>
                    <AccountBadge
                      v-for="(item, index) in slotProps.data.approval_history.reduce(
                        (acc: any[], current: any) => {
                          if (!acc.find((it: any) => it.created_by.id === current.created_by.id)) {
                            acc.push(current)
                          }
                          return acc
                        },
                        [],
                      )"
                      :key="index"
                      :first_name="item.created_by.first_name"
                      :last_name="item.created_by.last_name"
                      :withName="false"
                    />
                  </AvatarGroup>
                </div>
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
      <PrintOptions :visibility="ui.drawer.visibility" @process-print="processPrint" />
      <DynamicDialog />
      <ConfirmDialog group="confirm_delete"></ConfirmDialog>
      <PrintModule ref="printModule" />
      <PrintTemplatePurchaseRequisition ref="printTemplatePurchaseRequisition" />
    </div>
  </div>
</template>
<script lang="ts">
import { FilterMatchMode, FilterOperator } from '@primevue/core/api'
import PrintModule from '@/components/print/Print.vue'
import PrintOptions from '@/components/print/Option.vue'
import PrintTemplatePurchaseRequisition from '@/components/print/templates/PurchaseRequisition.vue'
import AccountBadge from '@/components/Account.Badge.vue'
import LabelCode from '@/components/Label.Code.vue'
import DateManagement from '@/utils/core/date.management'
import { storeCore } from '@/store/index'
import { storeProcurementPurchaseRequisition } from '@/modules/procurement/purchase_requisition/store'
import { mapStores, mapActions } from 'pinia'
import { defineComponent, defineAsyncComponent } from 'vue'

const FormPurchaseRequisitionApproval = defineAsyncComponent(
  () => import('@/modules/procurement/purchase_requisition/components/Form.Approval.vue'),
)

const PurchaseRequisitionDetail = defineAsyncComponent(
  () => import('@/modules/procurement/purchase_requisition/components/Detail.vue'),
)

export default defineComponent({
  name: 'InventoryPurchaseRequisitionList',
  components: {
    AccountBadge,
    LabelCode,
    PrintModule,
    PrintTemplatePurchaseRequisition,
    PrintOptions,
  },
  data() {
    return {
      ui: {
        drawer: {
          targetData: null,
          visibility: false,
        },
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: [] as any[],
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
        },
      },
    }
  },
  computed: {
    ...mapStores(storeProcurementPurchaseRequisition),
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toggleMenu(event: any, id: string) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const MRToogle: any = this.$refs[`mr_menu_${id}`]
      MRToogle.toggle(event)
    },
    checkPermission(target: string, account: string, status: string): boolean {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const notCreatorPrivileges: any = {
        btnPurchaseRequisitionApprove: ['need_approval'],
        btnPurchaseRequisitionDecline: ['need_approval'],
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const creatorPrivileges: any = {
        btnPurchaseRequisitionEdit: ['new'],
        btnPurchaseRequisitionDelete: ['new'],
        btnPurchaseRequisitionAskApproval: ['new'],
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

      return permission
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
      await this.procurementPurchaseRequisitionStore
        .list(this.ui.table.lazyParams)
        .then(async (response) => {
          const parsedData = await Promise.all(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            response.payload.data.map(async (item: any) => ({
              ...item,
              permission: [
                {
                  label: 'View',
                  icon: 'pi pi-eye',
                  creator: item.created_by.id.toString(),
                  status: item.status,
                  permission: 'btnMaterialRequisitionView',
                  allowStatus: 'new',
                  command: () => {
                    this.$dialog.open(PurchaseRequisitionDetail, {
                      props: {
                        header: `Purchase Requisition <${item.code}>`,
                        style: {
                          width: '75vw',
                        },
                        breakpoints: {
                          '960px': '75vw',
                          '640px': '90vw',
                        },
                        modal: true,
                      },
                      data: {
                        id: item.id,
                      },
                      onClose: async () => {
                        await this.loadLazyData()
                      },
                    })
                  },
                },
                {
                  label: 'Approval',
                  icon: 'pi pi-check-square',
                  items: [
                    {
                      label: 'Ask Approval',
                      icon: 'pi pi-exclamation-circle',
                      creator: item.created_by.id.toString(),
                      status: item.status,
                      permission: 'btnPurchaseRequisitionAskApproval',
                      command: () => {
                        if (
                          this.checkPermission(
                            'btnPurchaseRequisitionAskApproval',
                            item.created_by.id.toString(),
                            item.status,
                          )
                        ) {
                          this.dataApproval('ask_approval', item.id, item.code, item.__v)
                        } else {
                          this.coreStore.setToast({
                            severity: 'warn',
                            summary: 'Forbidden Method',
                            detail: 'You are not allowed to perform this action',
                            life: 5000,
                          })
                        }
                      },
                    },
                    {
                      label: 'Approve',
                      icon: 'pi pi-check-circle',
                      creator: item.created_by.id.toString(),
                      status: item.status,
                      permission: 'btnPurchaseRequisitionApprove',
                      command: () => {
                        if (
                          this.checkPermission(
                            'btnPurchaseRequisitionApprove',
                            item.created_by.id.toString(),
                            item.status,
                          )
                        ) {
                          this.dataApproval('approve', item.id, item.code, item.__v)
                        } else {
                          this.coreStore.setToast({
                            severity: 'warn',
                            summary: 'Forbidden Method',
                            detail: 'You are not allowed to perform this action',
                            life: 5000,
                          })
                        }
                      },
                    },
                    {
                      label: 'Decline',
                      icon: 'pi pi-times-circle',
                      creator: item.created_by.id.toString(),
                      status: item.status,
                      permission: 'btnPurchaseRequisitionDecline',
                      command: () => {
                        if (
                          this.checkPermission(
                            'btnPurchaseRequisitionDecline',
                            item.created_by.id.toString(),
                            item.status,
                          )
                        ) {
                          this.dataApproval('decline', item.id, item.code, item.__v)
                        } else {
                          this.coreStore.setToast({
                            severity: 'warn',
                            summary: 'Forbidden Method',
                            detail: 'You are not allowed to perform this action',
                            life: 5000,
                          })
                        }
                      },
                    },
                  ],
                },
                {
                  label: 'Edit',
                  icon: 'pi pi-file-edit',
                  creator: item.created_by.id.toString(),
                  status: item.status,
                  permission: 'btnPurchaseRequisitionEdit',
                  allowStatus: 'new',
                  command: () => {
                    if (
                      this.checkPermission(
                        'btnPurchaseRequisitionEdit',
                        item.created_by.id.toString(),
                        item.status,
                      )
                    ) {
                      this.dataEdit(item.id)
                    } else {
                      this.coreStore.setToast({
                        severity: 'warn',
                        summary: 'Forbidden Method',
                        detail: 'You are not allowed to edit',
                        life: 5000,
                      })
                    }
                  },
                },
                {
                  label: 'Delete',
                  icon: 'pi pi-trash',
                  creator: item.created_by.id.toString(),
                  status: item.status,
                  permission: 'btnPurchaseRequisitionDelete',
                  command: () => {
                    if (
                      this.checkPermission(
                        'btnPurchaseRequisitionDelete',
                        item.created_by.id.toString(),
                        item.status,
                      )
                    ) {
                      this.dataDelete(item.id)
                    } else {
                      this.coreStore.setToast({
                        severity: 'warn',
                        summary: 'Forbidden Method',
                        detail: 'You are not allowed to delete',
                        life: 5000,
                      })
                    }
                  },
                },
                {
                  separator: true,
                },
                {
                  label: 'Print',
                  icon: 'pi pi-print',
                  creator: item.created_by.id.toString(),
                  status: item.status,
                  permission: 'btnPurchaseRequisitionPrint',
                  command: async () => {
                    if (item.status !== 'approved') {
                      this.coreStore.setToast({
                        severity: 'warn',
                        summary: 'Forbidden Method',
                        detail: 'Document is not approved yet',
                        life: 5000,
                      })
                    } else {
                      this.ui.drawer.targetData = item
                      this.ui.drawer.visibility = true
                    }
                  },
                },
              ],
              status: this.ui.availStatus.find((statusItem) => statusItem.code === item.status),
            })),
          )

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
        path: `/procurement/purchase_requisition/edit/${id}`,
        query: {
          id: id,
        },
      })
    },
    async dataDelete(id: string) {
      const confirmation = this.$confirm
      confirmation.require({
        group: 'confirm_delete',
        header: 'Confirmation',
        message: `Delete data?`,
        acceptClass: 'p-button-danger',
        rejectClass: 'p-button-secondary',
        acceptIcon: 'pi pi-check-circle',
        acceptLabel: 'Yes',
        rejectLabel: 'Abort',
        rejectIcon: 'pi pi-times-circle',
        accept: async () => {
          await this.procurementPurchaseRequisitionStore.delete(id).then(async () => {
            await this.loadLazyData()
          })
        },
        reject: async () => {
          await this.loadLazyData()
        },
      })
    },
    async dataApproval(mode: string, id: string, code: string, v: number) {
      this.$dialog.open(FormPurchaseRequisitionApproval, {
        props: {
          header: 'Ask Purchase Requisition Approval',
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    processPrint(selectedPaperSize: any) {
      this.ui.drawer.visibility = false
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const item: any = this.ui.drawer.targetData
      console.clear()
      console.log(item)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const PRRef: any = this.$refs

      PRRef.printTemplatePurchaseRequisition
        .generateViewer({
          mr_code: item.material_requisition.code,
          pr_code: item.code,
          mr_transaction_date: this.formatDate(
            item.material_requisition.transaction_date,
            'DD MMMM YYYY, HH:mm',
          ),
          pr_transaction_date: this.formatDate(item.transaction_date, 'DD MMMM YYYY, HH:mm'),
          mr_requester_name: `${item.material_requisition.created_by.first_name} ${item.material_requisition.created_by.last_name}`,
          pr_requester_name: `${item.created_by.first_name} ${item.created_by.last_name}`,
          remark: item.remark ? `${item.remark.substring(0, 150)}...` : '-',
          approved_at: this.formatDate(
            item.approval_history[item.approval_history.length - 1].logged_at,
            'DD MMMM YYYY, HH:mm',
          ),
          approved_by: `${item.approval_history[item.approval_history.length - 1].created_by.first_name} ${item.approval_history[item.approval_history.length - 1].created_by.last_name}`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          detail: item.detail.map((printDetail: any) => ({
            name: printDetail.item.name,
            qty: printDetail.qty,
            unit: printDetail.unit.name,
            remark: printDetail.remark ? `${printDetail.remark.substring(0, 100)}...` : '-',
          })),
        })
        .then(async () => {
          const elements = this.$el.querySelectorAll('.print-container')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const hiddenElements = Array.from(elements).filter((element: any) => {
            return window.getComputedStyle(element).display === 'none'
          })

          const parser = new DOMParser()
          const htmlContent = hiddenElements
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((element: any) => {
              const doc = parser.parseFromString(element.outerHTML, 'text/html')
              const elements = doc.body.children
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              Array.from(elements).forEach((element: any) => {
                if (element.style.display === 'none') {
                  element.style.display = ''
                }
              })
              return doc.body.innerHTML
            })
            .join('')

          await PRRef.printModule.generateReport(
            {
              fileName: `purchase_requisition_${item.code}`,
              contentWidth: 241,
              orientation: selectedPaperSize.orientation,
              paperSize: selectedPaperSize.code,
              quality: 2,
              margin: 0,
            },
            htmlContent,
          )
        })
    },
  },
})
</script>
