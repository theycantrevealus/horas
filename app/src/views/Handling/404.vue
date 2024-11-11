<template>
  <div class="main-container p-grid vertical-container">
    <div class="p-col-12 handling_container">
      <div class="flex flex-wrap justify-content-center gap-2">
        <Image
          class="p-image handling_image"
          :src="require('@/assets/images/handling/404.svg')"
          alt="404"
        />
        <br /><br /><br /><br />
        Page not found.
        <router-link to="/dashboard">Balek dulu lah ke dashboard</router-link>
      </div>
    </div>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import Image from 'primevue/image'

export default defineComponent({
  name: 'PageNotFound',
  components: { Image },
})
</script>
