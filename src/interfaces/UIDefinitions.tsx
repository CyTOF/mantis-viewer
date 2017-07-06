export type ChannelName = "rChannel" | "gChannel" | "bChannel"
export type D3BrushExtent = [[number, number], [number, number]]
export type BrushEventHandler = ((extent: D3BrushExtent) => void)
export type SelectOption = {label: string, value: string}
export interface LabelLayer {
    name: string
    width: number
    height: number
    data: Uint8ClampedArray
}