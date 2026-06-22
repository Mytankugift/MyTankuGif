'use client'

/** Verde Tanku para nombres en notificaciones sociales. */
const USERNAME_CLASS = 'text-[#73FFA2]'

/** Acentos en ASCII-safe (evita corrupcion al guardar el archivo). */
const O_ACUTE = '\u00f3'
const A_ACUTE = '\u00e1'

const SUFFIX_MENTION = ` te mencion${O_ACUTE}`
const SUFFIX_REPLY = ` respondi${O_ACUTE} tu comentario`
const SUFFIX_ACCEPTED = ` te acept${O_ACUTE}`
const SUFFIX_SENT_REQUEST = ` te envi${O_ACUTE} una solicitud`
const SUFFIX_ACCEPTED_REQUEST = ` acept${O_ACUTE} tu solicitud`
const WORD_COMMENTED = `coment${O_ACUTE}`
const WORD_MORE = `m${A_ACUTE}s`

function NameGroupHighlight({ text }: { text: string }) {
  const parts = text.split(/\s+y\s+/i)
  const morePattern = new RegExp(`^\\d+\\s+${WORD_MORE}$`, 'i')
  return (
    <>
      {parts.map((part, index) => (
        <span key={`${part}-${index}`}>
          {index > 0 && <span className="text-white"> y </span>}
          {morePattern.test(part.trim()) ? (
            <span className="text-white">{part}</span>
          ) : (
            <span className={USERNAME_CLASS}>{part}</span>
          )}
        </span>
      ))}
    </>
  )
}

function HighlightNameAction({ name, action }: { name: string; action: string }) {
  return (
    <>
      <span className={USERNAME_CLASS}>{name}</span>
      <span className="text-white">{action}</span>
    </>
  )
}

/** Resalta nombres de usuario en el titulo segun el tipo de notificacion. */
export function NotificationTitleContent({
  title,
  type,
  message,
  isSupport = false,
}: {
  title: string
  type?: string
  message?: string
  isSupport?: boolean
}) {
  if (isSupport) return <>{title}</>

  const lowered = (type || '').toLowerCase()

  if (lowered === 'post_like') {
    return <NameGroupHighlight text={title} />
  }

  const commentRe = new RegExp(`^(.+?)\\s+(${WORD_COMMENTED}|comentaron)$`, 'i')
  const commentMatch = title.match(commentRe)
  if (commentMatch) {
    return (
      <>
        <NameGroupHighlight text={commentMatch[1]} />
        <span className="text-white"> {commentMatch[2]}</span>
      </>
    )
  }

  const mentionRe = new RegExp(`^(.+?)${SUFFIX_MENTION}$`, 'i')
  const replyRe = new RegExp(`^(.+?)${SUFFIX_REPLY}$`, 'i')

  if (lowered === 'comment_mention') {
    const mentionMatch = title.match(mentionRe)
    if (mentionMatch) {
      return <HighlightNameAction name={mentionMatch[1]} action={SUFFIX_MENTION} />
    }
    if (title.toLowerCase().includes('te mencionaron') && message) {
      const legacyRe = new RegExp(`^(.+?)${SUFFIX_MENTION}`, 'i')
      const legacyMatch = message.match(legacyRe)
      if (legacyMatch) {
        return <HighlightNameAction name={legacyMatch[1]} action={SUFFIX_MENTION} />
      }
    }
  }

  if (lowered === 'comment_reply') {
    const replyMatch = title.match(replyRe)
    if (replyMatch) {
      return <HighlightNameAction name={replyMatch[1]} action={SUFFIX_REPLY} />
    }
  }

  if (lowered === 'friend_request') {
    if (title.toLowerCase().includes('nueva solicitud') && message) {
      const sentRe = new RegExp(`^(.+?)\\s+te envi${O_ACUTE}`, 'i')
      const legacyMatch = message.match(sentRe)
      if (legacyMatch) {
        return <span className={USERNAME_CLASS}>{legacyMatch[1]}</span>
      }
    }
    return <span className={USERNAME_CLASS}>{title}</span>
  }

  if (lowered === 'friend_accepted') {
    const shortRe = new RegExp(`^(.+?)${SUFFIX_ACCEPTED}$`, 'i')
    const shortMatch = title.match(shortRe)
    if (shortMatch) {
      return <HighlightNameAction name={shortMatch[1]} action={SUFFIX_ACCEPTED} />
    }
    if (title.toLowerCase().includes('solicitud de amistad aceptada') && message) {
      const legacyRe = new RegExp(`^(.+?)\\s+acept${O_ACUTE}`, 'i')
      const legacyMatch = message.match(legacyRe)
      if (legacyMatch) {
        return <HighlightNameAction name={legacyMatch[1]} action={SUFFIX_ACCEPTED} />
      }
    }
  }

  const friendRequestMatch = title.match(new RegExp(`^(.+?)${SUFFIX_SENT_REQUEST}`, 'i'))
  if (friendRequestMatch) {
    return (
      <HighlightNameAction name={friendRequestMatch[1]} action={SUFFIX_SENT_REQUEST} />
    )
  }

  const friendAcceptedRe = new RegExp(`^(.+?)\\s+${SUFFIX_ACCEPTED_REQUEST}`, 'i')
  const friendAcceptedMatch = title.match(friendAcceptedRe)
  if (friendAcceptedMatch) {
    return (
      <HighlightNameAction name={friendAcceptedMatch[1]} action={` ${SUFFIX_ACCEPTED_REQUEST}`} />
    )
  }

  const mentionMatch = title.match(mentionRe)
  if (mentionMatch) {
    return <HighlightNameAction name={mentionMatch[1]} action={SUFFIX_MENTION} />
  }

  const replyMatch = title.match(replyRe)
  if (replyMatch) {
    return <HighlightNameAction name={replyMatch[1]} action={SUFFIX_REPLY} />
  }

  return <>{title}</>
}

