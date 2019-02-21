import { PlotStatistic } from "../interfaces/UIDefinitions"
import { calculateMean, calculateMedian} from "../lib/StatsHelper"

//Typescript workaround so that we're interacting with a Worker instead of a Window interface
const ctx: Worker = self as any

function meanPixelIntensity(tiffData: Float32Array | Uint16Array | Uint8Array, pixels:number[]):number {
    let values = []
    for (let curPixel of pixels){
       values.push(tiffData[curPixel])
    }
    return calculateMean(values)
}

function medianPixelIntensity(tiffData: Float32Array | Uint16Array | Uint8Array, pixels:number[]):number {
    let values = []
    for (let curPixel of pixels){
        values.push(tiffData[curPixel])
    }
    return calculateMedian(values)
    // Find the median! Sort the intensity values by intensity.

}

function generateStatisticMap(channel: string,
    tiffData: Float32Array | Uint16Array | Uint8Array,
    segmentIndexMap: Record<number, number[]>,
    statistic: PlotStatistic)
{
    let min:number, max:number
    let statisticMap = {}
    for (let segmentId in segmentIndexMap){
        let mapKey = channel + '_' + segmentId
        let curIntensity:number
        if(statistic == 'mean'){
            curIntensity = meanPixelIntensity(tiffData, segmentIndexMap[segmentId])
        } else if (statistic == 'median') {
            curIntensity = medianPixelIntensity(tiffData, segmentIndexMap[segmentId])
        }
        statisticMap[mapKey] = curIntensity
        // Calculate the min and max for this channel
        if(min == undefined) min = curIntensity
        if(max == undefined) max = curIntensity
        if(curIntensity < min) min = curIntensity
        if(curIntensity > max) max = curIntensity
    }
    return {map: statisticMap, minMax: {min: min, max:max}}
}

ctx.addEventListener('message', (message) => {
    let data = message.data
    let {map, minMax} = generateStatisticMap(data.channel, data.tiffData, data.segmentIndexMap, data.statistic)
    ctx.postMessage({statistic: data.statistic, map: map, minmax: minMax, chName: data.channel})
}, false)
