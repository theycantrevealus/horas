<template>
  <div>
    <div id="po-print" ref="POPrint">
      <div class="purchase-order-detail-header">
        <div class="flex card-container indigo-container">
          <div class="flex-2 h-4rem font-bold text-center">

          </div>
          <div class="flex-1 h-4rem mx-4">
            <h3>PURCHASE ORDER</h3>
            <small>{{ new Date(dialogRef.data.payload.created_at).toDateString() }}</small>
            <small>. Created by <strong>{{ dialogRef.data.payload.created_by.last_name }}, {{ dialogRef.data.payload.created_by.first_name }}</strong></small>
          </div>
          <div class="flex-2 h-4rem text-right">
            <strong>{{ dialogRef.data.payload.supplier.code }}</strong> - {{ dialogRef.data.payload.supplier.name }}<br />
            <small>{{ dialogRef.data.payload.code }}</small>
          </div>
        </div>
        <small>{{ data.purchase_date }}</small>
      </div>
      <hr />
      <div class="purchase-order-items print-content">
        <table class="calculation">
          <thead>
          <tr>
            <th class="wrap_content text-left">No</th>
            <th class="text-left">Description</th>
            <th class="text-right">Quantity</th>
            <th class="text-right" colspan="2">Discount</th>
            <th class="text-right" colspan="2">Unit Price</th>
            <th class="text-right" colspan="2">Line Total</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(item, i) of dialogRef.data.payload.detail" :key="i">
            <td>{{ i + 1 }}</td>
            <td>{{ item.item.name }}</td>
            <td class="text-right">
              <NumberLabel :number="parseFloat(item.qty)" :code="`id`" :currency="`IDR`" :lang="`ID`" />
            </td>
            <template v-if="item.discount_type === 'v'">
              <CurrencyLabel :number="parseFloat(item.discount_value)" :code="`id`" :currency="`IDR`" :asCell="true" :lang="`ID`" />
            </template>
            <template v-if="item.discount_type === 'p'">
              <td></td>
              <td class="text-right">
                <NumberLabel :number="parseFloat(item.discount_value)" :code="`id`" :currency="`IDR`" :prefix="'%'" :lang="`ID`" />
              </td>
            </template>
            <template v-if="item.discount_type === 'n'">
              <td></td>
              <td class="text-right">
                <NumberLabel :number="parseFloat(0)" :code="`id`" :currency="`IDR`" :lang="`ID`" />
              </td>
            </template>
            <CurrencyLabel :number="parseFloat(item.price)" :code="`id`" :currency="`IDR`" :asCell="true" :lang="`ID`" />
            <CurrencyLabel :number="parseFloat(item.total)" :code="`id`" :currency="`IDR`" :asCell="true" :lang="`ID`" :lastLiner="true" />
          </tr>
          </tbody>
          <tbody>
          <tr>
            <td colspan="7" class="text-right">
              <strong>TOTAL</strong>
            </td>
            <CurrencyLabel :number="parseFloat(dialogRef.data.payload.total)" :code="`id`" :currency="`IDR`" :asCell="true" :lang="`ID`" :lastLiner="true" />
          </tr>
          <tr>
            <td colspan="7" class="text-right">
              <strong>DISCOUNT</strong>
            </td>
            <template v-if="dialogRef.data.payload.discount_type === 'v'">
              <CurrencyLabel :number="parseFloat(dialogRef.data.payload.discount_value)" :code="`id`" :currency="`IDR`" :asCell="true" :lang="`ID`" :lastLiner="true" />
            </template>
            <template v-if="dialogRef.data.payload.discount_type === 'p'">
              <td colspan="2" class="text-right last-liner">
                <NumberLabel :number="parseFloat(dialogRef.data.payload.discount_value)" :code="`id`" :currency="`IDR`" :prefix="'%'" :lang="`ID`" />
              </td>
            </template>
            <template v-else>
              <td colspan="2" class="text-right last-liner">
                <NumberLabel :number="parseFloat(0)" :code="`id`" :currency="`IDR`" :lang="`ID`" :lastLiner="true" />
              </td>
            </template>
          </tr>
          <tr>
            <td colspan="7" class="text-right">
              <strong>GRAND TOTAL</strong>
            </td>
            <CurrencyLabel :number="parseFloat(dialogRef.data.payload.grand_total)" :code="`id`" :currency="`IDR`" :asCell="true" :lang="`ID`" :lastLiner="true" />
          </tr>
          </tbody>
        </table>
        <hr />
        <div class="flex card-container indigo-container">
          <div class="flex-1 p-4">
            <strong>Remark:</strong><br />
            <p>{{ dialogRef.data.payload.remark }}</p>
          </div>
        </div>
      </div>
    </div>
    <div class="print-panel">
      <Button type="button" class="p-button-sm p-button-info" label="Print" icon="pi pi-print" text @click="closeDialog({ buttonType: 0 })"></Button>
    </div>
  </div>
</template>
<script>
import {createApp, defineAsyncComponent} from "vue"
import {mapGetters, mapState} from "vuex"
import Button from 'primevue/button'
// import { NumberLabel } from '@/components/Number.vue'
// import { CurrencyLabel } from '@/components/currency/Label.vue'

const NumberLabel = defineAsyncComponent(() => import('@/components/Number.vue'))
const CurrencyLabel = defineAsyncComponent(() => import('@/components/currency/Label.vue'))
export default {
  components: {
    Button,
    CurrencyLabel,
    NumberLabel
  },
  inject: ['dialogRef'],
  data() {
    return {
      data: {}
    }
  },
  computed: {
    ...mapGetters({
      application: 'storeApplication/Getter___applicationConfig',
    }),
  },
  unmounted() {

  },
  mounted() {
    //
  },
  methods: {
    closeDialog(e) {
      const rawHTML = this.$el.innerHTML
      // const pattern = / class=".*?"|<!--.*?-->/gm
      const pattern = /<span class="p-button-icon.*?<\/button>| style=".*?"|<!--.*?-->/gm
      this.dialogRef.data.print = rawHTML.replace(pattern, '')
      this.dialogRef.close({
        ...this.dialogRef.data,
        ...e,
      });
    }
  },
}
</script>
