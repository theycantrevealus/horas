<template>
  <div class="grid ai-start vertical-container">
    <div class="col">
      <div class="col-6 col-offset-3">
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
