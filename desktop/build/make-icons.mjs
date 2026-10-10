// Builds the Windows app/installer icons from the Hoqooq logo:
//   build/icon.png  1024×1024 (logo centred on a transparent square)
//   build/icon.ico  multi-size .ico (16–256 px) for the exe and installer
//   app/icon.png    window icon used at runtime
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = path.dirname(fileURLToPath(import.meta.url))
const source = path.resolve(here, '../../public/logo.png')
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

async function squareLogo(size) {
  const inner = Math.round(size * 0.92)
  const logo = await sharp(source).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer()
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer()
}

// ICO container with embedded PNG images (supported since Windows Vista).
function buildIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  const entries = []
  let offset = 6 + images.length * 16
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(data.length, 8)
    entry.writeUInt32LE(offset, 12)
    entries.push(entry)
    offset += data.length
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)])
}

await mkdir(path.join(here), { recursive: true })
await mkdir(path.resolve(here, '../app'), { recursive: true })
const big = await squareLogo(1024)
await writeFile(path.join(here, 'icon.png'), big)
await writeFile(path.resolve(here, '../app/icon.png'), await squareLogo(256))
const images = []
for (const size of ICO_SIZES) images.push({ size, data: await squareLogo(size) })
await writeFile(path.join(here, 'icon.ico'), buildIco(images))
console.log('icons written: build/icon.png, build/icon.ico, app/icon.png')
