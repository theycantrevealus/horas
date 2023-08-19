import * as process from 'process'

export const BPJSConfig = () => ({
  vclaim: {
    host: process.env.BPJS_VCLAIM_HOST,
    kode_ppk: process.env.BPJS_VCLAIM_KODE_PPK,
    user_key: process.env.BPJS_VCLAIM_USERKEY,
    secret: process.env.BPJS_VCLAIM_CONS_SECRET,
    api_id: process.env.BPJS_VCLAIM_API_ID,
    service_name: process.env.BPJS_VCLAIM_SERVICE,
  },
  applicares: {
    host: process.env.BPJS_APPLICARES_HOST,
    kode_ppk: process.env.BPJS_APPLICARES_KODE_PPK,
    secret: process.env.BPJS_APPLICARES_SECRET,
    api_id: process.env.BPJS_APPLICARES_API_ID,
  },
})
