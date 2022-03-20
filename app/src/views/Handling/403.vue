<template>
  <div class="p-grid p-ai-start vertical-container">
    <div class="p-col">
      <div class="p-col-6 p-offset-3">
        <center>
          <Image className="handling_image" :src="require('@/assets/images/handling/403.svg')" alt="404" />
          <br />
          Awak ndak seharusnya disini. <router-link to="/dashboard">Balek kau!</router-link>
        </center>
      </div>
    </div>
  </div>
</template>
<script>
import Image from 'primevue/image'
export default {
  name: 'PageUnauthorized',
  components: {
    Image
  }
}
</script>
