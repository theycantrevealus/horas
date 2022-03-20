<template>
  <div class="p-grid p-ai-start vertical-container">
    <div class="p-col">
      <div class="p-col-6 p-offset-3">
        <center>
          <Image className="handling_image" :src="require('@/assets/images/handling/404.svg')" alt="404" />
          <br />
          Gak nampak halaman yang ente cari. <router-link to="/dashboard">Balek dulu lah ke dashboard</router-link>
        </center>
      </div>
    </div>
  </div>
</template>
<script>
import Image from 'primevue/image'
export default {
  name: 'PageNotFound',
  components: {
    Image
  }
}
</script>
