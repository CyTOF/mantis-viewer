import { observable, action, when } from 'mobx'
import * as fs from 'fs'
import * as path from 'path'

import { SettingStore } from '../stores/SettingStore'
import { PreferencesStore } from './PreferencesStore'
import { GraphSelectionPrefix } from '../definitions/UIDefinitions'
import { ImageSetStore } from './ImageSetStore'
import {
    exportMarkerIntensities,
    exportToFCS,
    exportPopulationsToFCS,
    parseActivePopulationCSV,
    parseProjectPopulationCSV,
    parseActivePopulationsJSON,
} from '../lib/IOHelper'
import { PlotStatistic } from '../definitions/UIDefinitions'

export class ProjectStore {
    public appVersion: string

    @observable public projectPath: string | null
    @observable public imageSetPaths: string[]
    @observable public imageSets: Record<string, ImageSetStore>
    @observable public nullImageSet: ImageSetStore
    @observable public lastActiveImageSetPath: string | null
    @observable public activeImageSetPath: string | null

    @observable.ref public activeImageSetStore: ImageSetStore

    @observable.ref public settingStore: SettingStore
    @observable.ref public preferencesStore: PreferencesStore

    // The width and height of the main window.
    @observable public windowWidth: number | null
    @observable public windowHeight: number | null
    // Whether or not the scatter plot is in the main window
    @observable public plotInMainWindow: boolean

    // Message to be shown if there is an error.
    // Setting this to a string will cause the string to be displayed in a dialog
    // The render thread will set this back to null once displayed.
    @observable public errorMessage: string | null

    // Message to be shown if the user is being prompted to delete the active image set.
    @observable public removeMessage: string | null

    // Gets set to true when the user requests to clear segmentation so that we can ask to confirm.
    @observable public clearSegmentationRequested: boolean

    // An array to keep track of the imageSets that have been recently used/
    // Used to clear old image sets to clean up memory.
    @observable public imageSetHistory: string[]

    // Used to track progress when exporting FCS/Stats for whole project
    @observable.ref public numToExport: number
    @observable.ref public numExported: number

    public constructor(appVersion: string) {
        this.appVersion = appVersion
        this.initialize()
    }

    @action public initialize = (): void => {
        this.plotInMainWindow = true
        // First ones never get used, but here so that we don't have to use a bunch of null checks.
        // These will never be null once an image is loaded.
        // Maybe better way to accomplish this?
        this.nullImageSet = new ImageSetStore(this)
        this.activeImageSetStore = this.nullImageSet

        this.clearSegmentationRequested = false
        this.preferencesStore = new PreferencesStore()
        this.settingStore = new SettingStore(this)
        this.imageSetHistory = []
        this.numToExport = 0
        this.numExported = 0
        this.initializeImageSets()
    }

    @action public initializeImageSets = (): void => {
        this.imageSetPaths = []
        this.imageSets = {}

        this.projectPath = null
        this.activeImageSetPath = null
        this.lastActiveImageSetPath = null

        this.settingStore.initialize()
    }

    // Set the imageSetPaths and initialize all the stores with empty stores.
    @action public initializeImageSetStores = (imageSetPaths: string[]): void => {
        this.imageSetPaths = imageSetPaths
        for (let dirName of imageSetPaths) {
            this.imageSets[dirName] = new ImageSetStore(this)
        }
    }

    @action public openImageSet = (dirName: string): void => {
        // Clear out old image sets
        this.initializeImageSets()
        this.settingStore.setBasePath(dirName)
        this.setActiveImageSet(dirName)
    }

    @action public openProject = (dirName: string): void => {
        let files = fs.readdirSync(dirName)
        let paths = []
        for (let file of files) {
            let filePath = path.join(dirName, file)
            if (fs.statSync(filePath).isDirectory()) paths.push(filePath)
        }
        if (paths.length > 0) {
            // Clear out old image sets
            this.initializeImageSets()
            this.projectPath = dirName
            this.initializeImageSetStores(paths)
            this.settingStore.setBasePath(dirName)
            this.setActiveImageSet(this.imageSetPaths[0])
        } else {
            this.errorMessage = 'Warning: No image set directories found in ' + path.basename(dirName) + '.'
        }
    }

