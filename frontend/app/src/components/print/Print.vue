<template>
  <div>
    <vue3-html2pdf
      ref="html2Pdf"
      :enable-download="enableDownload"
      :filename="fileName"
      :manual-pagination="manualPagination"
      :paginate-elements-by-height="paginateElementsByHeight"
      :pdf-content-width="contentWidth"
      :pdf-format="paperSize"
      :pdf-margin="margin"
      :pdf-orientation="orientation"
      :pdf-quality="quality"
      :preview-modal="previewModal"
      :show-layout="false"

      @beforeDownload="beforeDownload($event)"
      @hasDownloaded="hasDownloaded($event)"
      @hasGenerated="hasGenerated($event)"
      @hasPaginated="hasPaginated()"
      @progress="onProgress($event)"
      @startPagination="startPagination()"
    >
      <template #pdf-content>
        <div class="print-container">
          <div :style="{'background-image': `url(${server_image}dotted.png)`}" class="print-left-1"></div>
          <div :style="{'background-image': `url(${server_image}dotted.png)`}" class="print-left-2"></div>
          <div :style="{'background-image': `url(${server_image}dotted.png)`}" class="print-right-1"></div>
          <div :style="{'background-image': `url(${server_image}dotted.png)`}" class="print-right-2"></div>
          <div class="print-logo">
            <img
              :src="`${application['APPLICATION_LOGO'].setter.image}`"
              :style="{ width: `${application['APPLICATION_LOGO'].setter.size.print.width}` }"
              alt="horas"
              class="print-logo"
            />
          </div>
          <!-- eslint-disable vue/no-v-html -->
          <div class="print" v-html="targetPrint"></div>
          <!--eslint-enable-->
          <div class="print-sign">
            <div class="grid">
              <div v-for="(item, i) of signer" :key="i" class="col">
                <div class="sign-box">
                  <small>
                    <strong>{{ item.surname }}</strong><br />
                    <label>{{ item.position }}</label>
                  </small>
                </div>
              </div>
            </div>
          </div>
          <div ref="printFooter">
            <div class="print-footer">
              Powered by : {{ application['APPLICATION_NAME'].setter }} {{ application['APPLICATION_VERSION'].setter }}
            </div>
          </div>
        </div>
      </template>
    </vue3-html2pdf>
  </div>
</template>
<script>
import Vue3Html2pdf from 'vue3-html2pdf'
import {mapGetters} from "vuex"
export default {
  name: 'PrintModule',
  components: {
    Vue3Html2pdf
  },
  props: {
    //
  },
  data() {
    return {
      server_image: process.env.VUE_APP_IMAGE.toString(),
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
      orientation: 'portrait',
      paperSize: 'a4',
      progress: 0,
      generatingPdf: false,
      pdfDownloaded: false,
      signer: []
    }
  },
  computed: {
    ...mapGetters({
      application: 'storeApplication/Getter___applicationConfig',
    }),
    htmlToPdfOptions() {
      return {
        margin: this.margin,
        filename: this.fileName,
        image: {
          type: "jpeg",
          quality: this.quality,
        },
        enableLinks: false,
        html2canvas: {
          scale: this.paperSize,
          useCORS: true,
        },
        jsPDF: {
          unit: "in",
          format: this.paperSize,
          orientation: this.orientation,
        },
      };
    },
  },
  mounted() {
    // this.generateReport()
  },
  methods: {
    async generateReport (configuration, targetPrint) {
      this.fileName = configuration.fileName
      this.quality = configuration.quality ?? 2
      this.margin = configuration.margin
      this.enableDownload = configuration.enableDownload ?? false
      this.previewModal = configuration.previewModal ?? true
      this.manualPagination = configuration.manualPagination ?? false
      this.orientation = configuration.orientation ?? 'portrait'
      this.contentWidth = configuration.contentWidth ?? '800px'
      this.paperSize = configuration.paperSize ?? 'a4'
      this.targetPrint = targetPrint
      this.signer = configuration.signer
      //
      if (!(await this.validateControlValue())) return;
      this.$refs.html2Pdf.generatePdf()

    },
    domRendered() {
      this.contentRendered = true;
    },
    onProgress(progress) {
      this.progress = progress;
    },
    startPagination() {
    },
    hasPaginated () {
    },
    hasGenerated() {
      //
    },
    async beforeDownload ({ html2pdf, options, pdfContent }) {
      // await html2pdf().set(options).from(pdfContent).toPdf().get('pdf').then((pdf) => {
      //   const totalPages = pdf.internal.getNumberOfPages()
      //   const pageTemplate = ""
      //   for (let i = 1; i <= totalPages; i++) {
      //     pdf.setPage(i)
      //     pdf.setFontSize(7)
      //     // pdf.fromHTML('<b>TEsting</b>', 0, 0, );
      //     pdf.setTextColor(150)
      //     // pdf.text('Page ' + i + ' of ' + totalPages, (pdf.internal.pageSize.getWidth() * 0.88), (pdf.internal.pageSize.getHeight() - 0.3))
      //     pdf.text('Page ' + i + ' of ' + totalPages, (pdf.internal.pageSize.getWidth() * 0.88), .5)
      //   }
      // }).save(`${this.fileName}.pdf`)
    },
    hasDownloaded (blobPdf) {
      this.pdfDownloaded = true
    },
    async validateControlValue() {
      if (this.quality > 2) {
        alert("pdf-quality value should only be 0 - 2");
        this.quality = 2;
        return false;
      }
      if (!this.paginateElementsByHeight) {
        alert("paginate-elements-by-height value cannot be empty");
        this.paginateElementsByHeight = 1400;
        return false;
      }
      const paperSizes = [
        "a0",
        "a1",
        "a2",
        "a3",
        "a4",
        "letter",
        "legal",
        "a5",
        "a6",
        "a7",
        "a8",
        "a9",
        "a10",
      ];
      if (!paperSizes.includes(this.paperSize)) {
        alert(`pdf-format value should only be ${paperSizes}`);
        this.paperSize = "a4";
        return false;
      }
      if (!this.orientation) {
        alert("pdf-orientation value cannot be empty");
        this.orientation = "portrait";
        return false;
      }
      if (!this.contentWidth) {
        alert("pdf-content-width value cannot be empty");
        this.contentWidth = "800px";
        return false;
      }
      return true;
    },
  }
}
</script>
