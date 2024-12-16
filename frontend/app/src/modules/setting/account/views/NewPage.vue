<template>
  <div class="grid">
    <div class="col-12">
      <Card>
        <template #title>Page Sample</template>
        <template #content>
          <div>Page Sample</div>
        </template>
      </Card>
    </div>
  </div>
</template>
<script>
import Card from 'primevue/card'
export default {
  name: 'NewPage',
  components: {
    Card
  }
}
</script>