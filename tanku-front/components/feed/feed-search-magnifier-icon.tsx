'use client'

/**
 * Misma lupa que el buscador del feed (`FeedNav` / `LandingNav`).
 */
export function FeedSearchMagnifierIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 41 42"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M26.8334 8.76545L30.1099 22.6447L20.9442 31.156L8.1482 27.8382L4.84774 14.0188L14.8779 5.75197L26.8334 8.76545Z"
        stroke="#B8C4CC"
        strokeWidth="3"
      />
      <line
        y1="-1.5"
        x2="20.427"
        y2="-1.5"
        transform="matrix(0.709973 0.704229 -0.70423 0.709971 24.3841 27.5551)"
        stroke="#B8C4CC"
        strokeWidth="3"
      />
    </svg>
  )
}
