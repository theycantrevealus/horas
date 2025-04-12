// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function arrToObject(arr: any, parent = '') {
  return (
    arr
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((item: any) => item.parent === parent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => ({
        name: item.name,
        children: arrToObject(arr, item.name),
      }))
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deepen(obj: any) {
  const result = {}
  for (const objectPath in obj) {
    const parts = objectPath.split('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let target: any = result
    while (parts.length > 1) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const part: any = parts.shift()
      target = target[part] = target[part] || {}
    }
    target[parts[0]] = obj[objectPath]
  }

  return result
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parsedT(obj: any, level: any = '', identifier: any = '') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = []
  let current = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currLevel: any = level.split('-')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currIden: any = identifier.split('.')
  for (const a in obj) {
    data.push({
      key: level === '' ? `${current}` : `${currLevel.join('-')}-${current}`,
      label: a,
      icon: 'pi pi-folder',
      children: parsedT(
        obj[a],
        level === '' ? `${current}` : `${currLevel.join('-')}-${current}`,
        identifier === '' ? `${a}` : `${currIden.join('.')}.${a}`,
      ),
      data: identifier === '' ? `${a}` : `${currIden.join('.')}.${a}`,
    })
    current++
  }

  return sort(data, 'label')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sort(array: any[], target: any) {
  array.forEach(({ children = [] }) => sort(children, target))
  array.sort((a, b) => {
    if (a[target] === b[target]) {
      return 0
    } else {
      return a[target] < b[target] ? -1 : 1
    }
  })
  return array
}
