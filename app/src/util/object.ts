export function arrToObject(arr, parent = '') {
  return arr
    .filter((item) => item.parent === parent)
    .map((item) => ({
      name: item.name,
      children: arrToObject(arr, item.name),
    }))
}

export function deepen(obj) {
  const result = {}
  for (const objectPath in obj) {
    const parts = objectPath.split('.')
    let target = result
    while (parts.length > 1) {
      const part: any = parts.shift()
      target = target[part] = target[part] || {}
    }
    target[parts[0]] = obj[objectPath]
  }

  return result
}

export function parsedT(obj, level: any = '', identifier: any = '') {
  const data: any = []
  let current = 0
  const currLevel: any = level.split('-')
  const currIden: any = identifier.split('.')
  for (const a in obj) {
    data.push({
      key: level === '' ? `${current}` : `${currLevel.join('-')}-${current}`,
      label: a,
      icon: 'pi pi-folder',
      children: parsedT(
        obj[a],
        level === '' ? `${current}` : `${currLevel.join('-')}-${current}`,
        identifier === '' ? `${a}` : `${currIden.join('.')}.${a}`
      ),
      data: identifier === '' ? `${a}` : `${currIden.join('.')}.${a}`,
    })
    current++
  }

  return sort(data, 'label')
}

export function sort(array, target) {
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
