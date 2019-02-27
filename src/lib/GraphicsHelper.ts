import * as PIXI from 'pixi.js'

import { SegmentationData } from './SegmentationData'
import { ImageData } from './ImageData'
import { ChannelName, DefaultSegmentOutlineAlpha } from '../interfaces/UIDefinitions'
import { PixelLocation } from '../interfaces/ImageInterfaces'

export function randomHexColor(): number {
    return Math.round(0xffffff * Math.random())
}

export function randomRGBColor(): { r: number; g: number; b: number } {
    let c = randomHexColor()
    let r = c >> 16
    let g = (c >> 8) & 255
    let b = c & 255
    return { r: r, g: g, b: b }
}

// Gets RGB values from a hex number representing a color.
export function hexToRGB(hex: number): { r: number; g: number; b: number } {
    let r = (hex >> 16) & 255
    let g = (hex >> 8) & 255
    let b = hex & 255
    return { r: r, g: g, b: b }
}

export function imageBitmapToSprite(bitmap: ImageBitmap): PIXI.Sprite {
    let offScreen = document.createElement('canvas')

    offScreen.width = bitmap.width
    offScreen.height = bitmap.height

    let ctx = offScreen.getContext('2d')
    if (ctx) ctx.drawImage(bitmap, 0, 0)
    return new PIXI.Sprite(PIXI.Texture.fromCanvas(offScreen))
}

// Draws a cross in the following order centered at X and Y
//
//       (2) *     * (3)
//
// (12)* (1) *     * (4) * (5)
//
// (11)* (10)*     * (7) * (6)
//
//      (9) *      * (8)
//
function drawCross(graphics: PIXI.Graphics, x: number, y: number, armLength: number, armHalfWidth: number): void {
    graphics.drawPolygon([
        x - armHalfWidth,
        y + armHalfWidth, //1
        x - armHalfWidth,
        y + armHalfWidth + armLength,
        x + armHalfWidth,
        y + armHalfWidth + armLength,
        x + armHalfWidth,
        y + armHalfWidth,
        x + (armHalfWidth + armLength),
        y + armHalfWidth,
        x + (armHalfWidth + armLength),
        y - armHalfWidth,
        x + armHalfWidth,
        y - armHalfWidth,
        x + armHalfWidth,
        y - (armHalfWidth + armLength),
        x - armHalfWidth,
        y - (armHalfWidth + armLength),
        x - armHalfWidth,
        y - armHalfWidth,
        x - (armHalfWidth + armLength),
        y - armHalfWidth,
        x - (armHalfWidth + armLength),
        y + armHalfWidth, //12
    ])
}

// When passed a map of segmentIds to their centroids
export function drawCentroids(selectedCentroids: { [key: number]: PixelLocation }, color: number): PIXI.Graphics {
    let centroidGraphics = new PIXI.Graphics()

    centroidGraphics.beginFill(color)
    for (let segmentId in selectedCentroids) {
        let centroid = selectedCentroids[segmentId]
        drawCross(centroidGraphics, centroid.x, centroid.y, 2, 0.5)
    }
    centroidGraphics.endFill()

    return centroidGraphics
}

// Draws a selected region of the format [x, y, x, y, ...] of the given color and alpha
export function drawSelectedRegion(selection: number[], color: number, alpha: number): PIXI.Graphics {
    let selectionGraphics = new PIXI.Graphics()
    selectionGraphics.beginFill(color)
    selectionGraphics.drawPolygon(selection)
    selectionGraphics.endFill()
    selectionGraphics.alpha = alpha
    return selectionGraphics
}

// Returns an array of segmentIds whose centroids collide with the selection in selectionGraphics
function findSegmentsInSelection(selectionGraphics: PIXI.Graphics, segmentationData: SegmentationData): number[] {
    let selectedSegments: number[] = []
    for (let segmentId in segmentationData.centroidMap) {
        let centroid = segmentationData.centroidMap[segmentId]
        let centroidPoint = new PIXI.Point(centroid.x, centroid.y)
        if (selectionGraphics.containsPoint(centroidPoint)) {
            selectedSegments.push(Number(segmentId))
        }
    }
    return selectedSegments
}

