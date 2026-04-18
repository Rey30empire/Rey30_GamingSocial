'use client'

import { useEffect, useRef, useState } from 'react'
import type { FeedCommentSnapshot, FeedMediaSnapshot, FeedPostSnapshot, FeedSnapshot } from '@/lib/app-types'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Heart, ImagePlus, Loader2, MessageCircle, RefreshCcw, Reply, Send, X } from 'lucide-react'

function FeedMediaGrid({ media }: { media: FeedMediaSnapshot[] }) {
  if (!media.length) {
    return null
  }

  return (
    <div className={cn('mt-4 grid gap-3', media.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1')}>
      {media.map((item) => (
        <div
          key={item.id}
          className="overflow-hidden rounded-[1.2rem] border border-white/[0.08] bg-black/20"
        >
          <img
            src={item.url}
            alt={item.originalName}
            className="h-full max-h-[28rem] w-full object-cover"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  )
}

function FeedCommentThread({
  comment,
  postId,
  depth,
  replyDrafts,
  openReplyBoxes,
  isMutating,
  mutatingCommentId,
  onToggleReply,
  onToggleCommentReaction,
  onReplyDraftChange,
  onSubmitReply,
}: {
  comment: FeedCommentSnapshot
  postId: string
  depth: number
  replyDrafts: Record<string, string>
  openReplyBoxes: Record<string, boolean>
  isMutating: boolean
  mutatingCommentId: string | null
  onToggleReply: (commentId: string) => void
  onToggleCommentReaction: (commentId: string) => Promise<void>
  onReplyDraftChange: (commentId: string, value: string) => void
  onSubmitReply: (postId: string, parentCommentId: string) => Promise<void>
}) {
  const replyDraft = replyDrafts[comment.id] ?? ''
  const isReplying = openReplyBoxes[comment.id] ?? false
  const isCommentMutating = mutatingCommentId === comment.id

  return (
    <div className={cn('space-y-3', depth > 0 && 'ml-4 border-l border-violet-400/10 pl-4')}>
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{comment.author.name}</span>
          <span className="text-xs text-zinc-500">@{comment.author.handle}</span>
          {comment.author.isMe ? <span className="text-xs text-emerald-300">Tú</span> : null}
          <span className="ml-auto text-xs text-zinc-500">{comment.timestamp}</span>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{comment.content}</p>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => void onToggleCommentReaction(comment.id)}
            disabled={isCommentMutating}
            className={cn(
              'flex items-center gap-1 rounded-full px-3 py-1.5 text-xs transition',
              comment.isLikedByMe
                ? 'bg-pink-500/15 text-pink-300'
                : 'bg-white/[0.04] text-zinc-400 hover:text-pink-300'
            )}
          >
            <Heart className={cn('h-3.5 w-3.5', comment.isLikedByMe && 'fill-current')} />
            <span>{comment.likes}</span>
          </button>
          <button
            onClick={() => onToggleReply(comment.id)}
            disabled={isMutating}
            className="flex items-center gap-1 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-400 transition hover:text-violet-200 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Reply className="h-3.5 w-3.5" />
            Responder
          </button>
          {comment.replies.length ? (
            <span className="text-xs text-zinc-500">{comment.replies.length} respuestas</span>
          ) : null}
        </div>

        {isReplying ? (
          <div className="mt-3 flex items-center gap-2">
            <Input
              value={replyDraft}
              onChange={(event) => onReplyDraftChange(comment.id, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void onSubmitReply(postId, comment.id)
                }
              }}
              placeholder={`Responder a ${comment.author.name}...`}
              className="border-purple-500/20 bg-[#1a1a2e] text-white placeholder:text-zinc-500"
            />
            <Button
              onClick={() => void onSubmitReply(postId, comment.id)}
              disabled={isMutating}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>

      {comment.replies.length ? (
        <div className="space-y-3">
          {comment.replies.map((reply) => (
            <FeedCommentThread
              key={reply.id}
              comment={reply}
              postId={postId}
              depth={depth + 1}
              replyDrafts={replyDrafts}
              openReplyBoxes={openReplyBoxes}
              isMutating={isMutating}
              mutatingCommentId={mutatingCommentId}
              onToggleReply={onToggleReply}
              onToggleCommentReaction={onToggleCommentReaction}
              onReplyDraftChange={onReplyDraftChange}
              onSubmitReply={onSubmitReply}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function FeedPostCard({
  post,
  commentDraft,
  replyDrafts,
  openReplyBoxes,
  isMutating,
  mutatingCommentId,
  onToggleReaction,
  onToggleCommentReaction,
  onCommentDraftChange,
  onSubmitComment,
  onToggleReplyBox,
  onReplyDraftChange,
  onSubmitReply,
}: {
  post: FeedPostSnapshot
  commentDraft: string
  replyDrafts: Record<string, string>
  openReplyBoxes: Record<string, boolean>
  isMutating: boolean
  mutatingCommentId: string | null
  onToggleReaction: (postId: string) => Promise<void>
  onToggleCommentReaction: (commentId: string) => Promise<void>
  onCommentDraftChange: (postId: string, value: string) => void
  onSubmitComment: (postId: string) => Promise<void>
  onToggleReplyBox: (commentId: string) => void
  onReplyDraftChange: (commentId: string, value: string) => void
  onSubmitReply: (postId: string, parentCommentId: string) => Promise<void>
}) {
  return (
    <Card className="overflow-hidden border-purple-500/20 bg-[#12121a]">
      <div className="border-b border-purple-500/10 p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11 border border-purple-500/30">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author.avatar}`} />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
              {post.author.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-white">{post.author.name}</p>
              <Badge className="border-0 bg-violet-500/15 text-violet-100">@{post.author.handle}</Badge>
              <Badge className="border-0 bg-cyan-500/15 text-cyan-100">Nivel {post.author.level}</Badge>
              {post.author.isMe ? (
                <Badge className="border-0 bg-emerald-500/15 text-emerald-100">Tú</Badge>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-zinc-500">{post.timestamp}</p>
          </div>
        </div>

        {post.content ? <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-200">{post.content}</p> : null}
        <FeedMediaGrid media={post.media} />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-purple-500/10 px-4 py-3">
        <button
          onClick={() => void onToggleReaction(post.id)}
          disabled={isMutating}
          className={cn(
            'flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors',
            post.isLikedByMe ? 'bg-pink-500/15 text-pink-300' : 'bg-white/[0.04] text-zinc-400 hover:text-pink-300'
          )}
        >
          <Heart className={cn('h-4 w-4', post.isLikedByMe && 'fill-current')} />
          <span>{post.likes}</span>
        </button>

        <div className="flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-2 text-sm text-zinc-400">
          <MessageCircle className="h-4 w-4" />
          <span>{post.commentsCount} comentarios</span>
        </div>

        {post.media.length ? (
          <Badge className="border-0 bg-cyan-500/12 text-cyan-100">{post.media.length} media</Badge>
        ) : null}
      </div>

      <div className="space-y-4 p-4">
        {post.comments.length ? (
          <div className="space-y-3">
            {post.comments.map((comment) => (
              <FeedCommentThread
                key={comment.id}
                comment={comment}
                postId={post.id}
                depth={0}
                replyDrafts={replyDrafts}
                openReplyBoxes={openReplyBoxes}
                isMutating={isMutating}
                mutatingCommentId={mutatingCommentId}
                onToggleReply={onToggleReplyBox}
                onToggleCommentReaction={onToggleCommentReaction}
                onReplyDraftChange={onReplyDraftChange}
                onSubmitReply={onSubmitReply}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Todavía no hay comentarios. Sé la primera persona en responder.</p>
        )}

        <div className="flex items-center gap-2">
          <Input
            value={commentDraft}
            onChange={(event) => onCommentDraftChange(post.id, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void onSubmitComment(post.id)
              }
            }}
            placeholder="Escribe un comentario..."
            className="border-purple-500/20 bg-[#1a1a2e] text-white placeholder:text-zinc-500"
          />
          <Button
            onClick={() => void onSubmitComment(post.id)}
            disabled={isMutating}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

export function SocialFeed() {
  const [feed, setFeed] = useState<FeedSnapshot | null>(null)
  const [composer, setComposer] = useState('')
  const [composerMedia, setComposerMedia] = useState<FeedMediaSnapshot[]>([])
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [openReplyBoxes, setOpenReplyBoxes] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [mutatingPostId, setMutatingPostId] = useState<string | null>(null)
  const [mutatingCommentId, setMutatingCommentId] = useState<string | null>(null)
  const [removingMediaIds, setRemovingMediaIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const composerMediaRef = useRef<FeedMediaSnapshot[]>([])

  const loadFeed = async (preserveError = false) => {
    if (!preserveError) {
      setError(null)
    }

    try {
      const response = await fetch('/api/feed', { cache: 'no-store' })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo cargar el feed.')
      }

      setFeed(payload as FeedSnapshot)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo cargar el feed.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadFeed()

    const eventSource = new EventSource('/api/realtime/stream')
    const handleFeedUpdate = () => {
      void loadFeed(true)
    }

    eventSource.addEventListener('feed-updated', handleFeedUpdate)

    return () => {
      eventSource.close()
    }
  }, [])

  useEffect(() => {
    composerMediaRef.current = composerMedia
  }, [composerMedia])

  useEffect(() => {
    return () => {
      for (const media of composerMediaRef.current) {
        void fetch('/api/feed/upload', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mediaId: media.id,
          }),
          keepalive: true,
        }).catch(() => undefined)
      }
    }
  }, [])

  const upsertPost = (nextPost: FeedPostSnapshot) => {
    setFeed((current) => {
      if (!current) {
        return { posts: [nextPost] }
      }

      const existingIndex = current.posts.findIndex((post) => post.id === nextPost.id)

      if (existingIndex === -1) {
        return { posts: [nextPost, ...current.posts] }
      }

      return {
        posts: current.posts.map((post) => (post.id === nextPost.id ? nextPost : post)),
      }
    })
  }

  const handleUploadMedia = async (files: FileList | null) => {
    if (!files?.length) {
      return
    }

    const slotsAvailable = Math.max(0, 4 - composerMedia.length)

    if (slotsAvailable === 0) {
      setError('Cada publicación acepta hasta 4 imágenes.')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const uploadedMedia: FeedMediaSnapshot[] = []

      for (const file of Array.from(files).slice(0, slotsAvailable)) {
        const formData = new FormData()
        formData.set('file', file)

        const response = await fetch('/api/feed/upload', {
          method: 'POST',
          body: formData,
        })
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload?.error ?? 'No se pudo subir una imagen del post.')
        }

        uploadedMedia.push(payload.media as FeedMediaSnapshot)
      }

      setComposerMedia((current) => [...current, ...uploadedMedia].slice(0, 4))
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo subir una imagen del post.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCreatePost = async () => {
    if (!composer.trim() && composerMedia.length === 0) {
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: composer,
          mediaAssetIds: composerMedia.map((media) => media.id),
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo crear la publicación.')
      }

      upsertPost(payload.post as FeedPostSnapshot)
      setComposer('')
      setComposerMedia([])
      composerMediaRef.current = []
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo crear la publicación.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleToggleReaction = async (postId: string) => {
    setMutatingPostId(postId)
    setError(null)

    try {
      const response = await fetch('/api/feed/reactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo actualizar el like.')
      }

      upsertPost(payload.post as FeedPostSnapshot)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo actualizar el like.')
    } finally {
      setMutatingPostId(null)
    }
  }

  const handleToggleCommentReaction = async (commentId: string) => {
    setMutatingCommentId(commentId)
    setError(null)

    try {
      const response = await fetch('/api/feed/comments/reactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo actualizar el like del comentario.')
      }

      upsertPost(payload.post as FeedPostSnapshot)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo actualizar el like del comentario.')
    } finally {
      setMutatingCommentId(null)
    }
  }

  const handleSubmitComment = async (postId: string) => {
    const comment = commentDrafts[postId]?.trim() ?? ''

    if (!comment) {
      return
    }

    setMutatingPostId(postId)
    setError(null)

    try {
      const response = await fetch('/api/feed/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          content: comment,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo comentar la publicación.')
      }

      upsertPost(payload.post as FeedPostSnapshot)
      setCommentDrafts((current) => ({
        ...current,
        [postId]: '',
      }))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo comentar la publicación.')
    } finally {
      setMutatingPostId(null)
    }
  }

  const handleSubmitReply = async (postId: string, parentCommentId: string) => {
    const content = replyDrafts[parentCommentId]?.trim() ?? ''

    if (!content) {
      return
    }

    setMutatingPostId(postId)
    setError(null)

    try {
      const response = await fetch('/api/feed/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          parentCommentId,
          content,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo responder el comentario.')
      }

      upsertPost(payload.post as FeedPostSnapshot)
      setReplyDrafts((current) => ({
        ...current,
        [parentCommentId]: '',
      }))
      setOpenReplyBoxes((current) => ({
        ...current,
        [parentCommentId]: false,
      }))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo responder el comentario.')
    } finally {
      setMutatingPostId(null)
    }
  }

  const handleRemoveComposerMedia = async (mediaId: string) => {
    setRemovingMediaIds((current) => [...current, mediaId])
    setError(null)

    try {
      const response = await fetch('/api/feed/upload', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaId,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo eliminar la imagen temporal.')
      }

      setComposerMedia((current) => current.filter((media) => media.id !== mediaId))
      composerMediaRef.current = composerMediaRef.current.filter((media) => media.id !== mediaId)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo eliminar la imagen temporal.')
    } finally {
      setRemovingMediaIds((current) => current.filter((id) => id !== mediaId))
    }
  }

  return (
    <section className="space-y-5">
      <div className="rounded-[1.8rem] border border-violet-400/12 bg-[#0f0f18] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-violet-300/70">Social feed</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Pulso real de la comunidad</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Publicaciones persistidas en PostgreSQL con imágenes, likes y conversaciones en hilo.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => void loadFeed()}
            className="rounded-full border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refrescar
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          <Textarea
            value={composer}
            onChange={(event) => setComposer(event.target.value)}
            placeholder="Comparte avance, abre una mesa o cuenta qué estás probando hoy..."
            className="min-h-28 border-purple-500/20 bg-[#1a1a2e] text-white placeholder:text-zinc-500"
          />

          {composerMedia.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {composerMedia.map((media) => (
                <div
                  key={media.id}
                  className="relative overflow-hidden rounded-[1.2rem] border border-white/[0.08] bg-black/20"
                >
                  <img src={media.url} alt={media.originalName} className="h-48 w-full object-cover" />
                  <button
                    onClick={() => void handleRemoveComposerMedia(media.id)}
                    disabled={removingMediaIds.includes(media.id)}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition hover:bg-black/80"
                  >
                    {removingMediaIds.includes(media.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-violet-400/20 bg-white/[0.04] px-4 py-2 text-sm text-violet-100 transition hover:bg-violet-500/10">
                <ImagePlus className="h-4 w-4" />
                {isUploading ? 'Subiendo...' : 'Agregar imagen'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => void handleUploadMedia(event.target.files)}
                />
              </label>
              <p className="text-xs text-zinc-500">Hasta 4 imágenes, 8MB cada una.</p>
            </div>

            <Button
              onClick={() => void handleCreatePost()}
              disabled={isCreating || isUploading || removingMediaIds.length > 0}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
            >
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Publicar
            </Button>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </div>

      {isLoading ? (
        <Card className="border-purple-500/20 bg-[#12121a] p-6 text-sm text-zinc-400">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
            Cargando publicaciones reales desde PostgreSQL...
          </div>
        </Card>
      ) : null}

      {!isLoading && !feed?.posts.length ? (
        <Card className="border-purple-500/20 bg-[#12121a] p-6 text-sm text-zinc-400">
          El feed está vacío todavía. Publica el primer update y quedará persistido en la base local.
        </Card>
      ) : null}

      {!isLoading && feed?.posts.length ? (
        <div className="space-y-4">
          {feed.posts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              commentDraft={commentDrafts[post.id] ?? ''}
              replyDrafts={replyDrafts}
              openReplyBoxes={openReplyBoxes}
              isMutating={mutatingPostId === post.id}
              mutatingCommentId={mutatingCommentId}
              onToggleReaction={handleToggleReaction}
              onToggleCommentReaction={handleToggleCommentReaction}
              onCommentDraftChange={(postId, value) =>
                setCommentDrafts((current) => ({
                  ...current,
                  [postId]: value,
                }))
              }
              onSubmitComment={handleSubmitComment}
              onToggleReplyBox={(commentId) =>
                setOpenReplyBoxes((current) => ({
                  ...current,
                  [commentId]: !current[commentId],
                }))
              }
              onReplyDraftChange={(commentId, value) =>
                setReplyDrafts((current) => ({
                  ...current,
                  [commentId]: value,
                }))
              }
              onSubmitReply={handleSubmitReply}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
