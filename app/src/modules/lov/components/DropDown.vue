<template>
  <div>
    <Dropdown
      v-model="selected"
      :disabled="disabled"
      :options="searchResult"
      :filter="true"
      :loading="loading"
      filter-match-mode="allow-all"
      placeholder="Select LOV"
      optionLabel="name"
      @change="onSelect"
      @filter="onFilter">
      <template #value="slotProps">
        <div v-if="slotProps.value" class="flex align-items-center">
          <div>{{ slotProps.value.name }}</div>
        </div>
        <span v-else>
            {{ slotProps.placeholder }}
        </span>
      </template>
      <template #option="slotProps">
        <div class="flex align-items-center">
          <div>{{ slotProps.option.name }}</div>
        </div>
      </template>
    </Dropdown>
  </div>
</template>
<script>
import Dropdown from 'primevue/dropdown'
import { FilterService } from "primevue/api"
import LOVService from "@/modules/lov/service"

FilterService.register('allow-all', () => true)
export default {
  name: 'DropdownLOV',
  components: {
    Dropdown
  },
  props: {
    selectedID: {
      required: false,
      type: String,
      default: ''
    },
    selectedName: {
      required: false,
      type: String,
      default: ''
    },
    disabled: {
      required: false,
      type: Boolean,
      default: true
    }
  },
  emits: ['onSelect'],
  data() {
    return {
      searchTerm: '',
      selected: {
        id: '',
        name: 'Select LOV'
      },
      searchResult: [],
      loading: true,
    }
  },
  created() {
    if(this.selectedName !== '') {
      this.selected = {
        id: this.selectedID ?? '',
        name: this.selectedName ?? ''
      }
    }
  },
  mounted() {
    this.loading = false
  },
  methods: {
    async onFilter(event) {
      this.loading = true
      await LOVService.findLOV(event.value).then((response) => {
        this.searchResult = response.data.payload.data
        this.loading = false
      })
    },
    onSelect(event) {
      this.$emit('onSelect', {
        id: this.selected.id,
        name: this.selected.name
      })
    }
  }
}
</script>