// Cleans up the graphics/sprites passed in.
export function cleanUpStage(
    stage: PIXI.Container,
    selectionGraphics: PIXI.Graphics | null,
    segmentOutlineGraphics: PIXI.Graphics | null,
): void {
    if (selectionGraphics != null) {
        stage.removeChild(selectionGraphics)
        selectionGraphics.destroy()
    }

    if (segmentOutlineGraphics != null) {
        stage.removeChild(segmentOutlineGraphics)
        segmentOutlineGraphics.destroy()
    }
}

// Deletes the selectionGraphics and centroidGraphics being passed in (important when the user is actively selecting and these are being redrawn)
// Then draws a new selectionGraphics of the region, finds the segments and their centroids in that selectionGraphics, and draws the selectedCentroids.
// Returns the selectedCentroids and the graphics objects so that they can be deleted if we are re-drawing.
export function selectRegion(
    selection: number[],
    segmentationData: SegmentationData | null,
    color: number,
    alpha: number,
): { selectionGraphics: PIXI.Graphics; selectedSegments: number[] } {
    let selectionGraphics = drawSelectedRegion(selection, color, alpha)

    let selectedSegments: number[] = []
    if (segmentationData != null) {
        selectedSegments = findSegmentsInSelection(selectionGraphics, segmentationData)
    }

    return { selectionGraphics: selectionGraphics, selectedSegments: selectedSegments }
}

// Expects an array containing arrays of pixel locations.
// Each array of pixel locations should be the coordinates of the outline.
// The easiest way to get these is from the SegmentationData segmentOutlineMap
export function drawOutlines(
    outlines: PixelLocation[][],
    color: number,
    width: number,
    alignment = 0.5,
): PIXI.Graphics {
    let outlineGraphics = new PIXI.Graphics()
    // Always set the alpha to 1.0 and adjust it elsewhere
    // Otherwise PIXI is funny with calculating alpha, and it becomes difficult to set to 1.0 later
    outlineGraphics.lineStyle(width, color, DefaultSegmentOutlineAlpha, alignment)
    for (let outline of outlines) {
        // Copy the outline array so we're not modifying the one being passed in
        outline = outline.slice()
        let start = outline.shift()
        if (start) {
            outlineGraphics.moveTo(start.x, start.y)
            for (let point of outline) {
                outlineGraphics.lineTo(point.x, point.y)
            }
        }
    }
    return outlineGraphics
}

// Generating brightness filter code for the passed in channel.
// Somewhat hacky workaround without uniforms because uniforms weren't working with Typescript.
export function generateBrightnessFilterCode(
    channelName: ChannelName,
    imcData: ImageData,
    channelMarker: Record<ChannelName, string | null>,
    channelDomain: Record<ChannelName, [number, number]>,
): string {
    let curChannelDomain = channelDomain[channelName]

    // Get the max value for the given channel.
    let marker = channelMarker[channelName]
    let channelMax = 100.0
    if (marker != null) {
        channelMax = imcData.minmax[marker].max
    }

    // Get the PIXI channel name (i.e. r, g, b) from the first character of the channelName.
    let channel = channelName.charAt(0)

    // Using slider values to generate m and b for a linear transformation (y = mx + b).
    let b = (curChannelDomain[0] === 0 ? 0 : curChannelDomain[0] / channelMax).toFixed(4)
    let m = (curChannelDomain[1] === 0 ? 0 : channelMax / (curChannelDomain[1] - curChannelDomain[0])).toFixed(4)

    let filterCode = `
    varying vec2 vTextureCoord;
    varying vec4 vColor;

    uniform sampler2D uSampler;
    uniform vec4 uTextureClamp;
    uniform vec4 uColor;

    void main(void)
    {
        gl_FragColor = texture2D(uSampler, vTextureCoord);
        gl_FragColor.${channel} = min((gl_FragColor.${channel} * ${m}) + ${b}, 1.0);
    }`

    return filterCode
}
