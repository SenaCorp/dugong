import { expect, it } from 'vitest'
import { localizeSvgReferences } from './exportStyle'

it('makes arrow references independent of the application URL', () => {
  expect(localizeSvgReferences('url("http://localhost:5173/#color=#737c79&width=11")')).toBe('url("#color=#737c79&width=11")')
})
it('preserves quoted parentheses and existing fragment references', () => {
  expect(localizeSvgReferences("url('#color=rgb(1, 2, 3)')")).toBe('url("#color=rgb(1, 2, 3)")')
  expect(localizeSvgReferences('url(#arrow)')).toBe('url("#arrow")')
  expect(localizeSvgReferences('none')).toBe('none')
})
