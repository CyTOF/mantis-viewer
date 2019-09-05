/* eslint @typescript-eslint/no-explicit-any: 0 */

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { ipcRenderer } from 'electron'
import { PlotData } from '../interfaces/DataInterfaces'
import { Plot } from '../components/Plot'

let markerNames: string[]
let selectedPlotMarkers: string[] | null
let selectedStatistic: string | null
let selectedTransform: string | null
let selectedType: string | null
let selectedNormalization: string | null
let plotData: PlotData | null
let windowWidth: number | null

// Callback functions for the scatterplot that send data back to the main thread to be relayed to the main window.
let setSelectedPlotMarkers = (markers: string[]): void => {
    ipcRenderer.send('plotWindow-set-markers', markers)
}

let setSelectedStatistic = (statistic: any): void => {
    ipcRenderer.send('plotWindow-set-statistic', statistic)
}

let setPlotTranform = (transform: any): void => {
    ipcRenderer.send('plotWindow-set-transform', transform)
}

let setPlotType = (type: any): void => {
    ipcRenderer.send('plotWindow-set-type', type)
}

let setPlotNormalization = (type: any): void => {
    ipcRenderer.send('plotWindow-set-normalization', type)
}

let addSelectedPopulation = (segmentIds: number[]): void => {
    if (segmentIds.length != 0) ipcRenderer.send('plotWindow-add-selected-population', segmentIds)
}

let addPopulationFromRange = (min: number, max: number): void => {
    ipcRenderer.send('plotWindow-add-population-from-range', min, max)
}

let setHoveredSegments = (segmentIds: number[]): void => {
    if (segmentIds.length != 0) ipcRenderer.send('plotWindow-set-hovered-segments', segmentIds)
}

function render(): void {
    if (
        markerNames &&
        selectedPlotMarkers &&
        selectedStatistic &&
        selectedTransform &&
        selectedType &&
        selectedNormalization
    ) {
        ReactDOM.render(
            <div style={{ paddingTop: '10px' }}>
                <Plot
                    windowWidth={windowWidth}
                    markers={markerNames}
                    selectedPlotMarkers={selectedPlotMarkers}
                    setSelectedPlotMarkers={setSelectedPlotMarkers}
                    selectedStatistic={selectedStatistic}
                    setSelectedStatistic={setSelectedStatistic}
                    selectedTransform={selectedTransform}
                    setSelectedTransform={setPlotTranform}
                    selectedType={selectedType}
                    setSelectedType={setPlotType}
                    selectedNormalization={selectedNormalization}
                    setSelectedNormalization={setPlotNormalization}
                    setSelectedSegments={addSelectedPopulation}
                    setHoveredSegments={setHoveredSegments}
                    setSelectedRange={addPopulationFromRange}
                    plotData={plotData}
                />
            </div>,
            document.getElementById('plot'),
        )
    }
}

// Listener to receive data from the mainWindow relayed by the main thread to render ScatterPlot
ipcRenderer.on(
    'set-plot-data',
    (
        event: Electron.Event,
        markers: string[],
        plotMarkers: string[],
        statistic: string,
        transform: string,
        type: string,
        normalization: string,
        data: any,
    ) => {
        markerNames = markers
        selectedPlotMarkers = plotMarkers
        selectedStatistic = statistic
        selectedTransform = transform
        selectedType = type
        selectedNormalization = normalization
        plotData = data as PlotData
        render()
    },
)

// Only the main thread can get window resize events. Listener for these events to resize various elements.
ipcRenderer.on('window-size', (event: Electron.Event, width: number, height: number) => {
    windowWidth = width
    render()
})
