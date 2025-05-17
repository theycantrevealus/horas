<template>
  <div class="print-container" style="width: 100%; display: none">
    <table border="1" style="width: 100%">
      <thead>
        <tr>
          <th rowspan="2" class="wrap_content">
            <h2>
              <img
                class="panel-logo2"
                :style="{ width: '45px', padding: '1px' }"
                :src="logo[layoutColorMode].icon.target ?? ''"
                alt="HORAS"
              />
            </h2>
          </th>
          <th class="wrap_content">Code Ref</th>
          <th class="input">{{ code }}</th>
          <th class="wrap_content">Requester</th>
          <th class="input">{{ requester_name }}</th>
          <th rowspan="2" style="padding: 2px; width: 10%">
            <h2>MATERIAL<br />REQUISITION</h2>
          </th>
        </tr>
        <tr>
          <th class="wrap_content">Request Date</th>
          <th class="input">{{ transaction_date }}</th>
          <th class="wrap_content">Requester Stock Point</th>
          <th class="input">{{ requester_stock_point }}</th>
        </tr>
      </thead>
    </table>
    <table border="1">
      <tbody>
        <tr>
          <th class="wrap_content">No</th>
          <th style="width: 75%">Item</th>
          <th class="wrap_content">@</th>
          <th class="wrap_content">Unit</th>
        </tr>
        <tr v-for="(item, index) in detail" :key="index" class="detail-item">
          <td class="input">{{ index + 1 }}</td>
          <td class="input">
            {{ item.name }}<br />
            <p class="item-remark" v-html="item.remark"></p>
          </td>
          <td class="input text-right">{{ item.qty }}</td>
          <td class="input wrap_content">{{ item.unit }}</td>
        </tr>
      </tbody>
    </table>
    <table border="1">
      <tbody>
        <tr>
          <td colspan="2">Remark</td>
          <td colspan="1" class="wrap_content">Approved At</td>
          <td class="input wrap_content">{{ approved_at }}</td>
        </tr>
        <tr>
          <td colspan="2" class="input"><p class="item-remark" v-html="remark"></p></td>
          <td colspan="1" class="wrap_content">Approved By</td>
          <td class="input wrap_content">{{ approved_by }}</td>
        </tr>
      </tbody>
    </table>
    <table class="signer" border="1">
      <tbody>
        <tr>
          <td>Sign:</td>
          <td>Sign:</td>
        </tr>
        <tr>
          <td class="input">Requested by : {{ requester_name }}</td>
          <td class="input">Approved by : {{ approved_by }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
<script lang="ts">
import ImageManagement from '@/utils/core/image'
import { storeCore } from '@/store'
import { mapStores } from 'pinia'
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'PrintTemplateMaterialRequisition',
  data() {
    return {
      layoutColorMode: 'light' as 'light' | 'dark',
      logo: {
        light: {
          image: {
            target: '',
            size: {
              sidepanel: {
                width: '',
                height: '',
              },
            },
          },
          icon: {
            target: '',
            size: {
              sidepanel: {
                width: '',
                height: '',
              },
            },
          },
        },
        dark: {
          image: {
            target: '',
            size: {
              sidepanel: {
                width: '',
                height: '',
              },
            },
          },
          icon: {
            target: '',
            size: {
              sidepanel: {
                width: '',
                height: '',
              },
            },
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      code: '<code>',
      transaction_date: '<transaction_date>',
      requester_name: '<requester_name>',
      requester_stock_point: '<requester_stock_point>',
      remark: '<remark>',
      approved_at: '<approved_at>',
      approved_by: '<approved_by>',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      detail: [] as any,
    }
  },
  computed: {
    ...mapStores(storeCore),
  },
  created() {
    this.coreStore.$subscribe(async (_mutation, state) => {
      const darkMode = state.setting.dark

      if (darkMode) {
        this.layoutColorMode = 'dark'
        document.body.classList.add('dark')
      } else {
        this.layoutColorMode = 'light'
        document.body.classList.remove('dark')
      }

      this.logo.light = state.setting.logo.light
      this.logo.dark = state.setting.logo.dark

      this.logo.light.icon.target = await this.formatImage(this.logo.light.icon.target)

      // alert(this.logo[this.layoutColorMode].icon.target)
    })
  },
  methods: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async generateViewer(configuration: any) {
      this.code = configuration.code
      this.transaction_date = configuration.transaction_date
      this.requester_name = configuration.transaction_date
      this.requester_name = configuration.requester_name
      this.requester_stock_point = configuration.requester_stock_point
      this.remark = configuration.remark
      this.approved_at = configuration.approved_at
      this.approved_by = configuration.approved_by
      this.detail = configuration.detail
    },
    formatImage(url: string) {
      return ImageManagement.getImageDataUrl(url)
    },
  },
})
</script>
