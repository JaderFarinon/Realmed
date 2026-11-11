// Policy shared by recognition and tests; no image or descriptor persistence.
const MATCH_OPTIONS = Object.freeze({ order: 2, threshold: 0.5, multiplier: 25, min: 0.2, max: 0.8 })
const MATCH_THRESHOLD = 0.5
const MATCH_MARGIN = 0.04
const MIN_LIVE_SCORE = 0.6
const MIN_FACE_SCORE = 0.6
const MIN_CONFIRMATIONS = 2

function captureIndexes(length) {
  // Spread checks over the capture, rather than running every near-identical frame.
  return [...new Set([0, Math.floor(length / 2), length - 1, Math.floor(length / 4), Math.floor(3 * length / 4), Math.max(1, length - 2), ...Array.from({ length }, (_, i) => i)])].slice(0, 6)
}

function isUsable(frame) {
  return [frame.confidence, frame.real, frame.live].every(Number.isFinite)
    && frame.confidence >= MIN_FACE_SCORE && frame.real >= MIN_LIVE_SCORE && frame.live >= MIN_LIVE_SCORE
}

function matchingUser(candidates) {
  const sorted = [...candidates].sort((a, b) => b.similarity - a.similarity)
  const first = sorted[0]
  const second = sorted.find(candidate => candidate.userId !== first?.userId)
  if (!first || !Number.isFinite(first.similarity) || first.similarity < MATCH_THRESHOLD
    || (second && first.similarity - second.similarity < MATCH_MARGIN)) return null
  return first.userId
}

function confirmedUser(matches) {
  const identified = matches.filter(id => id != null)
  // An ambiguous frame may be skipped; two different identified people may not.
  return identified.length >= MIN_CONFIRMATIONS && identified.every(id => id === identified[0]) ? identified[0] : null
}

function motionSignature(pixels, width, height) {
  const edge = 16, signature = new Float32Array(edge * edge)
  for (let row = 0; row < edge; row++) for (let col = 0; col < edge; col++) {
    const x0 = Math.floor(width * (.2 + .6 * col / edge)), x1 = Math.max(x0 + 1, Math.floor(width * (.2 + .6 * (col + 1) / edge)))
    const y0 = Math.floor(height * (.1 + .8 * row / edge)), y1 = Math.max(y0 + 1, Math.floor(height * (.1 + .8 * (row + 1) / edge)))
    let value = 0, count = 0
    for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
      const i = (y * width + x) * 3
      value += .2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2]; count++
    }
    signature[row * edge + col] = value / count
  }
  return signature
}

function motionDifference(a, b) {
  const meanA = a.reduce((sum, value) => sum + value, 0) / a.length
  const meanB = b.reduce((sum, value) => sum + value, 0) / b.length
  let cross = 0, energyA = 0, energyB = 0
  for (let i = 0; i < a.length; i++) {
    const x = a[i] - meanA, y = b[i] - meanB
    cross += x * y; energyA += x * x; energyB += y * y
  }
  return energyA > 1 && energyB > 1 ? Math.max(0, 1 - cross / Math.sqrt(energyA * energyB)) : 0
}

function shadowCorrection(pixels, width, height) {
  // Meter the central region so a bright window at the edge does not hide a dark face.
  // A bounded gamma lift preserves highlights; never invent detail in near-black input.
  const histogram = new Uint32Array(256)
  let count = 0
  for (let y = Math.floor(height * .15); y < height * .85; y += 4) {
    for (let x = Math.floor(width * .25); x < width * .75; x += 4) {
      const i = (y * width + x) * 3
      histogram[Math.round(.2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2])]++
      count++
    }
  }
  let cumulative = 0, median = 0
  for (; median < 255; median++) { cumulative += histogram[median]; if (cumulative >= count / 2) break }
  if (!count || median < 10 || median >= 85) return null
  const gamma = Math.max(.65, Math.min(1, Math.log(100 / 255) / Math.log(median / 255)))
  const lut = Uint8Array.from({ length: 256 }, (_, value) => Math.round(255 * (value / 255) ** gamma))
  return Uint8Array.from(pixels, value => lut[Math.max(0, Math.min(255, Math.round(value)))])
}

module.exports = { MATCH_OPTIONS, MATCH_THRESHOLD, MIN_CONFIRMATIONS, captureIndexes, isUsable, matchingUser, confirmedUser, shadowCorrection, motionSignature, motionDifference }
