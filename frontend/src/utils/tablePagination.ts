export function tableCapacity(height: number, headerHeight = 48, desktop = true, rowHeight = 48) {
  return desktop ? Math.max(1, Math.floor((height - headerHeight - 2) / rowHeight)) : 10
}
export function fitPage(page: number, size: number, count: number) {
  return Math.max(1, Math.min(page, Math.max(1, Math.ceil(count / size))))
}
