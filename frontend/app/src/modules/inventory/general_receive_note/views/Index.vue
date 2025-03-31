<template>
  <div>
    <Card class="card-fluid">
      <template #content>
        <Panel
          header="General Receive Note Management"
          :toggleable="false"
        >
          <template #icons>
            <Toolbar>
              <template #start>
                <i class="pi pi-filter p-toolbar-separator mr-2" />
              </template>
              <template #end>
                <Dropdown
                  id="statuses"
                  v-model="ui.dropdown.status.selected"
                  :options="ui.dropdown.status.options"
                  optionLabel="name"
                  placeholder="Status"
                  class="p-inputtext-sm"
                  @change="loadLazyData">
                  <template #option="slotProps">
                    {{ slotProps.option.name }}
                  </template>
                  <template #value="slotProps">
                    {{ slotProps.value.name }}
                  </template>
                </Dropdown>
              </template>
            </Toolbar>
          </template>
          <transition-group name="p-message" tag="div">
            <Message v-for="msg of messages" :key="msg.id" :severity="msg.severity">
              <div class="">
                <strong>{{ msg.content }}</strong><br /><Button link text size="small" label="Refresh list" class="p-button-link p-button-sm no-padding" @click="loadLazyData" />
              </div>
            </Message>
          </transition-group>
          <DataTable
            ref="dt"
            v-model:filters="filters"
            :value="items"
            :lazy="true"
            :paginator="true"
            :rows="10"
            :rowsPerPageOptions="[5, 10, 20, 50]"
            :totalRecords="totalRecords"
            :loading="loading"
            filterDisplay="row"
            :globalFilterFields="['code', 'supplier', 'total', 'created_by']"
            responsiveLayout="scroll"
            @page="onPage($event)"
            @sort="onSort($event)"
            @filter="onFilter($event)"
          >
            <Column
              header="#"
              class="text-right"
              style="width: 150px"
            >
              <template #body="slotProps">
                <strong class="d-inline-flex">
                  <span class="material-icons-outlined material-symbols-outlined">tag</span>
                  {{ slotProps.data.autonum }}
                </strong>
              </template>
            </Column>
            <Column header="Action" class="wrap_content">
              <template #body="slotProps">
              <span class="p-buttonset">
                <Button
                  class="p-button-info p-button-sm p-button-raised"
                  @click="purchaseOrderDetail($event, slotProps.data)"
                >
                  <span class="material-icons">remove_red_eye</span> View
                </Button>
                <Button
                  class="p-button-success p-button-sm p-button-raised"
                  @click="receivePurchaseOrder($event, slotProps.data.id)"
                >
                  <span class="material-icons">receipt_long</span> Receive
                </Button>
              </span>
              </template>
            </Column>
            <Column
              ref="created_at"
              field="created_at"
              header="Created Date"
              :sortable="true"
            >
              <template #body="slotProps">
                <b>{{ formatDate(slotProps.data.created_at, 'DD MMMM YYYY') }}, <b class="text-purple-500">{{ formatDate(slotProps.data.created_at, 'HH:mm') }}</b></b>
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
              ref="supplier"
              field="supplier"
              header="Supplier Name"
              filterField="supplier"
              filterMatchMode="contains"
              :sortable="true"
            >
              <template #filter="{ filterModel, filterCallback }">
                <InputText
                  v-model="filterModel.value"
                  type="text"
                  class="column-filter"
                  placeholder="Search by supplier"
                  @keydown.enter="filterCallback()"
                />
              </template>
              <template #body="slotProps">
                <b>{{ slotProps.data.supplier.code }}</b> - {{ slotProps.data.supplier.name }}
              </template>
            </Column>
            <Column
              ref="created_by"
              field="created_by"
              header="PO Created By"
              :sortable="true"
            >
              <template #body="slotProps">
                <b>{{ slotProps.data.created_by.last_name }}, {{ slotProps.data.created_by.first_name }}</b>
              </template>
            </Column>
          </DataTable>
        </Panel>
      </template>
      <template #footer></template>
    </Card>
    <ConfirmPopup></ConfirmPopup>
    <DynamicDialog />
  </div>
</template>

<script>
import DateManagement from '@/modules/function'
import Card from 'primevue/card'
import ConfirmPopup from 'primevue/confirmpopup'
import Panel from 'primevue/panel'
import DataTable from 'primevue/datatable'
import DynamicDialog from 'primevue/dynamicdialog'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Toolbar from 'primevue/toolbar'
import PurchaseOrderService from '@/modules/inventory/purchase_order/service'
import {mapGetters, mapState} from "vuex"
import { markRaw, defineAsyncComponent } from 'vue'

const DetailFooter = defineAsyncComponent(() => import('@/modules/inventory/purchase_order/components/DetailFooter.vue'))
const Detail = defineAsyncComponent(() => import('@/modules/inventory/purchase_order/components/Detail.vue'))

