import { useState } from 'react'
import { Button } from './Button'
import { cn } from '@/lib/utils'

export interface Comment {
  id: string
  user: {
    name: string
    avatar?: string
  }
  content: string
  timestamp: Date | string
  replies?: Comment[]
}

interface CommentsProps {
  comments: Comment[]
  onAddComment: (content: string, parentId?: string) => Promise<void>
  onDeleteComment?: (id: string) => Promise<void>
  onEditComment?: (id: string, content: string) => Promise<void>
  currentUserId?: string
  className?: string
}

function CommentItem({
  comment,
  onReply,
  onDelete,
  onEdit,
  level = 0
}: {
  comment: Comment
  onReply: (content: string) => void
  onDelete?: () => void
  onEdit?: (content: string) => void
  level?: number
}) {
  const [isReplying, setIsReplying] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [editContent, setEditContent] = useState(comment.content)

  const handleReply = () => {
    if (replyContent.trim()) {
      onReply(replyContent)
      setReplyContent('')
      setIsReplying(false)
    }
  }

  const handleEdit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(editContent)
      setIsEditing(false)
    }
  }

  return (
    <div className={cn('space-y-3', level > 0 && 'ml-8')}>
      <div className="flex gap-3">
        {/* Avatar */}
        {comment.user.avatar ? (
          <img
            src={comment.user.avatar}
            alt={comment.user.name}
            className="w-8 h-8 rounded-full flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {comment.user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 glass-panel rounded-lg p-3 border border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between mb-1">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {comment.user.name}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {new Date(comment.timestamp).toLocaleString('pl-PL')}
            </span>
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEdit}>Zapisz</Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Anuluj</Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {comment.content}
              </p>
              <div className="flex gap-3 mt-2">
                {level < 2 && (
                  <button
                    onClick={() => setIsReplying(!isReplying)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Odpowiedz
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-slate-600 dark:text-slate-400 hover:underline"
                  >
                    Edytuj
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={onDelete}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Usuń
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reply form */}
      {isReplying && (
        <div className="ml-11 space-y-2">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Napisz odpowiedź..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleReply}>Wyślij</Button>
            <Button size="sm" variant="ghost" onClick={() => setIsReplying(false)}>Anuluj</Button>
          </div>
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={(content) => onReply(content)}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function Comments({
  comments,
  onAddComment,
  onDeleteComment,
  onEditComment,
  className,
}: CommentsProps) {
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      await onAddComment(newComment)
      setNewComment('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* New comment */}
      <div className="space-y-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Dodaj komentarz..."
          className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
        <Button
          onClick={handleSubmit}
          isLoading={isSubmitting}
          disabled={!newComment.trim()}
        >
          Dodaj komentarz
        </Button>
      </div>

      {/* Comments list */}
      {comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={(content) => onAddComment(content, comment.id)}
              onDelete={onDeleteComment ? () => onDeleteComment(comment.id) : undefined}
              onEdit={onEditComment ? (content) => onEditComment(comment.id, content) : undefined}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-slate-500 dark:text-slate-400 text-sm py-8">
          Brak komentarzy. Bądź pierwszym!
        </p>
      )}
    </div>
  )
}
