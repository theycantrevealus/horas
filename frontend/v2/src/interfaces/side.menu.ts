export interface SideMenuItem {
  id: string
  name: string
  label: string
  class: string
  style: string
  to: string
  icon: string
  target: string
  disabled: boolean
  badge: string
  separator: string
  show_on_menu: boolean
  items: SideMenuItem[]
}
