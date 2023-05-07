<template>
  <div>
    <vue3-html2pdf
      ref="html2Pdf"
      :show-layout="false"
      :enable-download="enableDownload"
      :preview-modal="previewModal"
      :paginate-elements-by-height="paginateElementsByHeight"
      :filename="fileName"
      :pdf-quality="quality"
      :manual-pagination="manualPagination"
      :pdf-format="paperSize"
      :pdf-orientation="orientation"
      :pdf-content-width="contentWidth"
      :pdf-margin="margin"

      @progress="onProgress($event)"
      @startPagination="startPagination()"
      @hasPaginated="hasPaginated()"
      @hasGenerated="hasGenerated($event)"
      @beforeDownload="beforeDownload($event)"
      @hasDownloaded="hasDownloaded($event)"
    >
      <template #pdf-content>
        <div class="print" v-html="targetPrint"></div>
      </template>
    </vue3-html2pdf>
  </div>
</template>
<script>
import Vue3Html2pdf from 'vue3-html2pdf'
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
    }
  },
  computed: {
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
      alert()
    },
    async beforeDownload ({ html2pdf, options, pdfContent }) {
      // await html2pdf().set(options).from(pdfContent).toPdf().get('pdf').then((pdf) => {
      // 	const totalPages = pdf.internal.getNumberOfPages()
      // 	for (let i = 1; i <= totalPages; i++) {
      // 		pdf.setPage(i)
      // 		pdf.setFontSize(10)
      // 		pdf.setTextColor(150)
      // 		pdf.text('Page ' + i + ' of ' + totalPages, (pdf.internal.pageSize.getWidth() * 0.88), (pdf.internal.pageSize.getHeight() - 0.3))
      // 	}
      // }).save()
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
