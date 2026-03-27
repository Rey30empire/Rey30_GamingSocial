import { HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export type StorageDriver = 'local' | 's3'

export interface StoredAsset {
  driver: StorageDriver
  key: string
  publicUrl: string
}

export interface StorageHealthSnapshot {
  driver: StorageDriver
  ok: boolean
  target: string
  publicBaseUrl: string
  detail: string
}

const LOCAL_PUBLIC_ROOT = '/uploads'
const LOCAL_CARD_LAB_DIR = join(process.cwd(), 'public', 'uploads', 'card-lab')
const LOCAL_CARD_LAB_PUBLIC_BASE = `${LOCAL_PUBLIC_ROOT}/card-lab`

let cachedS3Client: S3Client | null = null

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function trimLeadingSlash(value: string) {
  return value.replace(/^\/+/, '')
}

function getStorageDriver(): StorageDriver {
  return process.env.STORAGE_DRIVER === 's3' ? 's3' : 'local'
}

function buildLocalAsset(fileName: string): StoredAsset {
  return {
    driver: 'local',
    key: `card-lab/${fileName}`,
    publicUrl: `${LOCAL_CARD_LAB_PUBLIC_BASE}/${fileName}`,
  }
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Falta la variable ${name} para usar storage S3.`)
  }

  return value
}

function getS3Config() {
  const endpoint = process.env.S3_ENDPOINT?.trim() || null
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.trim() || null
  const bucket = getRequiredEnv('S3_BUCKET')
  const region = process.env.S3_REGION?.trim() || 'auto'
  const accessKeyId = getRequiredEnv('S3_ACCESS_KEY_ID')
  const secretAccessKey = getRequiredEnv('S3_SECRET_ACCESS_KEY')
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true' || Boolean(endpoint)

  return {
    bucket,
    region,
    endpoint,
    publicBaseUrl,
    accessKeyId,
    secretAccessKey,
    forcePathStyle,
  }
}

function getS3Client() {
  if (cachedS3Client) {
    return cachedS3Client
  }

  const config = getS3Config()
  cachedS3Client = new S3Client({
    region: config.region,
    endpoint: config.endpoint ?? undefined,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })

  return cachedS3Client
}

function buildS3PublicUrl(key: string) {
  const config = getS3Config()

  if (config.publicBaseUrl) {
    return `${trimTrailingSlash(config.publicBaseUrl)}/${trimLeadingSlash(key)}`
  }

  if (config.endpoint) {
    return `${trimTrailingSlash(config.endpoint)}/${config.bucket}/${trimLeadingSlash(key)}`
  }

  return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${trimLeadingSlash(key)}`
}

export async function persistCardLabAsset(params: {
  fileName: string
  contentType: string
  buffer: Buffer
}): Promise<StoredAsset> {
  if (getStorageDriver() === 's3') {
    const key = `card-lab/${params.fileName}`
    const config = getS3Config()

    await getS3Client().send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: params.buffer,
        ContentType: params.contentType,
      })
    )

    return {
      driver: 's3',
      key,
      publicUrl: buildS3PublicUrl(key),
    }
  }

  await mkdir(LOCAL_CARD_LAB_DIR, { recursive: true })
  await writeFile(join(LOCAL_CARD_LAB_DIR, params.fileName), params.buffer)
  return buildLocalAsset(params.fileName)
}

export async function getStorageHealthSnapshot(): Promise<StorageHealthSnapshot> {
  if (getStorageDriver() === 's3') {
    try {
      const config = getS3Config()
      await getS3Client().send(
        new HeadBucketCommand({
          Bucket: config.bucket,
        })
      )

      return {
        driver: 's3',
        ok: true,
        target: config.bucket,
        publicBaseUrl: buildS3PublicUrl(''),
        detail: 'Bucket accesible y listo para uploads.',
      }
    } catch (error) {
      return {
        driver: 's3',
        ok: false,
        target: process.env.S3_BUCKET?.trim() || 'sin-bucket',
        publicBaseUrl: process.env.S3_PUBLIC_BASE_URL?.trim() || process.env.S3_ENDPOINT?.trim() || 'sin-public-url',
        detail: error instanceof Error ? error.message : 'No se pudo validar el bucket S3.',
      }
    }
  }

  try {
    await mkdir(LOCAL_CARD_LAB_DIR, { recursive: true })
    return {
      driver: 'local',
      ok: true,
      target: LOCAL_CARD_LAB_DIR,
      publicBaseUrl: LOCAL_CARD_LAB_PUBLIC_BASE,
      detail: 'Storage local listo para desarrollo y demos privadas.',
    }
  } catch (error) {
    return {
      driver: 'local',
      ok: false,
      target: LOCAL_CARD_LAB_DIR,
      publicBaseUrl: LOCAL_CARD_LAB_PUBLIC_BASE,
      detail: error instanceof Error ? error.message : 'No se pudo preparar el storage local.',
    }
  }
}
