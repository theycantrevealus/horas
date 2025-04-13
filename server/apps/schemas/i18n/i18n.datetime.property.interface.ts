export interface Ii18nDatetimeProperty {
  weekday?: 'narrow' | 'short' | 'long'
  era?: 'narrow' | 'short' | 'long'
  year?: '2-digit' | 'numeric'
  month?: '2-digit' | 'numeric' | 'narrow' | 'short' | 'long'
  day?: '2-digit' | 'numeric'
  hour?: '2-digit' | 'numeric'
  minute?: '2-digit' | 'numeric'
  second?: '2-digit' | 'numeric'
  timezone_name?: 'short' | 'long'
}
