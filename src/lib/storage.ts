import { DeleteObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'

export type StorageDriver = 'local' | 's3'
type StorageArea = 'card-lab' | 'feed'

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

export interface StoredAssetRef {
  driver: StorageDriver | string | null
  key: string | null
  publicUrl?: string | null
}

const LOCAL_PUBLIC_ROOT = '/uploads'
const LOCAL_DIRECTORIES: Record<StorageArea, string> = {
  'card-lab': join(process.cwd(), 'public', 'uploads', 'card-lab'),
  feed: join(process.cwd(), 'public', 'uploads', 'feed'),
}
const LOCAL_PUBLIC_BASES: Record<StorageArea, string> = {
  'card-lab': `${LOCAL_PUBLIC_ROOT}/card-lab`,
  feed: `${LOCAL_PUBLIC_ROOT}/feed`,
}

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

function buildLocalAsset(area: StorageArea, fileName: string): StoredAsset {
  return {
    driver: 'local',
    key: `${area}/${fileName}`,
    publicUrl: `${LOCAL_PUBLIC_BASES[area]}/${fileName}`,
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

async function persistImageAsset(
  area: StorageArea,
  params: {
  fileName: string
  contentType: string
  buffer: Buffer
}
): Promise<StoredAsset> {
  if (getStorageDriver() === 's3') {
    const key = `${area}/${params.fileName}`
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

  await mkdir(LOCAL_DIRECTORIES[area], { recursive: true })
  await writeFile(join(LOCAL_DIRECTORIES[area], params.fileName), params.buffer)
  return buildLocalAsset(area, params.fileName)
}

export async function persistCardLabAsset(params: {
  fileName: string
  contentType: string
  buffer: Buffer
}): Promise<StoredAsset> {
  return persistImageAsset('card-lab', params)
}

export async function persistFeedAsset(params: {
  fileName: string
  contentType: string
  buffer: Buffer
}): Promise<StoredAsset> {
  return persistImageAsset('feed', params)
}

export async function deleteStoredAsset(asset: StoredAssetRef) {
  if (asset.driver === 's3') {
    if (!asset.key) {
      return
    }

    const config = getS3Config()
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: asset.key,
      })
    )
    return
  }

  const targetUrl = asset.publicUrl?.trim() || asset.key?.trim()

  if (!targetUrl) {
    return
  }

  const fileName = basename(targetUrl)
  const area = targetUrl.includes('/feed/') || targetUrl.startsWith('feed/') ? 'feed' : 'card-lab'

  try {
    await unlink(join(LOCAL_DIRECTORIES[area], fileName))
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException

    if (nodeError.code !== 'ENOENT') {
      throw error
    }
  }
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
    await Promise.all(Object.values(LOCAL_DIRECTORIES).map((directory) => mkdir(directory, { recursive: true })))
    return {
      driver: 'local',
      ok: true,
      target: Object.values(LOCAL_DIRECTORIES).join(', '),
      publicBaseUrl: LOCAL_PUBLIC_ROOT,
      detail: 'Storage local listo para desarrollo y demos privadas.',
    }
  } catch (error) {
    return {
      driver: 'local',
      ok: false,
      target: Object.values(LOCAL_DIRECTORIES).join(', '),
      publicBaseUrl: LOCAL_PUBLIC_ROOT,
      detail: error instanceof Error ? error.message : 'No se pudo preparar el storage local.',
    }
  }
}
