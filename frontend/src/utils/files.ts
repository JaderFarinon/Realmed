export const openBlobInNewTab = (blob: Blob) => {
  const objectUrl = URL.createObjectURL(blob)
  const newWindow = window.open(objectUrl, '_blank', 'noopener,noreferrer')

  if (!newWindow) {
    const link = document.createElement('a')
    link.href = objectUrl
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } else {
    newWindow.opener = null
  }

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl)
  }, 60_000)
}
