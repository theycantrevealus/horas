<template>
  <div class="grid ai-start vertical-container">
    <div class="col">
      <div class="col-6 offset-3">
        <center>
          <image
            class-name="handling_image"
            :src="require('@/assets/images/handling/404.svg')"
            alt="404"
          />
          <br />
          Gak nampak halaman yang ente cari.
          <router-link to="/dashboard">Balek dulu lah ke dashboard</router-link>
        </center>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  name: 'PageNotFound',
  components: {},
};
</script>
