<template>
  <div>
    404 Page Not Found <b class="text-red-500">[{{ target }}]</b><br />
    <router-link :to="previous">Return</router-link>
  </div>
</template>
<script lang="ts">
export default {
  name: 'PageNotFound',
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
