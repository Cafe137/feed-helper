import {
    Bytes,
    FeedIndex,
    Identifier,
    MantarayNode,
    MerkleTree,
    NULL_ADDRESS,
    NULL_TOPIC,
    PrivateKey,
    Reference,
    Signature,
    Span,
    Topic
} from '@ethersphere/bee-js'
import { Binary, Chunk, Strings, Uint8ArrayReader } from 'cafe-utility'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import 'highlight.js/styles/github-dark.css'
import { useEffect, useMemo, useState } from 'react'
import { BytesInstructions } from './BytesInstructions'
import { BzzInstructions } from './BzzInstructions'
import { Row2 } from './Row2'

hljs.registerLanguage('bash', bash)

type FeedType = 'v1/legacy' | 'v2/wrapped'

type UploadType = 'bytes' | 'bzz'

interface SOC {
    payload: Uint8Array
    signature: Signature
    address: Reference
}

function makeSingleOwnerChunk(chunk: Chunk, signer: PrivateKey, identifier: Identifier): SOC {
    const socAddress = new Reference(
        Binary.keccak256(Binary.concatBytes(identifier.toUint8Array(), signer.publicKey().address().toUint8Array()))
    )
    const signature = signer.sign(Binary.concatBytes(identifier.toUint8Array(), chunk.hash()))
    const cacPayload = chunk.build().slice(0, Number(chunk.span) + Span.LENGTH)

    const span = Span.fromSlice(cacPayload, 0)
    const payload = Bytes.fromSlice(cacPayload, Span.LENGTH)

    return {
        payload: Binary.concatBytes(span.toUint8Array(), payload.toUint8Array()),
        signature,
        address: socAddress
    }
}

