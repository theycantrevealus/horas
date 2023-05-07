<template>
  <div class="flex card-container indigo-container">
    <div class="flex-2 h-4rem font-bold text-center">
      <img
        :style="{ width: `${application['APPLICATION_LOGO'].size.print.width}` }"
        :src="`${application['APPLICATION_LOGO'].image}`"
        class="print-logo"
        alt="horas"
      />
    </div>
    <div class="flex-1 h-4rem text-center mx-4">
      <h3>{{ titlePrimary }}</h3>
      <small>{{ titleSecondary }}</small>
    </div>
    <div class="flex-2 h-4rem text-right">
      <strong>{{ dialogRef.data.payload.supplier.code }}</strong> - {{ dialogRef.data.payload.supplier.name }}<br />
      <small>{{ dialogRef.data.payload.code }}</small>
    </div>
  </div>
</template>
<script>
import {mapGetters} from "vuex"

export default {
  name: 'PrintHeader',
  computed: {
    ...mapGetters({
      application: 'storeApplication/Getter___applicationConfig',
    }),
  },
}
</script>
