// Reads a book page (or an Amazon search) in a hidden browser and prints what it found as JSON.
//
//   node lookup.mjs --amazon-search "The One Minute Architect Wiszowaty"
//   node lookup.mjs --page https://www.amazon.com/dp/8398263601
//   node lookup.mjs --page https://www.manning.com/books/grokking-algorithms-second-edition
//
// --amazon-search prints the top results with their format links (Paperback, Kindle, Hardcover).
// --page prints the page title, its og:* meta tags, Amazon's product block when present
// (title, byline, Product details, full-size cover URL), and the first 6000 characters of the page text.
import { run, withHeadlessPage } from './lib/browser.mjs'

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, '')] = argv[i + 1]
  return args
}

async function amazonSearch(page, query) {
  await page.goto('https://www.amazon.com/s?k=' + encodeURIComponent(query), { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 15000 }).catch(() => {})
  const results = await page.evaluate(() =>
    [...document.querySelectorAll('[data-component-type="s-search-result"]')]
      .filter((e) => !/Sponsored/.test(e.innerText.slice(0, 40)))
      .slice(0, 6)
      .map((e) => ({
        asin: e.dataset.asin,
        summary: e.innerText.split('\n').slice(0, 3).join(' | '),
        formats: [...e.querySelectorAll('a')]
          .filter((a) => /^(Paperback|Hardcover|Kindle)$/.test(a.innerText.trim()))
          .map((a) => ({ format: a.innerText.trim(), url: a.href.split('/ref=')[0] })),
      })),
  )
  return { query, results }
}

async function readPage(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  return await page.evaluate(() => {
    const meta = {}
    for (const m of document.querySelectorAll('meta[property^="og:"], meta[name^="og:"]'))
      meta[m.getAttribute('property') || m.getAttribute('name')] = m.content
    const img = document.querySelector('#landingImage')
    let cover = img?.getAttribute('data-old-hires') || null
    if (!cover && img?.getAttribute('data-a-dynamic-image')) {
      const sizes = Object.entries(JSON.parse(img.getAttribute('data-a-dynamic-image')))
      sizes.sort((a, b) => b[1][0] * b[1][1] - a[1][0] * a[1][1])
      cover = sizes[0]?.[0] ?? null
    }
    const details =
      document.querySelector('#detailBullets_feature_div') || document.querySelector('#productDetails_feature_div')
    const amazon = document.querySelector('#productTitle')
      ? {
          title: document.querySelector('#productTitle')?.innerText.trim(),
          byline: document.querySelector('#bylineInfo')?.innerText.trim(),
          details: details?.innerText.replace(/[\u200e\u200f]/g, '').trim(),
          cover,
        }
      : null
    return {
      url: location.href,
      pageTitle: document.title,
      og: meta,
      amazon,
      text: amazon ? undefined : document.body.innerText.slice(0, 6000),
    }
  })
}

run(async () => {
  const args = parseArgs(process.argv.slice(2))
  if (!args['amazon-search'] && !args.page) throw new Error('pass --amazon-search "<query>" or --page <url>')
  return withHeadlessPage((page) => (args.page ? readPage(page, args.page) : amazonSearch(page, args['amazon-search'])))
})
