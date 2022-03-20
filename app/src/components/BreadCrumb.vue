<template>
  <div class="p-grid">
    <div class="p-col-fixed" style="width:auto">
      <h6 class="p-text-right pageName">
        <span class="material-icons">hashtag</span> {{ pageName }}
      </h6>
    </div>
    <div class="p-col">
      <Breadcrumb :home="home" :model="items" />
    </div>
  </div>
</template>
<script>
import Breadcrumb from 'primevue/breadcrumb'
export default {
  name: 'BreadCrumb',
  props: {
    items: Array,
    pageName: String
  },
  data () {
    return {
      home: { icon: 'pi pi-home', to: '/dashboard' }
    }
  },
  components: {
    Breadcrumb
  }
}
</script>
