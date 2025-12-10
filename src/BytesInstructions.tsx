import { Binary } from 'cafe-utility'
import hljs from 'highlight.js/lib/core'

interface Props {
    feedType: 'v1/legacy' | 'v2/wrapped'
    batchId: string
    payload: string
    soc: { payload: Uint8Array; signature: { toHex: () => string } } | null
    wrappedSoc: { payload: Uint8Array; signature: { toHex: () => string } } | null
    address: string
    feedIdentifier: { toHex: () => string }
    topic: string
}

export function BytesInstructions({
    feedType,
    batchId,
    payload,
    soc,
    wrappedSoc,
    address,
    feedIdentifier,
    topic
}: Props) {
    return (
        <pre
            dangerouslySetInnerHTML={{
                __html:
                    feedType === 'v1/legacy'
                        ? hljs.highlight(
                              `# First upload the raw data

curl -X POST "http://localhost:1633/bytes" \\
    --header "swarm-postage-batch-id: ${batchId}" \\
    --data "${payload}"

# Upload feed SOC

echo "${soc ? Binary.uint8ArrayToHex(soc.payload) : ''}" | \\
    xxd -r -p | \\
    curl -X POST http://localhost:1633/soc/${address}/${feedIdentifier.toHex()} \\
        --header "swarm-postage-batch-id: ${batchId}" \\
        --url-query sig=${soc ? soc.signature.toHex() : ''} \\
        --data-binary @-

# Verify feed endpoint: should return payload verbatim

curl http://localhost:1633/feeds/${address}/${topic} | hexdump -Cv
`,
                              { language: 'bash' }
                          ).value
                        : hljs.highlight(
                              `# Upload the data as part of the SOC

echo "${wrappedSoc ? Binary.uint8ArrayToHex(wrappedSoc.payload) : ''}" | \\
    xxd -r -p | \\
    curl -X POST http://localhost:1633/soc/${address}/${feedIdentifier.toHex()} \\
        --header "swarm-postage-batch-id: ${batchId}" \\
        --url-query sig=${wrappedSoc ? wrappedSoc.signature.toHex() : ''} \\
        --data-binary @-

# Verify feed endpoint: should return marshalled mantaray node

curl http://localhost:1633/feeds/${address}/${topic} | hexdump -Cv
                    `,
                              { language: 'bash' }
                          ).value
            }}
        ></pre>
    )
}
