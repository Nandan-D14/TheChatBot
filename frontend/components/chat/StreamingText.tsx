/**
 * Streaming text indicator component
 * Shows a subtle animation while the AI is generating a response
 */
export function StreamingText() {
  return (
    <span className="inline-flex items-center gap-1 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">
      <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
      <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
      <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
    </span>
  )
}
