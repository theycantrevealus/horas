<template>
  <div class="main-container p-grid vertical-container">
    <div class="p-col-12">
      <center>
        <Image
          class="p-image handling_image"
          :src="require('@/assets/images/handling/403.svg')"
          alt="404"
        />
        <br />
        Awak ndak seharusnya disini.
        <router-link to="/dashboard">Balek kau!</router-link>
      </center>
    </div>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import Image from 'primevue/image'
export default defineComponent({
  name: 'PageUnauthorized',
  components: { Image },
})
</script>