    @action public deleteActiveImageSet = (): void => {
        if (this.activeImageSetPath != null) {
            // Clear the active image set
            this.imageSetPaths = this.imageSetPaths.filter((p: string): boolean => p != this.activeImageSetPath)
            delete this.imageSets[this.activeImageSetPath]
            this.activeImageSetPath = null
            if (this.lastActiveImageSetPath != null) {
                // If we have a last active image set, go back to this.
                this.setActiveImageSet(this.lastActiveImageSetPath)
            } else if (this.imageSetPaths.length != 0) {
                // If not and we have any other image sets, set to the first.
                this.setActiveImageSet(this.imageSetPaths[0])
            }
        }
    }

    @action public loadImageStoreData = (dirName: string): void => {
        let imageStore = this.imageSets[dirName].imageStore
        if (imageStore.imageData == null) {
            // Select the directory for image data
            imageStore.selectDirectory(dirName)

            // Set defaults once image data has loaded
            when(
                (): boolean => !imageStore.imageDataLoading,
                (): void => this.settingStore.setDefaultImageSetSettings(imageStore),
            )
        }
    }

    @action private setActiveStores = (dirName: string): void => {
        this.lastActiveImageSetPath = this.activeImageSetPath
        this.activeImageSetPath = dirName
        this.activeImageSetStore = this.imageSets[dirName]
    }

    // Clears out the image set data if it shouldn't be in memory (i.e. it is not in the image set history)
    private clearImageSetData = (imageSetDir: string): void => {
        let imageSetStore = this.imageSets[imageSetDir]
        if (imageSetStore) {
            let imageStore = imageSetStore.imageStore
            let segmentationStore = imageSetStore.segmentationStore
            let selectedDirectory = imageStore.selectedDirectory
            if (selectedDirectory && !this.imageSetHistory.includes(selectedDirectory)) {
                imageStore.clearImageData()
                segmentationStore.clearSegmentationData()
            }
        }
    }

    // Adds dirName to the image set history.
    // Cleans up the oldest image set ImageStore if there are too many in memory.
    @action private cleanImageSetHistory = (dirName: string): void => {
        // If dirName is already in the history, remove it and readd it to the front
        let historyIndex = this.imageSetHistory.indexOf(dirName)
        if (historyIndex > -1) this.imageSetHistory.splice(historyIndex, 1)
        this.imageSetHistory.push(dirName)
        if (this.imageSetHistory.length > this.preferencesStore.maxImageSetsInMemory) {
            let setToClean = this.imageSetHistory.shift()
            if (setToClean) this.clearImageSetData(setToClean)
        }
    }

    @action public setActiveImageSet = (dirName: string): void => {
        this.loadImageStoreData(dirName)
        this.cleanImageSetHistory(dirName)

        // If the dirName isn't in the image set paths (i.e. adding a single folder), then add it.
        if (this.imageSetPaths.indexOf(dirName) == -1) this.imageSetPaths.push(dirName)

        // Set this directory as the active one and set the stores as the active ones.
        this.setActiveStores(dirName)

        // Use when because image data loading takes a while
        // We can't copy image set settings or set warnings until image data has loaded.
        when(
            (): boolean => !this.activeImageSetStore.imageStore.imageDataLoading,
            (): void => this.setImageSetWarnings(),
        )
    }

    // Sets warnings on the active image set
    // Currently just raises an error if no images are found.
    @action public setImageSetWarnings = (): void => {
        if (this.activeImageSetPath != null) {
            let imageStore = this.activeImageSetStore.imageStore
            if (imageStore.imageData != null) {
                if (imageStore.imageData.markerNames.length == 0) {
                    let msg = 'Warning: No tiffs found in ' + path.basename(this.activeImageSetPath) + '.'
                    msg += ' Do you wish to remove it from the list of image sets?'
                    this.removeMessage = msg
                }
            }
        }
    }

