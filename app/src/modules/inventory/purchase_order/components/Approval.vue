<template>
  <div class="flex flex-column gap-2">
    <label for="remark">Remark</label>
    <Textarea id="remark" v-model="remark" placeholder="Purchase order approval remark" autoResize rows="5" cols="30" @keyup="updateApproval" />
  </div>
</template>
<script>
import Textarea from 'primevue/textarea'
export default {
  components: {
    Textarea
  },
  inject: ['dialogRef'],
  data() {
    return {
      remark: ''
    }
  },
  mounted() {
    this.dialogRef.data = {
      remark: this.remark
    }
  },
  methods: {
    updateApproval() {
      this.dialogRef.data.remark = this.remark
    }
  },
}
</script>
