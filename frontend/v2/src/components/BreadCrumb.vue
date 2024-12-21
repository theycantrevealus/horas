<template>
  <div class="grid">
    <div class="col-fixed bread" style="width: auto">
      <div class="flex justify-content-start flex-wrap card-container blue-container">
        <div class="flex-wrap">
          <Chip :label="first_name + ' ' + last_name" :image="profile_photo" />
        </div>
        <h6 class="text-right pageName"><span class="material-icons">tag</span> {{ pageName }}</h6>
      </div>
    </div>
    <div class="col">
      <Breadcrumb :home="home" :model="items">
        <template #item="item">
          <div v-if="item.item.to === ''">
            <a>{{ item.item.label }}</a>
          </div>
          <div v-else>
            <router-link v-if="item.item.to !== '/dashboard'" :to="item.item.to">
              <span>{{ item.item.label }}</span>
            </router-link>
            <router-link v-else :to="item.item.to">
              <i class="pi pi-home"></i>
            </router-link>
          </div>
        </template>
      </Breadcrumb>
    </div>
  </div>
</template>
<script lang="ts">
import Breadcrumb from 'primevue/breadcrumb'
import Chip from 'primevue/chip'
import { mapStores } from 'pinia'
import { storeCore } from '@/store/index.js'
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
      first_name: '',
      last_name: '',
      profile_photo: '',
      home: { icon: 'pi pi-home', to: '/dashboard' },
    }
  },
  computed: {
    ...mapStores(storeCore),
  },
  created() {
    this.coreStore.$subscribe((mutation, state) => {
      this.first_name = state.auth.first_name
      this.last_name = state.auth.last_name
    })
  },
}
</script>