    // Jumps to the previous image set in the list of image sets
    @action public setPreviousImageSet = (): void => {
        let activeImageSetPath = this.activeImageSetPath
        let imageSetPaths = this.imageSetPaths
        if (activeImageSetPath && imageSetPaths.length > 1) {
            let activeImageSetIndex = imageSetPaths.indexOf(activeImageSetPath)
            let previousImageSetIndex = activeImageSetIndex == 0 ? imageSetPaths.length - 1 : activeImageSetIndex - 1
            this.setActiveImageSet(imageSetPaths[previousImageSetIndex])
        }
    }

    // Jumps to the next image set in the list of image sets.
    @action public setNextImageSet = (): void => {
        let activeImageSetPath = this.activeImageSetPath
        let imageSetPaths = this.imageSetPaths
        if (activeImageSetPath && imageSetPaths.length > 1) {
            let activeImageSetIndex = imageSetPaths.indexOf(activeImageSetPath)
            let previousImageSetIndex = activeImageSetIndex == imageSetPaths.length - 1 ? 0 : activeImageSetIndex + 1
            this.setActiveImageSet(imageSetPaths[previousImageSetIndex])
        }
    }

    @action public setClearSegmentationRequested = (value: boolean): void => {
        this.clearSegmentationRequested = value
    }

    // Gets called when the user clicks the 'Clear Segmentation' button and approves.
    @action public clearSegmentation = (): void => {
        this.settingStore.setSegmentationBasename(null)
        this.settingStore.clearSelectedPlotMarkers()
        for (let imageSet of this.imageSetPaths) {
            let curSet = this.imageSets[imageSet]
            if (curSet) {
                curSet.segmentationStore.clearSegmentationData()
                curSet.populationStore.deletePopulationsNotSelectedOnImage()
            }
        }
    }

    @action public setSegmentationBasename = (fName: string): void => {
        let dirname = path.dirname(fName)
        let basename = path.basename(fName)
        if (dirname == this.activeImageSetPath) {
            this.settingStore.setSegmentationBasename(basename)
        } else {
            // TODO: Not sure this is best behavior. If the segmentation file is not in the image set directory then we just set the segmentation file on the image store.
            // Could result in weird behavior when switching between image sets.
            this.activeImageSetStore.segmentationStore.setSegmentationFile(fName)
        }
    }

    @action public addPopulationFromRange = (min: number, max: number): void => {
        let settingStore = this.settingStore
        let populationStore = this.activeImageSetStore.populationStore
        let segmentationStatistics = this.activeImageSetStore.segmentationStore.segmentationStatistics
        if (segmentationStatistics != null) {
            let marker = settingStore.selectedPlotMarkers[0]
            let selectedStatistic = settingStore.plotStatistic
            let segmentIds = segmentationStatistics.segmentsInIntensityRange(
                marker,
                min,
                max,
                selectedStatistic == 'mean',
            )
            if (segmentIds.length > 0) populationStore.addSelectedPopulation(null, segmentIds, GraphSelectionPrefix)
        }
    }

    @action public clearErrorMessage = (): void => {
        this.errorMessage = null
    }

    @action public clearRemoveMessage = (): void => {
        this.removeMessage = null
    }

    @action public setWindowDimensions = (width: number, height: number): void => {
        this.windowWidth = width
        this.windowHeight = height
    }

    @action public setPlotInMainWindow = (inWindow: boolean): void => {
        this.plotInMainWindow = inWindow
    }

    @action public incrementNumToExport = (): void => {
        this.numToExport += 1
    }

    @action public incrementNumExported = (): void => {
        this.numExported += 1
        // If we've exported all files, mark done.
        if (this.numExported >= this.numToExport) {
            this.numToExport = 0
            this.numExported = 0
        }
    }

