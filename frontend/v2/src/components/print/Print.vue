<template>
  <div>
    <!-- <vue3-html2pdf
      ref="html2Pdf"
      :enable-download="enableDownload"
      :filename="fileName"
      :manual-pagination="manualPagination"
      :paginate-elements-by-height="paginateElementsByHeight"
      :pdf-content-width="contentWidth"
      :pdf-format="paperSize"
      :pdf-margin="margin"
      pdf-orientation="landscape"
      :pdf-quality="quality"
      :preview-modal="previewModal"
      :show-layout="false"
      @beforeDownload="beforeDownload($event)"
      @hasDownloaded="hasDownloaded($event)"
      @hasGenerated="hasGenerated($event)"
      @hasPaginated="hasPaginated()"
      @progress="onProgress($event)"
      @startPagination="startPagination()"
      :html-to-pdf-options="{
        width: '80%',
      }"
    >
      <template #pdf-content>
        <div v-html="targetPrint"></div>
        <div ref="printFooter"></div>
      </template>
    </vue3-html2pdf> -->
    <vue3-html2pdf
      :show-layout="false"
      :float-layout="true"
      :enable-download="enableDownload"
      :preview-modal="previewModal"
      :paginate-elements-by-height="paginateElementsByHeight"
      :filename="fileName"
      :pdf-quality="quality"
      :manual-pagination="manualPagination"
      :pdf-format="paperSize"
      :pdf-orientation="orientation"
      :pdf-content-width="contentWidth"
      pdf-margin="0"
      @hasDownloaded="hasDownloaded($event)"
      @hasGenerated="hasGenerated($event)"
      @hasPaginated="hasPaginated()"
      @progress="onProgress($event)"
      @startPagination="startPagination()"
      ref="html2Pdf"
      :html-to-pdf-options="{
        filename: `${fileName}.pdf`,
        jsPDF: {
          useCORS: true,
          unit: 'mm',
          format: paperSize,
          orientation: orientation,
        },
      }"
    >
      <template #pdf-content>
        <div v-html="targetPrint"></div>
        <div ref="printFooter"></div>
      </template>
    </vue3-html2pdf>
  </div>
</template>
<script lang="ts">
import { storeCore } from '@/store'
import Vue3Html2pdf from 'vue3-html2pdf'
import { mapStores } from 'pinia'
import { defineComponent } from 'vue'

// import * as jsPDF from 'jspdf'

