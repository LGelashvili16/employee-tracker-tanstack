import { createH02, createWatch } from './protocols/ascii.ts'
import { createJt808 } from './protocols/jt808.ts'
import {
  decodedMessageSchema,
  PacketError,
  requirePacket,
} from './protocols/protocol.ts'
import type {
  DecodeContext,
  DecodedMessage,
  ProtocolAdapter,
  ProtocolMode,
} from './protocols/protocol.ts'

// Strategy registry: adding a protocol does not change the TCP server or journal.
// Factories deliberately create fresh state for every connection and replay.
export const protocolFactories = [createJt808, createWatch, createH02]
export interface FrameResult {
  hex: string
  decoded?: DecodedMessage
  error?: string
}

export class GpsSession {
  private buffer: Buffer = Buffer.alloc(0)
  private readonly adapters = protocolFactories.map((create) => create())
  private selected?: ProtocolAdapter

  constructor(
    private readonly mode: ProtocolMode,
    private readonly maxBytes = 16_384,
  ) {}

  get pendingBytes(): number {
    return this.buffer.length === 1 && this.buffer[0] === 0x7e
      ? 0
      : this.buffer.length
  }

  // TCP chunks are not messages. Retain partial frames and drain every complete
  // frame; use the same path for live traffic and offline replay.
  push(chunk: Buffer, context: DecodeContext): FrameResult[] {
    if (this.mode === 'raw') return []
    requirePacket(
      this.buffer.length + chunk.length <= this.maxBytes,
      'buffer_limit',
    )
    this.buffer = Buffer.concat([this.buffer, chunk])
    const results: FrameResult[] = []
    while (this.buffer.length > 0) {
      const adapter =
        this.selected ??
        this.adapters.find(
          (candidate) =>
            candidate.start === this.buffer[0] &&
            (this.mode === 'auto' || candidate.id === this.mode),
        )
      if (!adapter) {
        results.push({
          hex: this.buffer.toString('hex'),
          error: 'unknown_protocol',
        })
        this.buffer = Buffer.alloc(0)
        break
      }
      requirePacket(this.buffer[0] === adapter.start, 'protocol_changed')
      const end = this.buffer.indexOf(adapter.end, 1)
      if (end < 0) break
      // JT808 senders may share delimiters or send empty delimiter pairs.
      if (adapter.id === 'jt808' && end === 1) {
        this.buffer = this.buffer.subarray(1)
        continue
      }
      const frame = this.buffer.subarray(0, end + 1)
      const rest = this.buffer.subarray(end + 1)
      // Retain the closing flag as a possible shared opening flag, even across
      // TCP chunks. A doubled flag is skipped on the next iteration.
      this.buffer =
        adapter.id === 'jt808'
          ? Buffer.concat([Buffer.from([0x7e]), rest])
          : rest
      try {
        const decoded = decodedMessageSchema.parse(
          adapter.decode(frame, context),
        )
        this.selected = adapter
        results.push({ hex: frame.toString('hex'), decoded })
      } catch (error) {
        results.push({
          hex: frame.toString('hex'),
          error: error instanceof PacketError ? error.code : 'invalid_fields',
        })
      }
    }
    return results
  }
}