export default {
  components: {
    DataTable,
    Column,
    InputText,
    Button,
    Toolbar,
    DynamicDialog,
    Card,
    Panel,
    Message,
    ConfirmPopup,
    Dropdown,
  },
  data() {
    return {
      messages: [],
      socketLib: {
        core: {
          PO_I_S0000: 'New purchase order submitted',
          PO_U_S0000: 'Purchase order updated',
          PO_D_S0000: 'Purchase order deleted',
          PO_A_S0000: 'Purchase order approved',
          PO_R_S0000: 'Purchase order declined',
          PO_N_S0000: 'Purchase order need to review'
        }
      },
      ui: {
        dialog: {
          visible: false,
          header: ''
        },
        dropdown: {
          status: {
            selected: { id: 'all', name: 'All' },
            options: [
              { id: 'all', name: 'All' },
              { id: 'new', name: 'New' },
              { id: 'need_approval', name: 'Need Approval' },
              { id: 'approved', name: 'Approved' },
              { id: 'declined', name: 'Declined' }
            ]
          }
        }
      },
      permission: {
        allowAdd: false,
        allowEdit: false,
        allowDelete: false,
        allowAsk: true,
        allowApprove: false,
        allowDecline: false,
      },
      loading: false,
      totalRecords: 0,
      items: [],
      filters: {
        code: { value: '', matchMode: 'contains' },
        supplier: { value: '', matchMode: 'contains' },
        total: { value: '', matchMode: 'contains' },
      },
      lazyParams: {},
      status: {
        new: {
          class: 'text-cyan-500',
          severity: 'info',
          caption: 'New'
        },
        need_approval: {
          class: 'text-yellow-500',
          severity: 'warning',
          caption: 'Need Approval'
        },
        approved: {
          class: 'text-green-500',
          severity: 'success',
          caption: 'Approved'
        },
        declined: {
          class: 'text-red-500',
          severity: 'danger',
          caption: 'Declined'
        },
      },
      columns: [
        { field: 'code', header: 'Code' },
        { field: 'supplier', header: 'Name' },
        { field: 'created_at', header: 'Created Date' },
      ],
    }
  },
  computed: {
    ...mapGetters({
      credential: 'storeCredential/Getter___credential',
    }),
  },
  watch: {
    //
  },
  async mounted() {
    await this.sockets.subscribe('data_result', (request) => {
      const data = request.payload
      const sender = request.sender
      const receiver = request.receiver
      if(sender.id === this.credential.id) {

      } else {
        this.messages = []
        this.messages.push({ severity: 'info', content: data.message, id: 1, status: data.statusCode })
      }

    })
    this.permission.allowAdd = !(!this.credential.permission['btnPurchaseOrderAdd'])
    this.permission.allowEdit = !(!this.credential.permission['btnPurchaseOrderEdit'])
    this.permission.allowDelete = !(!this.credential.permission['btnPurchaseOrderDelete'])
    this.permission.allowApprove = !(!this.credential.permission['btnPurchaseOrderApprove'])
    this.permission.allowDecline = !(!this.credential.permission['btnPurchaseOrderDecline'])

    this.lazyParams = {
      first: 0,
      rows: this.$refs.dt.rows,
      sortField: 'created_at',
      sortOrder: 1,
      filters: this.filters,
    }

    this.messages = []

    this.loadLazyData()
  },
  methods: {
    purchaseOrderDetail(event, parameter) {
      this.$dialog.open(Detail, {
        props: {
          header: 'Purchase Order Detail',
          style: {
            width: '90vw'
          },
          breakpoints: {
            '960px': '75vw',
            '640px': '90vw'
          },
          modal: true,
        },
        data: {
          payload: parameter
        },
        templates: {
          footer: markRaw(DetailFooter)
        },
        onClose: async (options) => {
          const data = options.data;

          if (data) {
            const buttonType = data.buttonType;
            if(buttonType === 0) {
              let stylesHtml = '';
              for (const node of [...document.querySelectorAll('link[rel="stylesheet"], style')]) {
                stylesHtml += node.outerHTML;
              }

              const WinPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');

              WinPrint.document.write(`<!DOCTYPE html><html><head>${stylesHtml}</head><body>${data.print.html}</body></html>`);

              WinPrint.document.close();
              WinPrint.focus();
              WinPrint.print();
              WinPrint.close();
            }
          }
        }
      })
    },
    round(num, roundCount) {
      return parseFloat(num).toFixed(roundCount)
    },
    receivePurchaseOrder(event, id) {
      this.$router.push({
        path: `/inventory/general_receive_note/add/${id}`,
        query: {
          id: id
        }
      })
    },
    formatDate(date, format) {
      return DateManagement.formatDate(date, format)
    },
    loadLazyData() {
      this.loading = true
      this.items = []

      if(this.messages.length > 0) {
        if(this.messages[0].status === 'PO_I_S0000') {
          this.ui.dropdown.status.selected = { id: 'all', name: 'All' }
          this.filters.status = { value: 'new', matchMode: 'equals' }
        } else if(this.messages[0].status === 'PO_N_S0000') {
          this.ui.dropdown.status.selected = { id: 'need_approval', name: 'Need Approval' }
          this.filters.status = { value: 'need_approval', matchMode: 'equals' }
        } else if(this.messages[0].status === 'PO_A_S0000') {
          this.ui.dropdown.status.selected = { id: 'approved', name: 'Approved' }
          this.filters.status = { value: 'approved', matchMode: 'equals' }
        } else if(this.messages[0].status === 'PO_R_S0000') {
          this.ui.dropdown.status.selected = { id: 'declined', name: 'Declined' }
          this.filters.status = { value: 'declined', matchMode: 'equals' }
        }

        this.lazyParams.sortField = 'created_at'
        this.lazyParams.sortOrder = -1
      } else {
        if(this.ui.dropdown.status.selected.id !== 'all') {
          this.filters.status = { value: this.ui.dropdown.status.selected.id, matchMode: 'equals' }
        } else {
          delete this.filters.status
        }
      }

      this.lazyParams.filters = this.filters
      this.messages = []



      PurchaseOrderService.getUncompletedList(this.lazyParams).then((response) => {
        if (response) {
          const data = response.data.payload.data
          const totalRecords = response.data.payload.totalRecords
          this.items = data
          this.totalRecords = totalRecords
        } else {
          this.items = []
          this.totalRecords = 0
        }
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
