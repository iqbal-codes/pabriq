import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { decryptTelegramBotToken, encryptTelegramBotToken } from './telegram'

const TEST_KEY = 'test-encryption-key-for-unit-tests'
const ALT_KEY = 'alternative-key-for-cross-key-tests'

beforeEach(() => {
  process.env.TELEGRAM_TOKEN_ENCRYPTION_KEY = TEST_KEY
})

afterEach(() => {
  delete process.env.TELEGRAM_TOKEN_ENCRYPTION_KEY
})

describe('encrypt / decrypt round-trip', () => {
  it('recovers the original token', () => {
    const token = '123456789:ABCdefGHIjklMNOpqrsTUVwxyZ'
    const encrypted = encryptTelegramBotToken(token)
    expect(decryptTelegramBotToken(encrypted)).toBe(token)
  })

  it('produces different ciphertext each call (random IV)', () => {
    const token = '123456789:ABCdefGHIjklMNOpqrsTUVwxyZ'
    const a = encryptTelegramBotToken(token)
    const b = encryptTelegramBotToken(token)
    expect(a).not.toBe(b)
    expect(decryptTelegramBotToken(a)).toBe(token)
    expect(decryptTelegramBotToken(b)).toBe(token)
  })

  it('handles tokens with special characters', () => {
    const token = 'abc-_./123:ABC='
    const encrypted = encryptTelegramBotToken(token)
    expect(decryptTelegramBotToken(encrypted)).toBe(token)
  })

  it('round-trips tokens containing dots', () => {
    const token = 'a.b.c:d'
    const encrypted = encryptTelegramBotToken(token)
    expect(decryptTelegramBotToken(encrypted)).toBe(token)
  })
})

function tamperEncryptedPart(encrypted: string, index: number): string {
  const parts = encrypted.split('.')
  const part = parts[index]
  if (!part) throw new Error('Encrypted test payload is malformed')
  parts[index] = `${part[0] === 'A' ? 'B' : 'A'}${part.slice(1)}`
  return parts.join('.')
}

describe('tamper detection', () => {
  it.each([
    ['ciphertext', 2],
    ['authentication tag', 1],
    ['initialization vector', 0],
  ] as const)('rejects a modified %s', (_label, index) => {
    const encrypted = encryptTelegramBotToken(
      '123456789:ABCdefGHIjklMNOpqrsTUVwxyZ',
    )
    expect(() =>
      decryptTelegramBotToken(tamperEncryptedPart(encrypted, index)),
    ).toThrow()
  })
})

describe('wrong-key rejection', () => {
  it('throws when decrypted with a different key', () => {
    process.env.TELEGRAM_TOKEN_ENCRYPTION_KEY = TEST_KEY
    const encrypted = encryptTelegramBotToken('secret-token')

    process.env.TELEGRAM_TOKEN_ENCRYPTION_KEY = ALT_KEY
    expect(() => decryptTelegramBotToken(encrypted)).toThrow()
  })
})

describe('malformed input', () => {
  it.each([
    '',
    'notavalidtoken',
    'abc.def',
  ])('rejects malformed payload %j', (payload) => {
    expect(() => decryptTelegramBotToken(payload)).toThrow()
  })
})

describe('missing encryption key', () => {
  it('encrypt throws when TELEGRAM_TOKEN_ENCRYPTION_KEY is absent', () => {
    delete process.env.TELEGRAM_TOKEN_ENCRYPTION_KEY
    expect(() => encryptTelegramBotToken('token')).toThrow(
      'TELEGRAM_TOKEN_ENCRYPTION_KEY',
    )
  })

  it('decrypt throws when TELEGRAM_TOKEN_ENCRYPTION_KEY is absent', () => {
    delete process.env.TELEGRAM_TOKEN_ENCRYPTION_KEY
    expect(() => decryptTelegramBotToken('AAAAAA.BBBBBB.CCCCCC')).toThrow(
      'TELEGRAM_TOKEN_ENCRYPTION_KEY',
    )
  })
})
