import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const SCRYPT_KEY_LENGTH = 64

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, originalHash] = storedHash.split(':')

  if (!salt || !originalHash) {
    return false
  }

  const candidateHash = scryptSync(password, salt, SCRYPT_KEY_LENGTH)
  const originalHashBuffer = Buffer.from(originalHash, 'hex')

  if (candidateHash.length !== originalHashBuffer.length) {
    return false
  }

  return timingSafeEqual(candidateHash, originalHashBuffer)
}
