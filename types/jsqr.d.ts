declare module 'jsqr' {
  export interface QRCode {
    binaryData: number[]
    data: string
    chunks: any[]
    location: any
  }
  export default function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst' }
  ): QRCode | null
}
