import { launch } from 'puppeteer'
import { readFileSync, writeFileSync, rmSync, mkdirSync, existsSync } from 'fs'
import { join, resolve } from 'path'
import type { PDFOptions, WaitForOptions } from 'puppeteer'

const exit = (c: number) => process.exit(c)
const outDir = join(process.cwd(), 'output')

type Print = { url: string; out: string; margin?: string }
type Input = { prefix: string; print: Print[] }
type RenderProps = { url: string; out: string; margin: string }
type Options = {
  viewport: { width: number; height: number }
  goto: WaitForOptions
  pdf: PDFOptions
}

async function render(p: RenderProps) {
  p.out = join(outDir, p.out)
  rmSync(p.out, { force: true })
  console.log(`rendering ${p.url.slice(0, Math.min(50, p.url.length))}...`)
  const opts: Options = {
    viewport: { width: 1600, height: 1200 },
    goto: { waitUntil: 'networkidle0' },
    pdf: {
      format: 'A4',
      printBackground: true,
      margin: {
        top: p.margin,
        bottom: p.margin,
        left: p.margin,
        right: p.margin,
      },
    },
  }
  return launch({
    product: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
    .then((browser) => browser.newPage())
    .then((page) => page.goto(p.url, opts.goto).then(() => page))
    .then((page) => page.pdf(opts.pdf))
    .then((data) => writeFileSync(p.out, data))
}

function assert(b: boolean, msg: string) {
  if (b) return
  console.warn(msg)
  exit(1)
}

function getInput(file = 'print.json'): Input {
  const x = JSON.parse(readFileSync(resolve(file), 'utf8')) as Input
  assert(!!x.print, 'Supply a list of print jobs.')
  x.prefix = x.prefix || ''
  return x
}

const { prefix, print } = getInput()

if (print.length > 0 && !existsSync(outDir)) mkdirSync(outDir)

const tasks: Promise<any>[] = []
print.forEach(({ url, margin, out }) => {
  url = prefix + url
  tasks.push(
    render({ url, out, margin: margin || '2cm' })
      .then(() => console.log('done:', out))
      .catch(console.log)
  )
})

Promise.all(tasks).finally(() => process.exit(0))
