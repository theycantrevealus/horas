export interface TPurchaseOrder {
  message: any[],
  ui: {
    dialog: {
      visible: boolean,
      header: string
    },
  },
  permission: {
    allowAdd: boolean,
    allowEdit: boolean,
    allowDelete: boolean,
    allowAsk: boolean,
    allowApprove: boolean,
    allowDecline: boolean,
  },
  loading: boolean,
  totalRecords: number,
  items: any[],
  filters: {
    code: { value: string, matchMode: string },
    'supplier.name': { value: string, matchMode: string },
  },
  lazyParams: any,
  status: {
    new: {
      class: string,
      caption: string
    },
    need_approval: {
      class: string,
      caption: string
    },
  },
  columns: [
    { field: string, header: string },
    { field: string, header: string },
    { field: string, header: string },
  ],
}

// export type TPurchaseOrder = {
//   _id: string
//   id: string
//   autonum:number
//   code: string
//   supplier: {
//     id: string,
//     code: string
//     name: string
//   }
//   purchase_date: string
//   total: number
//   discount_type: string
//   grand_total: number
//   status: string
//   remark: string
//   created_by: {
//     id: string
//     email: string
//     first_name: string
//     last_name: string
//   }
//   created_at: string
//   updated_at: string
//   deleted_at: string
//   __v: number
// }
