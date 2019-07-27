import * as React from 'react'
import { Slider, Checkbox } from '@blueprintjs/core'
import { observer } from 'mobx-react'
import { Button } from 'reactstrap'

export interface SegmentationControlsProps {
    fillAlpha: number
    outlineAlpha: number

    onFillAlphaChange: (value: number) => void
    onOutlineAlphaChange: (value: number) => void

    centroidsVisible: boolean
    setCentroidsVisible: (visible: boolean) => void

    onClearSegmentation: () => void
}

@observer
export class SegmentationControls extends React.Component<SegmentationControlsProps, {}> {
    public constructor(props: SegmentationControlsProps) {
        super(props)
    }

    private sliderMax = 10

    private onFillAlphaSliderChange = (value: number) => this.props.onFillAlphaChange(value / this.sliderMax)
    private onOutlineAlphaSliderChange = (value: number) => this.props.onOutlineAlphaChange(value / this.sliderMax)
    private onReactAlphaSliderChange = (event: React.FormEvent<HTMLInputElement>) =>
        this.props.onOutlineAlphaChange(event.currentTarget.valueAsNumber / this.sliderMax)
    private onCentroidVisibilityChange = (event: React.FormEvent<HTMLInputElement>) =>
        this.props.setCentroidsVisible(event.currentTarget.checked)

    public render(): React.ReactElement {
        return (
            <div>
                <Checkbox
                    checked={this.props.centroidsVisible}
                    label="Show Centroids"
                    onChange={this.onCentroidVisibilityChange}
                />
                Segmentation Outline Alpha
                <Slider
                    value={this.props.outlineAlpha * this.sliderMax}
                    onChange={this.onOutlineAlphaSliderChange}
                    max={this.sliderMax}
                />
                Segmentation Fill Alpha
                <Slider
                    value={this.props.fillAlpha * this.sliderMax}
                    onChange={this.onFillAlphaSliderChange}
                    max={this.sliderMax}
                />
                <Button onClick={this.props.onClearSegmentation} color="danger" size="sm">
                    Clear Segmentation
                </Button>
            </div>
        )
    }
}
