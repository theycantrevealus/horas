<template>
  <div class="main-container p-grid vertical-container">
    <div class="p-col-12">
      <center>
        <Image
          class="p-image handling_image"
          :src="require('@/assets/images/handling/404.svg')"
          alt="404"
        />
        <br />
        Gak nampak halaman yang ente cari.
        <router-link to="/dashboard">Balek dulu lah ke dashboard</router-link>
      </center>
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
