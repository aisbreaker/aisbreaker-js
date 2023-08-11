import * as crypto from 'crypto'


export function getObjectCryptoId(obj: Object): string {
  const asString = JSON.stringify(obj)

  // calculate hash
  const id = getCryptoHash(asString)
  return id
}
  
export function getCryptoHash(str: string): string {
  const hash = crypto.createHash('sha256')
  hash.update(str)
  return hash.digest('hex')
}
  