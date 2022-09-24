<template>
  <div class="grid">
    <div class="col-12">
      <Image
        class="p-image handling_image"
        :src="require('@/assets/images/handling/404.svg')"
        alt="404"
      />
    </div>
    <div class="col-12">Test Change</div>
    <div class="col-4">
      <card />
    </div>
    <div class="col-8">
      <card />
    </div>

    <div class="col-2">
      <card />
    </div>
    <div class="col-2">
      <card />
    </div>
    <div class="col-8">
      <card />
    </div>

    <div class="col-8">
      <card />
    </div>
    <div class="col-4">
      <card />
    </div>

    <div class="col-4">
      <card />
    </div>
    <div class="col-4">
      <card />
    </div>
    <div class="col-4">
      <card />
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import Card from 'primevue/card'
import Image from 'primevue/image'

export default defineComponent({
  name: 'Dashboard',
  components: {
    Card,
    Image,
  },
})
</script>
