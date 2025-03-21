<template>
  <label class="currency-label {{className}}">{{ format(number) }}{{ prefix }}</label>
</template>
<script lang="ts">
import { NumberParser } from '@/utils/core/number.ts'
export default {
  name: 'NumberLabel',
  props: {
    number: {
      type: Number,
      default: 0.0,
      required: true,
    },
    currency: {
      type: String,
      default: 'IDR',
      required: true,
    },
    lang: {
      type: String,
      default: 'id',
      required: true,
    },
    code: {
      type: String,
      default: 'ID',
      required: true,
    },
    prefix: {
      type: String,
      default: '',
      required: false,
    },
    decimal: {
      type: Number,
      default: 2,
      required: false,
    },
    className: {
      type: String,
      default: '',
      required: false,
    },
  },
  emits: ['display'],
  mounted() {},
  methods: {
    format(num) {
      const formatter = new Intl.NumberFormat(
        `${this.lang.toLowerCase()}-${this.code.toUpperCase()}`,
        {
          minimumFractionDigits: this.decimal,
        },
      )
      const parser = new NumberParser(`${this.lang.toLowerCase()}-${this.code.toUpperCase()}`, num)
      return parser.parse(formatter.format(num))
    },
  },
}
</script>