    // Export project level summary stats to fcs if fcs is true or csv if fcs is false.
    // CSVs always contain population information. FCSs do not have anywhere to store this.
    // If populations is true, exports one FCS file per population. Has no effect if fcs is false.
    private exportProjectSummaryStats = (
        dirName: string,
        statistic: PlotStatistic,
        fcs: boolean,
        populations: boolean,
    ): void => {
        for (let curDir of this.imageSetPaths) {
            // Incrementing num to export so we can have a loading bar.
            this.incrementNumToExport()
            this.loadImageStoreData(curDir)
            let imageSetStore = this.imageSets[curDir]
            let imageStore = imageSetStore.imageStore
            let segmentationStore = imageSetStore.segmentationStore
            when(
                (): boolean => !imageStore.imageDataLoading,
                (): void => {
                    // If we don't have segmentation, then skip this one.
                    if (segmentationStore.selectedSegmentationFile) {
                        when(
                            (): boolean =>
                                !segmentationStore.segmentationDataLoading &&
                                !segmentationStore.segmentationStatisticsLoading,
                            (): void => {
                                let selectedDirectory = imageStore.selectedDirectory
                                if (selectedDirectory) {
                                    let imageSetName = path.basename(selectedDirectory)
                                    if (populations && fcs) {
                                        exportPopulationsToFCS(dirName, statistic, imageSetStore, imageSetName)
                                    } else {
                                        let extension = fcs ? '.fcs' : '.csv'
                                        let filename = imageSetName + '_' + statistic + extension
                                        let filePath = path.join(dirName, filename)
                                        if (fcs) {
                                            exportToFCS(filePath, statistic, imageSetStore)
                                        } else {
                                            exportMarkerIntensities(filePath, statistic, imageSetStore)
                                        }
                                    }
                                    // Mark this set of files as loaded for loading bar.
                                    this.incrementNumExported()
                                    this.clearImageSetData(curDir)
                                }
                            },
                        )
                    } else {
                        // Mark as success if we're not going to export it
                        this.incrementNumExported()
                        this.clearImageSetData(curDir)
                    }
                },
            )
        }
    }

    public exportActiveImageSetMarkerIntensities = (filePath: string, statistic: PlotStatistic): void => {
        exportMarkerIntensities(filePath, statistic, this.activeImageSetStore)
    }

    public exportProjectMarkerIntensities = (dirName: string, statistic: PlotStatistic): void => {
        this.exportProjectSummaryStats(dirName, statistic, false, false)
    }

    public exportActiveImageSetToFcs = (filePath: string, statistic: PlotStatistic): void => {
        exportToFCS(filePath, statistic, this.activeImageSetStore)
    }

    public exportActiveImageSetPopulationsToFcs = (filePath: string, statistic: PlotStatistic): void => {
        exportPopulationsToFCS(filePath, statistic, this.activeImageSetStore)
    }

    public exportProjectToFCS = (dirName: string, statistic: PlotStatistic, populations: boolean): void => {
        this.exportProjectSummaryStats(dirName, statistic, true, populations)
    }

    public importActivePopulationsFromJSON = (filepath: string): void => {
        let activePopulationStore = this.activeImageSetStore.populationStore
        let populations = parseActivePopulationsJSON(filepath)
        populations.map(
            (population): void => {
                activePopulationStore.addSelectedPopulation(
                    population.selectedRegion,
                    population.selectedSegments,
                    null,
                    population.name,
                    population.color,
                )
            },
        )
    }

    public importActivePopulationsFromCSV = (filePath: string): void => {
        let populations = parseActivePopulationCSV(filePath)
        for (let populationName in populations) {
            this.activeImageSetStore.populationStore.addSelectedPopulation(
                null,
                populations[populationName],
                null,
                populationName,
                null,
            )
        }
    }

    public importProjectPopulationsFromCSV = (filePath: string): void => {
        let populations = parseProjectPopulationCSV(filePath)
        for (let imageSetName in populations) {
            let imageSetPopulations = populations[imageSetName]
            if (this.projectPath) {
                let imageSetPath = path.join(this.projectPath, imageSetName)
                let imageSet = this.imageSets[imageSetPath]
                if (imageSet) {
                    let populationStore = imageSet.populationStore
                    for (let populationName in imageSetPopulations) {
                        populationStore.addSelectedPopulation(
                            null,
                            imageSetPopulations[populationName],
                            null,
                            populationName,
                            null,
                        )
                    }
                }
            }
        }
    }

    public exportActivePopulationsToCSV = (filePath: string): void => {
        this.activeImageSetStore.populationStore.exportPopulationsToCSV(filePath)
    }

    public exportProjectPopulationsToCSV = (filePath: string): void => {}
}
