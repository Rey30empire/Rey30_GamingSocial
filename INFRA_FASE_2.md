# Infra Fase 2

## Objetivo

Dejar el repo listo para pasar de demo local a una infraestructura compartible sin reescribir el modulo de uploads ni perder observabilidad basica.

## Lo implementado

- Storage desacoplado en `src/lib/storage.ts`
  - `local`: guarda en `public/uploads/card-lab`
  - `s3`: sube a bucket compatible con S3 usando `@aws-sdk/client-s3`
- Metadata de assets persistida en `CardArtwork`
  - `storageProvider`
  - `storageKey`
  - `publicUrl`
- Health check publico en `/api/health`
- `.env.example` con variables necesarias para auth y storage
- `REY30_CLEAN_START.bat` ahora puede crear `.env` desde `.env.example`

## Variables nuevas

- `STORAGE_DRIVER=local|s3`
- `S3_BUCKET`
- `S3_REGION`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_BASE_URL`
- `S3_FORCE_PATH_STYLE`

## Estado actual

- La app sigue funcionando local con SQLite.
- Los uploads del Card Lab ya pueden vivir en disco local o en bucket externo.
- `/api/health` deja ver si DB y storage estan listos para deploy.

## Siguiente paso recomendado

Migrar la base desde SQLite local a un servicio externo compatible con el entorno de despliegue definitivo.