export function App() {
    const [feedType, setFeedType] = useState<FeedType>('v1/legacy')
    const [uploadType, setUploadType] = useState<UploadType>('bytes')
    const [privateKey, setPrivateKey] = useState(new PrivateKey(Strings.randomHex(64)))
    const [topic, setTopic] = useState<string>(Strings.randomHex(64))
    const [batchId, setBatchId] = useState<string>('b961413232c96eedae48947a71c99e454e51c4b5bf93a77c59f958af1229a932')
    const [index, setIndex] = useState(0)
    const [payload, setPayload] = useState<string>('Testing at ' + new Date().toISOString())
    const [soc, setSoc] = useState<SOC | null>(null)
    const [wrappedSoc, setWrappedSoc] = useState<SOC | null>(null)
    const [bytesSoc, setBytesSoc] = useState<SOC | null>(null)
    const [wrappedBytesSoc, setWrappedBytesSoc] = useState<SOC | null>(null)

    const [manifestAddress, setManifestAddress] = useState<string>('')

    const feedIdentifier = new Identifier(
        Binary.keccak256(
            Binary.concatBytes(new Topic(topic).toUint8Array(), FeedIndex.fromBigInt(BigInt(index)).toUint8Array())
        )
    )

    const address = useMemo(() => {
        return privateKey.publicKey().address().toHex()
    }, [privateKey])

    useEffect(() => {
        async function computeExpectedHash() {
            const dataHash = await MerkleTree.root(new TextEncoder().encode(payload))
            const mantaray = new MantarayNode()
            mantaray.addFork('/', NULL_ADDRESS, {
                'website-index-document': 'payload.txt'
            })
            mantaray.addFork('payload.txt', dataHash.hash(), {
                'Content-Type': 'text/plain',
                Filename: 'payload.txt'
            })
            const address = await mantaray.calculateSelfAddress()
            const reader = new Uint8ArrayReader(
                Binary.concatBytes(
                    Binary.numberToUint64(BigInt(Math.floor(Date.now() / 1000)), 'BE'),
                    address.toUint8Array()
                )
            )
            const chunk = new Chunk(4096)
            chunk.span = BigInt(chunk.writer.write(reader))
            setSoc(makeSingleOwnerChunk(chunk, privateKey, feedIdentifier))
            const wrappedChunk = await MerkleTree.root(await mantaray.marshal())
            setWrappedSoc(makeSingleOwnerChunk(wrappedChunk, privateKey, feedIdentifier))
            const bytesChunk = await MerkleTree.root(new TextEncoder().encode(payload))
            const bytesSocCac = await MerkleTree.root(
                Binary.concatBytes(
                    Binary.numberToUint64(BigInt(Math.floor(Date.now() / 1000)), 'BE'),
                    bytesChunk.hash()
                )
            )
            setBytesSoc(makeSingleOwnerChunk(bytesSocCac, privateKey, feedIdentifier))
            const wrappedBytesChunk = await MerkleTree.root(new TextEncoder().encode(payload))
            setWrappedBytesSoc(makeSingleOwnerChunk(wrappedBytesChunk, privateKey, feedIdentifier))
        }
        computeExpectedHash()
    }, [payload, topic, address])

    useEffect(() => {
        async function computeExpectedHash() {
            const mantaray = new MantarayNode()
            mantaray.addFork('/', NULL_ADDRESS, {
                'swarm-feed-owner': address,
                'swarm-feed-topic': topic,
                'swarm-feed-type': 'Sequence'
            })
            mantaray.find('/')!.selfAddress = Binary.hexToUint8Array(
                '8504f2a107ca940beafc4ce2f6c9a9f0968c62a5b5893ff0e4e1e2983048d276'
            )
            console.log(Binary.uint8ArrayToHex(await mantaray.marshal()))
            setManifestAddress((await mantaray.calculateSelfAddress()).toHex())
        }
        computeExpectedHash()
    }, [address, topic])

    return (
        <div>
            <Row2 lwidth={140}>
                <p>Feed Type</p>
                <select value={feedType} onChange={e => setFeedType(e.target.value as FeedType)}>
                    <option value="v1/legacy">v1/legacy</option>
                    <option value="v2/wrapped">v2/wrapped</option>
                </select>
            </Row2>
            <Row2 lwidth={140}>
                <p>Upload Type</p>
                <select value={uploadType} onChange={e => setUploadType(e.target.value as UploadType)}>
                    <option value="bytes">bytes</option>
                    <option value="bzz">bzz</option>
                </select>
            </Row2>
            <Row2 lwidth={140}>
                <p>Private Key</p>
                <div>
                    <input
                        type="text"
                        value={privateKey.toHex()}
                        onChange={e => setPrivateKey(new PrivateKey(e.target.value))}
                        size={120}
                    />
                    <button onClick={() => setPrivateKey(new PrivateKey(Strings.randomHex(64)))}>Regenerate</button>
                </div>
            </Row2>
            <Row2 lwidth={140}>
                <p>Ethereum Address</p>
                <input type="text" value={address} readOnly size={120} />
            </Row2>
            <Row2 lwidth={140}>
                <p>Topic</p>
                <div>
                    <input type="text" value={topic} onChange={e => setTopic(e.target.value)} size={120} />
                    <button onClick={() => setTopic(NULL_TOPIC.toHex())}>Nullify</button>
                    <button onClick={() => setTopic(Strings.randomHex(64))}>Regenerate</button>
                </div>
            </Row2>
            <Row2 lwidth={140}>
                <p>Batch ID</p>
                <input type="text" value={batchId} onChange={e => setBatchId(e.target.value)} size={120} />
            </Row2>
            <Row2 lwidth={140}>
                <p>Payload</p>
                <textarea value={payload} onChange={e => setPayload(e.target.value)} rows={10} cols={50} />
            </Row2>
            {uploadType === 'bytes' ? (
                <BytesInstructions
                    address={address}
                    batchId={batchId}
                    feedIdentifier={feedIdentifier}
                    feedType={feedType}
                    payload={payload}
                    soc={bytesSoc}
                    topic={topic}
                    wrappedSoc={wrappedBytesSoc}
                />
            ) : (
                <BzzInstructions
                    address={address}
                    batchId={batchId}
                    feedIdentifier={feedIdentifier}
                    feedType={feedType}
                    manifestAddress={manifestAddress}
                    payload={payload}
                    soc={soc}
                    topic={topic}
                    wrappedSoc={wrappedSoc}
                />
            )}
        </div>
    )
}
