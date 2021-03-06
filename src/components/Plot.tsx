// Draws some inspiration from https://github.com/davidctj/react-plotlyjs-ts
// Might be able to use this in the future or to make this component more React-y
import * as React from 'react'
import { observer } from 'mobx-react'
import * as Plotly from 'plotly.js'
import { SizeMe } from 'react-sizeme'

import { PlotData } from '../interfaces/DataInterfaces'
import { ActiveImageSetTraceName } from '../definitions/PlotDataDefinitions'
import { PlotType } from '../definitions/UIDefinitions'

interface PlotProps {
    selectedType: PlotType
    setSelectedSegments: (selectedSegments: number[]) => void
    setSelectedRange: (min: number, max: number) => void
    setHoveredSegments: (selectedSegments: number[]) => void
    plotData: PlotData | null
    windowWidth: number | null
    maxPlotHeight: number | null
    downsample: boolean
}

@observer
export class Plot extends React.Component<PlotProps, {}> {
    public container: Plotly.PlotlyHTMLElement | null = null

    public constructor(props: PlotProps) {
        super(props)
    }

    public state = {
        popoverOpen: false, // TODO: Delete when removing popover
    }

    private onPlotSelected = (data: Plotly.PlotSelectionEvent): void => {
        if (this.props.selectedType == 'scatter' || this.props.selectedType == 'contour')
            this.props.setSelectedSegments(this.parseScatterEvent(data))
        if (this.props.selectedType == 'histogram') {
            const { min, max } = this.parseHistogramEvent(data)
            if (min != null && max != null) this.props.setSelectedRange(min, max)
        }
    }
    private onHover = (data: Plotly.PlotSelectionEvent): void => {
        if (this.props.selectedType == 'scatter') this.props.setHoveredSegments(this.parseScatterEvent(data))
    }
    private onUnHover = (): void => this.props.setHoveredSegments([])

    public componentWillUnmount(): void {
        this.cleanupPlotly()
    }

    // Data comes from a Plotly event.
    // Points are the selected points.
    // No custom fields, so we are getting the segment id from the title text for the point.
    // Title text with segment id generated in ScatterPlotData.
    private parseScatterEvent(data: Plotly.PlotSelectionEvent): number[] {
        const selectedSegments: number[] = []
        if (data != null) {
            if (data.points != null && data.points.length > 0) {
                for (const point of data.points) {
                    const pointRegionName = point.data.name
                    // Check if the region name for the point is the default selection name
                    // Sometimes plotly returns incorrect selected points if there are multiple selections
                    // and the point being hovered/highlighted isn't in some of those selections.
                    if (pointRegionName == ActiveImageSetTraceName) {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                        // @ts-ignore: Plotly ts declaration doesn't have text on points, but it is there.
                        const pointText = point.text
                        if (pointText) {
                            const splitText: string[] = pointText.split(' ')
                            const segmentId = Number(splitText[splitText.length - 1])
                            selectedSegments.push(segmentId)
                        }
                    }
                }
            }
        }
        return selectedSegments
    }

    private parseHistogramEvent(data: Plotly.PlotSelectionEvent): { min: null | number; max: null | number } {
        const minMax: { min: null | number; max: null | number } = { min: null, max: null }
        if (data != null) {
            if (data.range != null) {
                minMax.min = Math.min(...data.range.x)
                minMax.max = Math.max(...data.range.x)
            } else if (data.lassoPoints != null) {
                minMax.min = Math.min(...data.lassoPoints.x)
                minMax.max = Math.max(...data.lassoPoints.x)
            }
        }
        return minMax
    }

    private cleanupPlotly(): void {
        if (this.container) {
            Plotly.purge(this.container)
            this.container = null
        }
    }

    private mountPlot = async (el: HTMLElement | null, width: number | null, height: number | null): Promise<void> => {
        if (el != null && this.props.plotData != null) {
            const firstRender = this.container == null
            const layoutWithSize = this.props.plotData.layout
            const config: Partial<Plotly.Config> = {}
            if (width != null && height != null) {
                layoutWithSize.width = width
                layoutWithSize.height = height
            }
            if (this.props.selectedType == 'histogram') config['modeBarButtonsToRemove'] = ['lasso2d']
            if (this.props.selectedType == 'heatmap' || this.props.downsample)
                config['modeBarButtonsToRemove'] = ['lasso2d', 'select2d']
            this.container = await Plotly.react(el, this.props.plotData.data, layoutWithSize, config)
            // Resize the plot to fit the container
            // Might need to remove. Seems that if this fires too much can cause weirdness with WebGL contexts.
            Plotly.Plots.resize(this.container)
            // Adding listeners for plotly events. Not doing this during componentDidMount because the element probably doesn't exist.
            if (firstRender) {
                this.container.on('plotly_selected', this.onPlotSelected)
                this.container.on('plotly_hover', this.onHover)
                this.container.on('plotly_unhover', this.onUnHover)
            }
        }
    }

    public render(): React.ReactNode {
        // TODO: Feels a bit hacky. Find a better solution.
        // Dereferencing here so we re-render on resize
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const windowWidth = this.props.windowWidth
        const maxPlotHeight = this.props.maxPlotHeight

        let plot = null

        // If plot data is unset, cleanup Plotly
        if (!this.props.plotData) {
            this.cleanupPlotly()
        } else {
            plot = (
                <SizeMe monitorWidth={true}>
                    {({ size }): React.ReactElement => (
                        <div
                            id="plotly-scatterplot"
                            ref={(el): Promise<void> => this.mountPlot(el, size.width, maxPlotHeight)}
                        />
                    )}
                </SizeMe>
            )
        }

        return plot
    }
}
