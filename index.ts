import { launch } from 'puppeteer'
import { readFileSync, writeFileSync, rmSync, mkdirSync, existsSync } from 'fs'
import { basename, extname, join, resolve } from 'path'
import type { PDFOptions, WaitForOptions } from 'puppeteer'

const exit = (c: number) => process.exit(c)
const outDir = join(process.cwd(), 'output')

type Input = { prefix?: string; urls: string[] }
type Options = {
  viewport: { width: number; height: number }
  goto: WaitForOptions
  pdf: PDFOptions
}

async function render(url: string, outputFile: string) {
  outputFile = join(outDir, outputFile)
  rmSync(outputFile, { force: true })
  console.log(`rendering ${url.slice(0, Math.min(50, url.length))}...`)
  const opts: Options = {
    viewport: { width: 1600, height: 1200 },
    goto: { waitUntil: 'networkidle0' },
    pdf: {
      format: 'A4',
      printBackground: true,
      margin: { top: '2cm', bottom: '2cm', left: '2cm', right: '2cm' },
    },
  }
  return launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
    .then((browser) => browser.newPage())
    .then((page) => page.goto(url, opts.goto).then(() => page))
    .then((page) => page.pdf(opts.pdf))
    .then((data) => writeFileSync(outputFile, data))
}

function getInput(file = 'pages.json'): Input {
  const input = JSON.parse(readFileSync(resolve(file), 'utf8')) as Input
  if (input.prefix && typeof input.prefix !== 'string') {
    console.warn('Prefix should be a string: `' + input.prefix + '`')
    exit(1)
  }
  input.urls = Array.isArray(input.urls) ? input.urls.map((v) => `${v}`) : []
  return input
}

const { prefix, urls } = getInput()

if (urls.length > 0 && !existsSync(outDir)) mkdirSync(outDir)

const tasks: Promise<any>[] = []
urls.forEach((url) => {
  url = prefix + url
  const output = basename(url, extname(url)) + '.pdf'
  tasks.push(
    render(url, output)
      .then(() => console.log('done:', output))
      .catch(console.log)
  )
})

Promise.all(tasks).finally(() => process.exit(0))
