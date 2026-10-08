/** Browser computed SVG styles expand marker fragments into URLs pointing at the app. */
export function localizeSvgReferences(value: string): string {
  return value.replace(/url\((?:"([^"]*)"|'([^']*)'|([^)]*))\)/g, (match: string, double: string | undefined, single: string | undefined, bare: string | undefined) => {
    const url = double ?? single ?? bare ?? ''
    const hash = url.indexOf('#')
    return hash < 0 ? match : `url("${url.slice(hash)}")`
  })
}
