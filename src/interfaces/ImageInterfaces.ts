export interface PixelLocation {
    x: number
    y: number
}

export interface SelectedPopulation {
    id: string
    renderOrder: number
    // The coordinates of the selected region. In PIXI polygon format [x1, y1, x2, y2, ...]
    regionOutline: number[] | null
    // The IDs of the selected segments
    selectedSegments: number[]
    regionGraphics: PIXI.Graphics | PIXI.Sprite | null
    segmentGraphics: PIXI.Graphics | null
    name: string
    color: number
    visible: boolean
}

export interface TiffDataMap {
    [key: string]: Float32Array | Uint16Array | Uint8Array
}

export interface MinMax {
    min: number
    max: number
}

export interface MinMaxMap {
    [key: string]: MinMax
}

export interface SpriteMap {
    [key: string]: PIXI.Sprite
}

export interface RGBColor {
    r: number
    g: number
    b: number
}

export interface RGBColorCollection {
    [key: string]: RGBColor
}
