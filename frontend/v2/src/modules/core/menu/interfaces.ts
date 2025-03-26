export interface MenuParameterAdd {
  name: string
  menu_group: object
  identifier: string
  url: string
  remark: string
  parent: object
  icon: string
  show_order: number
  level: number
  group_color: string
  permission: object
  show_on_menu: boolean
}

export interface MenuParameterEdit extends MenuParameterAdd {
  __v: number
}
