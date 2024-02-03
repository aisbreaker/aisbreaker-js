import { EventSourceMessage } from '@waylaidwanderer/fetch-event-source'
import { kyOnDownloadProgress4onMessage } from './KyHttpClientUtils.js'
import { DownloadProgress } from 'ky'

/**
 * Unit tests for KyHttpClientUtils
 * 
 * @group unit
 */
describe('test kyOnDownloadProgress4onMessage', () => {
  var resultStr: string = ''
  var resultParts: number = 0

  test('(1) test kyOnDownloadProgress4onMessage with 2 chunks' , () => {
    // SSE message(s) to process (part 1)
    const chunkStr1 = 
`data: {"id":"chatcmpl-8oFnk8","object":"chat.completion.chunk","created":1706989832,"model":"gpt-4-0613","system_fingerprint":null,"choices":[{"index":0,"delta":{"content":"I"},"logprobs":null,"finish_reason":null}]}

data: {"id":"chatcmpl-8oFnk8","object":"chat.completion.chunk","created":1706989832,"model":"gpt-4-0613","system_fingerprint":null,"choices":[{"index":0,"delta":{"content":" am"},"logprobs":null,"finish_reason":null}]}

data: {"id":"chatcmpl-8oFnk8","object":"chat.completion.chunk","created":1706989832,"model":"gpt-4-0613","system_fingerprint":null,"choices":[{"index":0,"delta":{"content":" an"},"logprobs":null,"finish_reason":null}]}

data: {"id":"chatcmpl-8oFnk8","object":"chat.completion.chunk","created":1706989832,"model":"gpt-4-0613","system_fingerprint":null,"choices":[{"index":0,"delta":{"content":" open"},"logprobs":null,"finish_reason":null}]}
`
    const chunk1: Uint8Array = new TextEncoder().encode(chunkStr1)
    const progress1: DownloadProgress = { percent: 0, transferredBytes: chunk1.length, totalBytes: 0 }

    // SSE message(s) to process (part 2)
    const chunkStr2 = 
`
data: {"id":"chatcmpl-8oFnk8","object":"chat.completion.chunk","created":1706989832,"model":"gpt-4-0613","system_fingerprint":null,"choices":[{"index":0,"delta":{"content":" AIs"},"logprobs":null,"finish_reason":null}]}

data: {"id":"chatcmpl-8oFnk8","object":"chat.completion.chunk","created":1706989832,"model":"gpt-4-0613","system_fingerprint":null,"choices":[{"index":0,"delta":{"content":"Breaker"},"logprobs":null,"finish_reason":null}]}

data: {"id":"chatcmpl-8oFnk8","object":"chat.completion.chunk","created":1706989832,"model":"gpt-4-0613","system_fingerprint":null,"choices":[{"index":0,"delta":{"content":" tool"},"logprobs":null,"finish_reason":null}]}

`
    const chunk2: Uint8Array = new TextEncoder().encode(chunkStr2)
    const progress2: DownloadProgress = { percent: 0, transferredBytes: chunk1.length+chunk2.length, totalBytes: 0 }

    // process SSE message(s) for this test
    let onMessage = (message: EventSourceMessage) => {
      console.log(message)
      resultParts++
      try {
        const data = JSON.parse(message.data)
        resultStr += data.choices[0].delta.content
      } catch (err) {
        console.error(err)
      }
    }

    // action
    const onDownloadProgress = kyOnDownloadProgress4onMessage(onMessage)
    onDownloadProgress(progress1, chunk1)
    onDownloadProgress(progress2, chunk2)

    // check
    expect(resultParts).toBe(7)
    expect(resultStr).toBe('I am an open AIsBreaker tool')
  })
})
