import * as stringify from 'csv-stringify'
import * as fs from 'fs'
import * as path from 'path'

import { ImageSetStore } from '../stores/ImageSetStore'
import { PlotStatistic } from '../definitions/UIDefinitions'
import { writeToFCS } from '../lib/FcsWriter'

export function exportMarkerIntensisties(
    filename: string,
    statistic: PlotStatistic,
    imageSetStore: ImageSetStore,
): void {
    let imageStore = imageSetStore.imageStore
    let imageData = imageStore.imageData
    let segmentationStore = imageSetStore.segmentationStore
    let segmentationData = segmentationStore.segmentationData
    let segmentationStatistics = segmentationStore.segmentationStatistics
    let populationStore = imageSetStore.populationStore

    if (imageData != null && segmentationData != null && segmentationStatistics != null) {
        let markers = imageData.markerNames
        let data = [] as string[][]

        // Generate the header
        let columns = ['Segment ID']
        for (let marker of markers) {
            columns.push(marker)
        }
        columns.push('Centroid X')
        columns.push('Centroid Y')
        columns.push('Populations')

        // Iterate through the segments and calculate the intensity for each marker
        let indexMap = segmentationData.segmentIndexMap
        let centroidMap = segmentationData.centroidMap
        for (let s in indexMap) {
            let segmentId = parseInt(s)
            let segmentData = [s] as string[]
            for (let marker of markers) {
                if (statistic == 'mean') {
                    segmentData.push(segmentationStatistics.meanIntensity(marker, [segmentId]).toString())
                } else {
                    segmentData.push(segmentationStatistics.medianIntensity(marker, [segmentId]).toString())
                }
            }

            // Add the Centroid points
            let segmentCentroid = centroidMap[segmentId]
            segmentData.push(segmentCentroid.x.toString())
            segmentData.push(segmentCentroid.y.toString())

            // Figure out which populations this segment belongs to
            let populations = []
            for (let population of populationStore.selectedPopulations) {
                if (population.selectedSegments.indexOf(segmentId) > -1) populations.push(population.name)
            }
            segmentData.push(populations.join(','))

            data.push(segmentData)
        }

        // Write to a CSV
        stringify(data, { header: true, columns: columns }, (err, output) => {
            if (err) console.log('Error saving intensities ' + err)
            fs.writeFile(filename, output, err => {
                if (err) console.log('Error saving intensities ' + err)
            })
        })
    }
}

export function exportToFCS(
    filePath: string,
    statistic: PlotStatistic,
    imageSetStore: ImageSetStore,
    segmentIds?: number[],
): void {
    let projectStore = imageSetStore.projectStore
    let imageStore = imageSetStore.imageStore
    let imageData = imageStore.imageData
    let segmentationStore = imageSetStore.segmentationStore
    let segmentationData = segmentationStore.segmentationData
    let segmentationStatistics = segmentationStore.segmentationStatistics

    if (imageData != null && segmentationData != null && segmentationStatistics != null) {
        let markers = imageData.markerNames
        let data = [] as number[][]
        // Iterate through the segments and calculate the intensity for each marker
        let indexMap = segmentationData.segmentIndexMap
        let centroidMap = segmentationData.centroidMap
        for (let s in indexMap) {
            let segmentId = parseInt(s)
            // If segmentIds isn't defined include this segment, otherwise check if this segment is in segmentIds
            if (segmentIds == undefined || segmentIds.includes(segmentId)) {
                let segmentData = [] as number[]
                for (let marker of markers) {
                    if (statistic == 'mean') {
                        segmentData.push(segmentationStatistics.meanIntensity(marker, [segmentId]))
                    } else {
                        segmentData.push(segmentationStatistics.medianIntensity(marker, [segmentId]))
                    }
                }
                let segmentCentroid = centroidMap[segmentId]
                segmentData.push(segmentCentroid.x)
                segmentData.push(segmentCentroid.y)
                segmentData.push(segmentId)
                data.push(segmentData)
            }
        }
        writeToFCS(filePath, markers.concat(['Centroid X', 'Centroid Y', 'Segment ID']), data, projectStore.appVersion)
    }
}

export function exportPopulationsToFCS(
    dirName: string,
    statistic: PlotStatistic,
    imageSetStore: ImageSetStore,
    filePrefix?: string,
): void {
    let populationStore = imageSetStore.populationStore
    for (let population of populationStore.selectedPopulations) {
        // Replace spaces with underscores in the population name and add the statistic being exported
        let filename = population.name.replace(/ /g, '_') + '_' + statistic + '.fcs'
        if (filePrefix) filename = filePrefix + '_' + filename
        let filePath = path.join(dirName, filename)
        if (population.selectedSegments.length > 0) {
            exportToFCS(filePath, statistic, imageSetStore, population.selectedSegments)
        }
    }
}