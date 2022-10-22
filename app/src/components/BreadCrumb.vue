<template>
  <div class="grid">
    <div
      class="col-fixed bread"
      style="width:auto"
    >
      <div class="flex justify-content-start flex-wrap card-container blue-container">
        <div class="flex-wrap">
          <Chip
            :label="first_name + ' ' + last_name"
            :image="profile_photo"
          />
        </div>
        <h6 class="text-right pageName">
          <span class="material-icons">hashtag</span> {{ pageName }}
        </h6>

      </div>

    </div>
    <div class="col">
      <Breadcrumb
        :home="home"
        :model="items"
      />
    </div>
  </div>
</template>
<script>
import Breadcrumb from 'primevue/breadcrumb'
import Chip from 'primevue/chip'
export default {
  name: 'BreadCrumb',
  components: {
    Breadcrumb,
    Chip,
  },
  props: {
    items: {
      type: Array,
      default: [],
    },
    pageName: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      home: { icon: 'pi pi-home', to: '/dashboard' },
    }
  },
  computed: {
    profile_photo() {
      return this.$store.state.credential.profile_photo
    },
    first_name() {
      return this.$store.state.credential.first_name
    },
    last_name() {
      return this.$store.state.credential.last_name
    },
  },
}
</script>
