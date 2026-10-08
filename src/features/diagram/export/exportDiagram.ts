import type { LayoutDiagram } from '../layout/flowTypes'
import { localizeSvgReferences } from './exportStyle'
import { exportBounds, rasterSize } from './exportBounds'

function styledClone(element: Element): Element {
  const clone = element.cloneNode(false) as Element
  const computed = getComputedStyle(element)
  const style = Array.from(computed).map(property => `${property}:${localizeSvgReferences(computed.getPropertyValue(property))};`).join('')
  clone.setAttribute('style', `${style}animation:none;transition:none;`)
  if (element.classList.contains('is-dimmed')) (clone as HTMLElement | SVGElement).style.opacity = '1'
  // Computed styles do not include pseudo-elements such as the service accent rail.
  for (const selector of ['::before', '::after']) {
    const pseudo = getComputedStyle(element, selector)
    if (!pseudo.content || pseudo.content === 'none' || pseudo.content === 'normal') continue
    const decoration = document.createElement('span')
    decoration.setAttribute('style', Array.from(pseudo).map(property => `${property}:${pseudo.getPropertyValue(property)};`).join(''))
    decoration.textContent = pseudo.content === '""' || pseudo.content === "''" ? '' : pseudo.content.replace(/^['"]|['"]$/g, '')
    clone.append(decoration)
  }
  for (const child of element.childNodes) {
    if (child instanceof Element) {
      if (child.matches('.react-flow__handle, .edge-light, .edge-glow')) continue
      clone.append(styledClone(child))
    } else clone.append(child.cloneNode(true))
  }
  return clone
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Snapshot the native renderer with embedded styles; never serializes the source editor. */
export async function exportDiagram(root: HTMLElement, layout: LayoutDiagram, format: 'svg' | 'png') {
  await document.fonts.ready
  const viewport = root.querySelector('.react-flow__viewport')
  if (!viewport || !layout.nodes.length) throw new Error('Wait for the diagram to finish rendering before exporting.')
  const bounds = exportBounds(layout)
  const content = styledClone(viewport) as HTMLElement
  Object.assign(content.style, { transform: `translate(${-bounds.x}px, ${-bounds.y}px)`, transformOrigin: '0 0', width: `${bounds.width}px`, height: `${bounds.height}px`, position: 'absolute', overflow: 'visible' })
  // React Flow's edge SVG has screen dimensions; exported routes need the full graph dimensions.
  content.querySelectorAll<SVGElement>('.react-flow__edges > svg:not(.react-flow__marker)').forEach(svg => {
    svg.style.width = `${bounds.width}px`
    svg.style.height = `${bounds.height}px`
    svg.style.overflow = 'visible'
  })
  const container = document.createElement('div')
  container.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')
  Object.assign(container.style, { width: `${bounds.width}px`, height: `${bounds.height}px`, position: 'relative', overflow: 'hidden', background: layout.theme === 'dark' ? '#19211f' : '#f0f1eb' })
  container.append(content)
  const size = format === 'png' ? rasterSize(bounds.width, bounds.height) : bounds
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${bounds.width} ${bounds.height}"><foreignObject x="0" y="0" width="100%" height="100%">${new XMLSerializer().serializeToString(container)}</foreignObject></svg>`
  if (format === 'svg') { download(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), 'diagram.svg'); return }
  const image = new Image()
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = size.width; canvas.height = size.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser does not support PNG export.')
  context.drawImage(image, 0, 0, size.width, size.height)
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Unable to encode PNG. Try SVG instead.')), 'image/png'))
  download(blob, 'diagram.png')
}
