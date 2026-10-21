import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

const SAMPLE_VIRTUAL_ID = 'virtual:sample-xlsx'
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Embeds the sample Excel workbook (base64) into the bundle so the
 * "امتحان با داده نمونه" button and the template download link keep working
 * offline / from a single-file HTML build (no server fetch needed).
 */
export function inlineSampleXlsx(): Plugin {
  const b64 = readFileSync(resolve(PROJECT_ROOT, 'public/sample-registration.xlsx')).toString('base64')
  return {
    name: 'inline-sample-xlsx',
    resolveId(id) {
      if (id === SAMPLE_VIRTUAL_ID) return '\0' + SAMPLE_VIRTUAL_ID
    },
    load(id) {
      if (id === '\0' + SAMPLE_VIRTUAL_ID) return `export default '${b64}'`
    },
  }
}
