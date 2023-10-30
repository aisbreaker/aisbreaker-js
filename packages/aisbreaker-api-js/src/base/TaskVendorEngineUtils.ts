

/*
export interface TaskVendorEngine {
  task?: string
  vendor?: string
  engine?: string
}
*/

import { TaskVendorEngine } from "./TaskVendorEngine.js"

/** extract engineId from serviceId (or fallback to default) */
export function getTaskVendorEngineFromServiceId(
  serviceId: string | undefined, defaults: TaskVendorEngine): TaskVendorEngine {
  // trival case
  if (!serviceId || serviceId.length === 0) {
    return defaults
  }

  // extract task:
  // serviceId = '<task>:<vendor>/<engine>'
  const parts1 = serviceId.split(':')
  const task = parts1[0] || defaults.task
  const vendorEngine = joinArrayExceptFirstElement(parts1, ':')
  if (!vendorEngine) {
    return {
      task: task,
      vendor: defaults.vendor,
      engine: defaults.engine,
    }
  }

  // extract vendor and engine:
  // vendorEngine = '<vendor>/<engine>'
  const parts2 = vendorEngine?.split('/')
  const vendor = parts2[0] || defaults.vendor
  const engine = joinArrayExceptFirstElement(parts2, '/') || defaults.engine

  // result
  return {
    task: task,
    vendor: vendor,
    engine: engine,
  }
}

function joinArrayExceptFirstElement(parts: string[], separator: string): string | undefined {
  // only zero or one element in array?
  if (parts.length <= 1) {
    return undefined
  }
  // "normal" array
  return parts.slice(1).join(separator)
}

