<template>
    <div>
        <Card class="card-fluid">
            <template #header>
                <Toolbar>
                    <template #left>
                        <Button
                            v-if="permission.btnAddAuthority !== undefined"
                            label="New"
                            icon="pi pi-plus"
                            class="p-mr-2 p-button-rounded"
                        />
                    </template>

                    <template #right>
                        <Button
                            label="Upload"
                            icon="pi pi-upload"
                            class="p-button-success p-button-rounded"
                        />
                    </template>
                </Toolbar>
            </template>
            <template #content>
                awd
            </template>
        </Card>
    </div>
</template>
<script>
import Card from 'primevue/card'
import Button from 'primevue/button'
export default {
  components: {
    Card, Button
  },
  computed: {
    permission () {
      return this.$store.state.credential.permission
    }
  }
}
</script>
