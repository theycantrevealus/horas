type TCoreMenuAdd = {
  request: string,
  icon: string,
  caption: string,
  grouper: number,
  targetLink: string,
  remark: string,
  parent: number,
  showOnMenu: string
}

type TCoreMenuDelete = {
  request: string,
  id: number
}

export { TCoreMenuDelete, TCoreMenuAdd }
