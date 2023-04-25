<template>
  <Button type="button" class="p-button-sm p-button-info" label="Print" icon="pi pi-print" text @click="closeDialog({ buttonType: 0 })"></Button>
  <Button type="button" class="p-button-sm p-button-success" label="Ok" icon="pi pi-check" autofocus @click="closeDialog({ buttonType: 1 })"></Button>
</template>

<script>
import Button from 'primevue/button'
export default {
  components: {
    Button
  },
  inject: ['dialogRef'],
  methods: {
    closeDialog(e) {
      this.dialogRef.close({
        ...this.dialogRef.data,
        ...e,
      });
    }
  }
};
</script>
