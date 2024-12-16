<template>
  <div v-if="!asCell" class="flex flex-row flex-wrap currency-container">
    <div class="flex-1">
      <label class="currency-label text-teal-400">
        <small>{{ formatted.currency }}</small>
      </label>
    </div>
    <div class="flex-1">
    </div>
    <div class="flex-1">
      <label class="currency-label">
        {{ formatted.value }}
      </label>
    </div>
  </div>
  <template v-else>
    <td class="wrap_content text-right {{ lastLiner ? 'last-liner': '' }}" :class="[lastLinerClass]">
      <label class="currency-label text-teal-400">
        <small>{{ formatted.currency }}</small>
      </label>
    </td>
    <td class="wrap_content text-right">
      <label class="currency-label">
        {{ formatted.value }}
      </label>
    </td>
  </template>
</template>
<script>
import { NumberParser } from '@/util/number'

export default {
  name: 'CurrencyLabel',
  props: {
    number: {
      type: Number,
      default: 0.00,
      required: true,
    },
    currency: {
      type: String,
      default: 'IDR',
      required: true
    },
    lang: {
      type: String,
      default: 'id',
      required: true
    },
    code: {
      type: String,
      default: 'ID',
      required: true
    },
    asCell: {
      type: Boolean,
      default: false
    },
    lastLiner: {
      type: Boolean,
      default: false
    }
  },
  emits: ['display'],
  data() {
    return {
      formatted: {},
      lastLinerClass: 'last-liner'
    }
  },
  mounted() {
    this.formatted = this.format(this.number)
    this.lastLinerClass = this.lastLiner ? 'last-liner': ''
  },
  methods: {
    format(num) {
      const option = {
        style: 'currency',
        currencyDisplay: 'symbol',
        minimumFractionDigits: 2,
        currency: this.currency.toUpperCase(),
      }
      const formatter = new Intl.NumberFormat(`${this.lang.toLowerCase()}-${this.code.toUpperCase()}`, option)
      const parser = new NumberParser(`${this.lang.toLowerCase()}-${this.code.toUpperCase()}`, num, option)
      return {
        currency: parser._currency,
        value: parser.parse(formatter.format(num))
      }
    }
  }
}
</script>
