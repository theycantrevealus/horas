<template>
  <router-view />
</template>
<script>
import { toggle_confirm } from '@/utils/core/page.editing'

export default {
  name: 'LOV',
  beforeRouteLeave(to, from, next) {
    // toggle_confirm(this)
    // if(confirmZ) {
    //   next()
    // }
  }
}
</script>
