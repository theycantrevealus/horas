<template>
  <div class="handling-page">
    <div class="grid">
      <div class="col-6">
        <div class="p-6">
          <img src="@/assets/images/handling/404.svg" alt="403" width="400" style="float: right" />
        </div>
      </div>
      <div class="col-6">
        <div class="p-6">
          <h1 class="text-center" style="font-size: 62pt">404</h1>
          <h4 class="text-center">Not Found</h4>
          <br />
          <h5 class="text-center text-red-500">
            Oops! Looks like this page got lost in the matrix
          </h5>
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
