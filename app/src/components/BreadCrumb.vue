<template>
  <div class="grid">
    <div class="col-fixed" style="width:auto">
      <h6 class="text-right pageName">
        <span class="material-icons">hashtag</span> {{ pageName }}
      </h6>
    </div>
    <div class="col">
      <Breadcrumb :home="home" :model="items" />
    </div>
  </div>
</template>
<script>
import Breadcrumb from 'primevue/breadcrumb'
export default {
  name: 'BreadCrumb',
  components: {
    Breadcrumb
  },
  props: {
    items: Array,
    pageName: String
  },
  data () {
    return {
      home: { icon: 'pi pi-home', to: '/dashboard' }
    }
  }
}
</script>
