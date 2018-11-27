//Typescript workaround so that we're interacting with a Worker instead of a Window interface
const ctx: Worker = self as any

import * as d3Scale from "d3-scale"
import * as path from "path"

import { MinMax, ImageDataWorkerResult, ImageDataWorkerError } from "../interfaces/ImageInterfaces"
import { readTiffData } from "../lib/TiffHelper"

async function bitmapFromData(v: Float32Array | Uint16Array | Uint8Array, width: number, height: number, minmax: MinMax) {
    // @ts-ignore
    let offScreen = new OffscreenCanvas(width, height)

    let ctx = offScreen.getContext("2d")
    if(ctx) {
        let imageData = ctx.getImageData(0, 0, offScreen.width, offScreen.height)
        let canvasData = imageData.data
        
        let colorScale = d3Scale.scaleLinear()
                .domain([minmax.min, minmax.max])
                .range([0, 255])

        // iterating through the values in the tiff and setting them in the canvas
        for(let i = 0; i < v.length; ++i) {
            let x = colorScale(v[i])
            // tiff data (v) has one value per pixel whereas a canvas has four (rgba)
            // Bitshift by 2 (same as multiplying by 4) to get the starting index on the canvas
            let canvasIndex = i << 2
            canvasData[canvasIndex] = x       // r
            canvasData[canvasIndex + 1] = x   // g
            canvasData[canvasIndex + 2] = x   // b
            canvasData[canvasIndex + 3] = 255 // a
        }
        ctx.putImageData(imageData, 0, 0)
    }

    let bitmap = await createImageBitmap(offScreen)
    
    return(bitmap)
}

function calculateMinMaxIntensity(v: Float32Array | Uint16Array | Uint8Array) {
    let min = v[0]
    let max = v[0]
    for (let curValue of v){
        if (curValue < min) min = curValue
        if (curValue > max) max = curValue 
    }
    return({min: min, max: max})
}

async function readFile(filepath: string, onError: (err:any) => void):Promise<ImageDataWorkerResult|ImageDataWorkerError> {
    let parsed = path.parse(filepath)
    let chName = parsed.name
    try {
        let tiffData = readTiffData(filepath)
        let {data, width, height} = tiffData

        // Calculate the minimum and maximum channel intensity
        let minmax = calculateMinMaxIntensity(data)
        // Generate an ImageBitmap from the tiffData
        // ImageBitmaps are rendered canvases can be passed between processes
        let bitmap = await bitmapFromData(data, width, height, minmax)

        return({chName: chName, width: width, height: height, data: data, bitmap: bitmap, minmax: minmax})
    } catch (err) {
        onError({error: err.message, chName: chName})
    }
}

ctx.addEventListener('message', (message) => {
    var data = message.data
    readFile(data.filepath, (err) => {
        // If we have an error, send the message.
        ctx.postMessage(err)
    }).then((message) => {
        // Send the message and then specify the large data array and bitmap as transferrables
        // Using transferrables dramatically speeds up transfer back to the main thread
        // However, closing/terminating the worker causes this to fail and crash (bug in Chromium maybe?)
        if(message && 'data' in message && 'bitmap' in message) ctx.postMessage(message, [message.data.buffer, message.bitmap])
    })
}, false)