export default defineComponent({
  name: 'PrintModule',
  components: {
    Vue3Html2pdf,
  },
  props: {
    //
  },
  data() {
    return {
      paperSizes: {
        tractor_feed_margin: 10,
        con_long: {
          inches: [0, 0],
          mm: [241, 280],
        },
        con_medium: {
          inches: [0, 0],
          mm: [241, 140],
        },
        con_small: {
          inches: [0, 0],
          mm: [241, 93],
        },
        '9x11': {
          inches: [9, 11],
          mm: [228.6, 279.4],
        },
        '14.4x11': {
          inches: [14.4, 11],
          mm: [365.76, 279.4],
        },
        'A4 Continuous': {
          inches: [8.27, 11.69],
          mm: [210, 297],
        },
        'Letter Continuous': {
          inches: [8.5, 11],
          mm: [215.9, 279.4],
        },
        'Legal Continuous': {
          inches: [8.5, 14],
          mm: [215.9, 355.6],
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
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
      },
      // server_image: process.env.VUE_APP_IMAGE.toString(),
      targetPrint: null,
      fileName: 'test.pdf',
      quality: 2,
      margin: 0,
      paginateElementsByHeight: 1400,
      enableDownload: false,
      previewModal: true,
      manualPagination: false,
      contentRendered: false,
      contentWidth: '800px',
      orientation: 'landscape',
      paperSize: 'a4',
      progress: 0,
      generatingPdf: false,
      pdfDownloaded: false,
    }
  },
  created() {
    this.coreStore.$subscribe((_mutation, state) => {
      const darkMode = state.setting.dark

      if (darkMode) {
        document.body.classList.add('dark')
      } else {
        document.body.classList.remove('dark')
      }

      this.logo.light = state.setting.logo.light
      this.logo.dark = state.setting.logo.dark
    })
  },
  computed: {
    ...mapStores(storeCore),
    htmlToPdfOptions() {
      return {
        margin: this.margin,
        filename: `${this.fileName}.pdf`,
        image: {
          type: 'jpeg',
          quality: this.quality,
        },
        enableLinks: false,
        html2canvas: {
          // scale: this.paperSize,
          useCORS: true,
        },
        jsPDF: {
          unit: 'in',
          format: this.paperSize,
          orientation: this.orientation ?? 'landscape',
        },
      }
    },
  },
  mounted() {
    // this.generateReport()
  },
  methods: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async generateReport(configuration: any, targetPrint: any) {
      this.fileName = configuration.fileName
      this.quality = configuration.quality ?? 2
      this.margin = configuration.margin
      this.enableDownload = configuration.enableDownload ?? false
      this.previewModal = configuration.previewModal ?? true
      this.manualPagination = configuration.manualPagination ?? false
      this.orientation = configuration.orientation ?? 'landscape'
      // this.contentWidth = configuration.contentWidth ?? '800px'
      this.contentWidth = `${configuration.contentWidth - this.paperSizes.tractor_feed_margin * 2}mm`
      // this.paperSize = configuration.paperSize ?? 'a4'
      this.paperSize = this.paperSizes[configuration.paperSize]
        ? this.paperSizes[configuration.paperSize].mm
        : 'a4'
      this.targetPrint = targetPrint
      //
      if (!(await this.validateControlValue())) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const htmlRef: any = this.$refs
      htmlRef.html2Pdf.generatePdf()
    },
    domRendered() {
      this.contentRendered = true
    },
    onProgress(progress: number) {
      this.progress = progress
    },
    startPagination() {},
    hasPaginated() {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    hasGenerated(event: any) {
      //
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async beforeDownload({ html2pdf, options, pdfContent }: any) {
      await html2pdf()
        .set(options)
        .from(pdfContent)
        .toPdf()
        .get('pdf')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((pdf: any) => {
          const totalPages = pdf.internal.getNumberOfPages()
          for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i)
            pdf.setFontSize(7)
            // pdf.fromHTML('<b>TEsting</b>', 0, 0, );
            pdf.setTextColor(150)
            // pdf.text('Page ' + i + ' of ' + totalPages, (pdf.internal.pageSize.getWidth() * 0.88), (pdf.internal.pageSize.getHeight() - 0.3))
            pdf.text(
              'Page ' + i + ' of ' + totalPages,
              pdf.internal.pageSize.getWidth() * 0.88,
              0.5,
            )
          }
        })
        .save(`${this.fileName}.pdf`)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    hasDownloaded(blobPdf: any) {
      this.pdfDownloaded = true
    },
    async validateControlValue() {
      if (this.quality > 2) {
        alert('pdf-quality value should only be 0 - 2')
        this.quality = 2
        return false
      }
      if (!this.paginateElementsByHeight) {
        alert('paginate-elements-by-height value cannot be empty')
        this.paginateElementsByHeight = 1400
        return false
      }
      // const paperSizes = [
      //   'a0',
      //   'a1',
      //   'a2',
      //   'a3',
      //   'a4',
      //   'letter',
      //   'legal',
      //   'a5',
      //   'a6',
      //   'a7',
      //   'a8',
      //   'a9',
      //   'a10',
      // ]
      // if (!this.paperSizes[this.paperSize]) {
      //   this.paperSize = 'a4'
      //   return false
      // }

      if (!this.orientation) {
        this.orientation = 'landscape'
        return false
      }

      if (!this.contentWidth) {
        this.contentWidth = '800px'
        return false
      }
      return true
    },
  },
})
</script>
