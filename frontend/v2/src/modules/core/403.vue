<template>
  <div class="handling-page">
    <div class="grid">
      <div class="col-6">
        <div class="p-6">
          <img src="@/assets/images/handling/403.svg" alt="403" width="400" style="float: right" />
        </div>
      </div>
      <div class="col-6">
        <div class="p-6">
          <h1 class="text-center" style="font-size: 62pt">403</h1>
          <h4 class="text-center">Forbidden</h4>
          <br />
          <h5 class="text-center text-red-500">Sorry, you're not allowed here. [{{ target }}]</h5>
          <br />
          <center>
            <router-link :to="previous">Return</router-link>
          </center>
        </div>
      </div>
    </div>
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
