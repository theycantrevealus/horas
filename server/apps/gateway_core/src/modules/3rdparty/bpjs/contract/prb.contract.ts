
export interface PrbContract {
  noSep: string
  alamat: string
  kodeDPJP: string
  keterangan: string
  saran: string
  obat: IObat[]
}

export interface IObat {
  kdObat: string
  signa1: string
  signa2: string
  jmlObat: string
}
