<template>
  <div>
    <label class="currency-label">{{ format(number) }}</label>
  </div>
</template>
<script>
import {mapGetters, mapState} from "vuex"

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
  },
  emits: ['display'],
  data() {
    return {}
  },
  computed: {
    ...mapGetters(['getBrowserLanguage'])
  },
  mounted() { },
  methods: {
    format(num) {
      return parseFloat(num).toLocaleString(`${this.lang.toLowerCase()}-${this.code.toLowerCase()}`, {
        style: 'currency',
        currency: this.currency.toUpperCase(),
      })
    }
  }
}
</script>