function stripLegacyMentionPrefix(message: string): string {
  const legacyRe = new RegExp(`^(.+?)${SUFFIX_MENTION} en un comentario:\\s*`, 'i')
  return sanitizeTechnicalMentions(
    message.replace(legacyRe, '').replace(/^["']|["']$/g, '').trim()
  )
}

function sanitizeTechnicalMentions(message: string): string {
  return message
    .replace(/@\{[a-zA-Z0-9_-]+\}/g, '')
    .replace(/@[a-zA-Z0-9_-]{20,}(?![a-zA-Z0-9_-])/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Resalta @menciones en el cuerpo del mensaje. */
export function NotificationMessageContent({
  message,
  type,
  isSupport = false,
}: {
  message: string
  type?: string
  isSupport?: boolean
}) {
  const lowered = (type || '').toLowerCase()

  const acceptedRe = new RegExp(`acept${O_ACUTE} tu solicitud`, 'i')
  const sentRequestRe = new RegExp(`te envi${O_ACUTE} una solicitud`, 'i')
  const mentionInCommentRe = new RegExp(`te mencion${O_ACUTE} en un comentario`, 'i')

  if (!isSupport && lowered === 'friend_accepted' && acceptedRe.test(message)) {
    return <>Ahora son amigos</>
  }

  if (!isSupport && lowered === 'friend_request' && sentRequestRe.test(message)) {
    return <>Quiere ser tu amigo</>
  }

  let displayMessage = message
  if (!isSupport && lowered === 'comment_mention' && mentionInCommentRe.test(message)) {
    displayMessage = stripLegacyMentionPrefix(message)
  } else if (!isSupport) {
    displayMessage = sanitizeTechnicalMentions(displayMessage)
  }

  if (!displayMessage && !isSupport && lowered === 'comment_mention') {
    return <>Te mencion{O_ACUTE} en un comentario</>
  }

  if (isSupport || !displayMessage.includes('@')) {
    return <>{displayMessage}</>
  }

  const parts = displayMessage.split(/(@[\w.-]+)/g)
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith('@') ? (
          <span key={`${part}-${index}`} className={USERNAME_CLASS}>
            {part}
          </span>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      )}
    </>
  )
}
