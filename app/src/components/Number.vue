<template>
  <div>
    <label class="currency-label">{{ format(number) }}{{ prefix }}</label>
  </div>
</template>
<script>
import { NumberParser } from '@/util/number'
export default {
  name: 'NumberLabel',
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
    prefix: {
      type: String,
      default: '',
      required: false
    }
  },
  emits: ['display'],
  mounted() { },
  methods: {
    format(num) {
      const formatter = new Intl.NumberFormat(`${this.lang.toLowerCase()}-${this.code.toUpperCase()}`, {
        minimumFractionDigits: 2,
      })
      const parser = new NumberParser(`${this.lang.toLowerCase()}-${this.code.toUpperCase()}`, num)
      return parser.parse(formatter.format(num))
    }
  }
}
</script>
