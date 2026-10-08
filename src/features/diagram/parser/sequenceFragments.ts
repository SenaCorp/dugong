import type { ParserError, SequenceFragment } from '../types/diagram'

export function createSequenceFragments() {
  const fragments: SequenceFragment[] = []
  const stack: { fragment: SequenceFragment; line: number; source: string }[] = []
  return {
    fragments,
    parse(line: string, lineNumber: number, source: string, messageCount: number): boolean {
      const opening = /^(alt|loop|opt)(?:\s+(.*))?$/.exec(line)
      if (opening) {
        const kind = opening[1] as SequenceFragment['kind']
        const label = opening[2]?.trim()
        if (!label) throw new Error(`Give ${kind} a condition or description.`)
        const parentId = stack.at(-1)?.fragment.id
        const fragment: SequenceFragment = { id: `fragment-${fragments.length + 1}`, kind, ...(parentId ? { parentId, parentBranchIndex: stack.at(-1)!.fragment.branches.length - 1 } : {}), branches: [{ label, start: messageCount, end: messageCount }] }
        fragments.push(fragment); stack.push({ fragment, line: lineNumber, source })
        return true
      }
      if (line === 'else' || line.startsWith('else ')) {
        const open = stack.at(-1)?.fragment
        if (!open || open.kind !== 'alt') throw new Error('else needs an open alt block.')
        open.branches.at(-1)!.end = messageCount
        open.branches.push({ label: line.slice(4).trim() || 'Otherwise', start: messageCount, end: messageCount })
        return true
      }
      if (line === 'end') {
        const open = stack.pop()
        if (!open) throw new Error('Unexpected end: no open sequence block.')
        open.fragment.branches.at(-1)!.end = messageCount
        return true
      }
      return false
    },
    memberships() { return stack.map(({ fragment }) => ({ fragmentId: fragment.id, branchIndex: fragment.branches.length - 1 })) },
    finish(messageCount: number): ParserError[] {
      return stack.map(open => {
        open.fragment.branches.at(-1)!.end = messageCount
        return { line: open.line, source: open.source, message: `Close this ${open.fragment.kind} block with end.` }
      })
    },
  }
}
