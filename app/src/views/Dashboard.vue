<template>
  <div class="grid">
    <div class="col-12">
    </div>
    <div class="col-4">
      <div class="grid">
        <div class="col-12">
          <Card><template #content><span>{{ $t('message.hello') }}</span></template></Card>
        </div>
        <div class="col-6">
          <Card><template #content><span>{{ $t('label.header1') }}</span></template></Card>
        </div>
        <div class="col-6">
          <card />
        </div>
        <div class="col-12">
          <card />
        </div>
      </div>
    </div>
    <div class="col-8">
      <div class="grid">
        <div class="col-12">
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
        <div class="col-6">
          <card />
        </div>
        <div class="col-6">
          <card />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import Card from 'primevue/card'

export default defineComponent({
  name: 'Dashboard',
  components: {
    Card,
  },
})
</script>
