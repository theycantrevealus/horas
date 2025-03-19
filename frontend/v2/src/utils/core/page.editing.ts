export function toggle_confirm(parent: any) {
  parent.$confirm.require({
    header: 'Data changes confirmation',
    message:
      'Seems like you are editing some data on this page. Please save it first or it will discarded',
    acceptClass: 'p-button-danger',
    acceptLabel: 'Discard',
    rejectLabel: 'Keep Editing',
    rejectClass: 'p-button-success',
    accept: async () => {
      //
    },
    reject: () => {
      // Reject
    },
  })
}
