<template>
  <div class="about">
    <h1>This is an about page</h1>
    <h5>Flex 1</h5>
    <p>Sets grow and shrink to 1 to auto grow and shrink while keeping flex-basis to 0.</p>
    <div class="card">
        <div class="card-container yellow-container overflow-hidden">
            <div class="flex">
                <div class="flex align-items-center justify-content-center bg-yellow-500 font-bold text-gray-900 m-2 px-5 py-3 border-round">Prime</div>
                <div class="flex align-items-center justify-content-center bg-yellow-500 font-bold text-gray-900 m-2 px-5 py-3 border-round">Prime and PrimeFlex</div>
                <div class="flex align-items-center justify-content-center bg-yellow-500 font-bold text-gray-900 m-2 px-5 py-3 border-round">Lorem ipsum dolor sit amet</div>
            </div>
            <div class="flex">
                <div class="flex-1 flex align-items-center justify-content-center bg-yellow-500 font-bold text-gray-900 m-2 px-5 py-3 border-round">Prime</div>
                <div class="flex-1 flex align-items-center justify-content-center bg-yellow-500 font-bold text-gray-900 m-2 px-5 py-3 border-round">Prime and PrimeFlex</div>
                <div class="flex-1 flex align-items-center justify-content-center bg-yellow-500 font-bold text-gray-900 m-2 px-5 py-3 border-round">Lorem ipsum dolor sit amet</div>
            </div>
        </div>
    </div>

  </div>
</template>
<script>
export default {
  name: 'About',
  mounted () {
    //
  },
  methods: {
    checkKey: function () {
      return ''
      // try {
      //   const checker = require('keys/*.pem')
      // } catch (e) {
      //   console.log(e)
      // }
    },
    uploadKey: function () {
      // const data = JSON.stringify(this.arr)
      // const fs = require('fs')
      // try {
      //   fs.writeFileSync('myfile.txt', data, 'utf-8')
      // } catch (e) {
      //   alert('Failed to save the file !')
      // }
    }
  }
}
</script>
