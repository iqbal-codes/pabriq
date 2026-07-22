import { TextMessagePartProvider } from '@assistant-ui/react'
import { StreamdownTextPrimitive } from '@assistant-ui/react-streamdown'
import { code } from '@streamdown/code'
import { math } from '@streamdown/math'
import { mermaid } from '@streamdown/mermaid'
import { memo } from 'react'

/** Renders text from assistant-ui MessagePart context (used inside MessagePrimitive.Parts). */
const StreamdownTextImpl = () => {
  return (
    <StreamdownTextPrimitive
      plugins={{ code, math, mermaid }}
      shikiTheme={['github-light', 'github-dark']}
      className="aui-md"
    />
  )
}

export const StreamdownText = memo(StreamdownTextImpl)

/**
 * Renders streaming markdown with an explicit text prop.
 * Uses TextMessagePartProvider so StreamdownTextPrimitive can read the text
 * directly — bypasses the assistant-ui runtime message converter cache
 * (which returns stale data during streaming).
 */
export function StreamingMarkdown({
  text,
  isRunning = false,
}: {
  text: string
  isRunning?: boolean
}) {
  return (
    <TextMessagePartProvider text={text} isRunning={isRunning}>
      <StreamdownTextPrimitive
        plugins={{ code, math, mermaid }}
        shikiTheme={['github-light', 'github-dark']}
        className="aui-md"
      />
    </TextMessagePartProvider>
  )
}
