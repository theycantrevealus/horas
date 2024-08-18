export interface IMenuTree {
  id: string
  name: string
  url: string
  icon: string
  group_color: string
  level: number
  show_on_menu: boolean
  show_order: number
  items: IMenuTree[]
}

export interface IMenuTreeManager {
  id: string
  key: string
  label: string
  to: string
  show_on_menu: boolean
  data: any
  icon: string
  children: IMenuTreeManager[]
}
