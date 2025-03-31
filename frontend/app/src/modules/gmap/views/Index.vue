<template>
  <div>
    <Card class="card-fluid">
      <template #content>
        <div style="width: 100%; height: 400px; background: red;">
          <GMapMap :center="center" :zoom="7" @click="mapClick">
            <GMapCluster>
              <GMapMarker :key="index" v-for="(m, index) in markers" :position="m.position" :clickable="true"
                :draggable="true" @click="center = m.position" />
            </GMapCluster>
          </GMapMap>
        </div>
      </template>
    </Card>
  </div>
</template>
<script>
import Card from 'primevue/card'
export default {
  name: 'App',
  components: {
    Card
  },
  methods: {
    mapClick (event) {
      //
    }
  },
  data () {
    return {
      center: { lat: 3.5953722929713754, lng: 98.67763389749032 },
      markers: [
        {
          position: {
            lat: 3.5953722929713754, lng: 98.67763389749032
          }
        }
      ]
    }
  }
}
</script>
<style scoped>
.vue-map-container {
  width: 100%;
  height: 100%;
}
</style>
