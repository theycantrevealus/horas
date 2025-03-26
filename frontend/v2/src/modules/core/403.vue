<template>
  <div>
    403 Permission Denied <b class="text-red-500">[{{ target }}]</b><br />
    <router-link :to="previous">Return</router-link>
  </div>
</template>
<script lang="ts">
export default {
  name: 'PageUnauthorized',
  data() {
    return {
      target: '',
      previous: '/dashboard',
    }
  },
  mounted() {
    this.previous = this.$route.query.from
    this.target = this.$route.query.to
  },
}
</script>
