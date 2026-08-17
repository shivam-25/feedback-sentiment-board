/* Parser tests for file import. Run: npx tsx scripts/test-import.ts */
import { extractItems, parseDelimited, ImportError } from '../src/lib/fileImport'

let pass = 0
let fail = 0

function check(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got)
  const w = JSON.stringify(want)
  if (g === w) {
    pass++
    console.log(`  ok   ${name}`)
  } else {
    fail++
    console.log(`  FAIL ${name}\n       got  ${g}\n       want ${w}`)
  }
}

function throws(name: string, fn: () => unknown) {
  try {
    fn()
    fail++
    console.log(`  FAIL ${name} — expected an error, got none`)
  } catch (e) {
    if (e instanceof ImportError) {
      pass++
      console.log(`  ok   ${name} (${e.message})`)
    } else {
      fail++
      console.log(`  FAIL ${name} — wrong error type: ${e}`)
    }
  }
}

console.log('\nparseDelimited')
check('simple rows', parseDelimited('a,b\nc,d', ','), [['a', 'b'], ['c', 'd']])
check('trailing newline makes no empty row', parseDelimited('a,b\nc,d\n', ','), [['a', 'b'], ['c', 'd']])
check('CRLF line endings', parseDelimited('a,b\r\nc,d\r\n', ','), [['a', 'b'], ['c', 'd']])
check('quoted field with comma', parseDelimited('"x, y",z', ','), [['x, y', 'z']])
check('escaped quotes', parseDelimited('"he said ""hi""",z', ','), [['he said "hi"', 'z']])
check('newline inside quotes', parseDelimited('"line1\nline2",z', ','), [['line1\nline2', 'z']])
check('empty fields preserved', parseDelimited('a,,c', ','), [['a', '', 'c']])
check('tab delimiter', parseDelimited('a\tb\nc\td', '\t'), [['a', 'b'], ['c', 'd']])
check('single column', parseDelimited('one\ntwo\nthree', ','), [['one'], ['two'], ['three']])

console.log('\nCSV with a recognised header')
{
  const csv = `id,customer,review,rating
1,alice,"Box arrived crushed, two mugs broken",1
2,bob,Delivery was fast and the product is great,5
3,carol,"Still waiting. Tracking hasn't updated.",2`
  const r = extractItems(csv, 'reviews.csv')
  check('picks the review column', r.items, [
    'Box arrived crushed, two mugs broken',
    'Delivery was fast and the product is great',
    "Still waiting. Tracking hasn't updated.",
  ])
  check('summary names the column', r.summary.includes('column "review"'), true)
}

console.log('\nCSV with header variants')
{
  const r = extractItems('order_id,Customer Feedback\n1,Item was broken\n2,All good', 'f.csv')
  check('matches "Customer Feedback"', r.items, ['Item was broken', 'All good'])
}
{
  const r = extractItems('ticket_body,agent\nRefund never arrived,priya\nBox was wet,amit', 'f.csv')
  check('matches "ticket_body"', r.items, ['Refund never arrived', 'Box was wet'])
}

console.log('\nCSV with no recognised header')
{
  // No hint column: should pick the longest-text column and keep every row.
  const csv = `1,2026-01-01,The packaging was completely destroyed in transit and the item was ruined
2,2026-01-02,Absolutely delighted with the speed of delivery and the build quality`
  const r = extractItems(csv, 'raw.csv')
  check('picks longest column', r.items, [
    'The packaging was completely destroyed in transit and the item was ruined',
    'Absolutely delighted with the speed of delivery and the build quality',
  ])
  check('keeps first row as data', r.items.length, 2)
}

console.log('\nCSV edge cases')
{
  const r = extractItems('review\nfirst\n\n\nsecond\n', 'x.csv')
  check('blank rows skipped', r.items, ['first', 'second'])
}
{
  const r = extractItems('review\n"multi\n\nline cell"\nplain', 'x.csv')
  check('blank line inside a cell collapsed', r.items, ['multi\nline cell', 'plain'])
}
{
  const r = extractItems('feedback\n   \nreal text', 'x.csv')
  check('whitespace-only rows dropped', r.items, ['real text'])
}
throws('empty csv rejected', () => extractItems('', 'empty.csv'))
throws('header only, no data', () => extractItems('review\n', 'h.csv'))

console.log('\nTXT files')
{
  const r = extractItems('Item one is broken.\n\nItem two arrived late.\n\nItem three was fine.', 'a.txt')
  check('blank-line separated', r.items, ['Item one is broken.', 'Item two arrived late.', 'Item three was fine.'])
}
{
  const r = extractItems('one per line\nsecond line\nthird line\nfourth line', 'b.txt')
  check('one per line when no blank lines', r.items.length, 4)
}
{
  const r = extractItems('Just a single sentence of feedback.', 'c.txt')
  check('single item stays single', r.items, ['Just a single sentence of feedback.'])
}
{
  const r = extractItems('Para one line A\nline B\n\nPara two', 'd.txt')
  check('single newline inside a block preserved', r.items, ['Para one line A\nline B', 'Para two'])
}
throws('empty txt rejected', () => extractItems('   \n  \n', 'e.txt'))

console.log('\nRound trip through the textarea format')
{
  const r = extractItems('review\n"a, b"\n"c\n\nd"\ne', 'rt.csv')
  const joined = r.items.join('\n\n')
  const back = joined.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)
  check('items survive the textarea round trip', back.length, r.items.length)
  check('round trip content matches', back, r.items)
}

console.log(`\n${pass} passed, ${fail} failed\n`)
process.exit(fail === 0 ? 0 : 1)
