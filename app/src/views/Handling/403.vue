<template>
  <div class="main-container p-grid vertical-container">
    <div class="p-col-12 handling_container">
      <div class="justify-content-center gap-2">
        <Image
          class="p-image handling_image"
          :src="require('@/assets/images/handling/403.svg')"
          alt="404"
        />
        <br /><br /><br /><br />
        Unauthorized page.
        <router-link :to="previous">Return</router-link>
      </div>
    </div>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import Image from 'primevue/image'
export default defineComponent({
  name: 'PageUnauthorized',
  components: { Image },
  data() {
    return {
      previous: '/dashboard'
    }
  },
  mounted() {
    this.previous = this.$route.query.from
  }
})
</script>
