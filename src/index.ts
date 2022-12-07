import puppeteer from 'puppeteer'
import { writeFileSync, rmSync } from 'fs'
import { basename, extname } from 'path'
import type { PDFOptions, WaitForOptions } from 'puppeteer'

type Options = {
  viewport: {
    width: number
    height: number
  }
  goto: WaitForOptions
  pdf: PDFOptions
}

async function render(url: string, outputFile: string) {
  rmSync(outputFile, { force: true })
  console.log(`rendering [${url}]...`)
  const opts: Options = {
    viewport: { width: 1600, height: 1200 },
    goto: { waitUntil: 'networkidle0' },
    pdf: {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '2cm',
        bottom: '2cm',
        left: '2cm',
        right: '2cm',
      },
    },
  }
  return puppeteer
    .launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    .then((browser) => browser.newPage())
    .then((page) => page.goto(url, opts.goto).then(() => page))
    .then((page) => page.pdf(opts.pdf))
    .then((data) => writeFileSync(outputFile, data))
}

const tasks: Promise<any>[] = []
const add = (url: string) => {
  const output = basename(url, extname(url)) + '.pdf'
  tasks.push(
    render(url, output)
      .then(() => console.log('done:', output))
      .catch(console.log)
  )
}

add('file:///Users/khang/uni/MA2202/tutorials/hw1.html')
add('file:///Users/khang/uni/MA2202/tutorials/hw2.html')
add('file:///Users/khang/uni/MA2202/tutorials/hw3.html')
add('file:///Users/khang/uni/MA2202/tutorials/hw4.html')

Promise.all(tasks).finally(() => process.exit(0))
