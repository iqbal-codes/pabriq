import { StreamdownTextPrimitive } from '@assistant-ui/react-streamdown'
import { code } from '@streamdown/code'
import { math } from '@streamdown/math'
import { mermaid } from '@streamdown/mermaid'
import { memo } from 'react'

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
