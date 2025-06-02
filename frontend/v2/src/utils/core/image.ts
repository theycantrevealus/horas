class ImageManagement {
  getImageDataUrl(url: string) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('GET', url, true)
      xhr.responseType = 'blob'
      xhr.onload = () => {
        if (xhr.status === 200) {
          const reader = new FileReader()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          reader.onload = () => resolve(reader.result as any)
          reader.onerror = reject
          reader.readAsDataURL(xhr.response)
        } else {
          reject(xhr.statusText)
        }
      }
      xhr.send()
    })
  }
}

export default new ImageManagement()
