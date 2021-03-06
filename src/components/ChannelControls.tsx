import * as React from 'react'
import { RangeSlider } from '@blueprintjs/core'
import { observer } from 'mobx-react'
import Select from 'react-select'
import { IoMdEye, IoMdEyeOff } from 'react-icons/io'
import { Grid, Row, Col } from 'react-flexbox-grid'
import { Badge } from 'reactstrap'
import {
    SelectOption,
    SelectStyle,
    SelectTheme,
    getSelectedOptions,
    generateSelectOptions,
    onClearableSelectChange,
} from '../lib/SelectHelper'
import { ChannelName, ChannelColorMap } from '../definitions/UIDefinitions'
import { hexToString } from '../lib/ColorHelper'

export interface ChannelControlsProps {
    channel: ChannelName
    channelVisible: boolean
    setChannelVisibility: (value: boolean) => void
    sliderMin: number
    sliderMax: number
    sliderValue: [number, number]
    setChannelDomainPercentage: (value: [number, number]) => void
    markers: string[]
    selectedMarker: string | null
    allSelectedMarkers: (string | null)[]
    setMarker: (x: string | null) => void
    windowWidth: number | null
}

@observer
export class ChannelControls extends React.Component<ChannelControlsProps, {}> {
    public constructor(props: ChannelControlsProps) {
        super(props)
    }

    private channelBadge(channel: ChannelName): JSX.Element {
        return (
            <h5>
                <Badge
                    style={{
                        backgroundColor: hexToString(ChannelColorMap[channel]),
                        boxShadow: '0 0 0 0.1em #000000',
                        color: '#000000',
                    }}
                >
                    {channel[0].toUpperCase()}
                </Badge>
            </h5>
        )
    }

    private visibleIcon(visible: boolean): JSX.Element {
        const visibleClick = (): void => {
            this.props.setChannelVisibility(!visible)
        }
        const icon = visible ? <IoMdEye size="1.5em" /> : <IoMdEyeOff size="1.5em" />
        return (
            <a href="#" onClick={visibleClick}>
                {icon}
            </a>
        )
    }

    // Convert channel domain to percentage before saving
    private setChannelDomain = (value: [number, number]): void => {
        this.props.setChannelDomainPercentage([value[0] / this.props.sliderMax, value[1] / this.props.sliderMax])
    }

    public render(): React.ReactNode {
        // TODO: Feels a bit hacky. Find a better solution.
        // Dereferencing here so we re-render on resize
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const windowWidth = this.props.windowWidth

        const paddingStyle = { paddingTop: '3px' }

        const unroundedStepSize = this.props.sliderMax / 5
        const roundedStepSize = Math.round(unroundedStepSize)
        const labelStepSize = roundedStepSize == 0 ? unroundedStepSize : roundedStepSize

        // Remove nulls and the value selected for this channel from the list of all selected values
        const filteredSelectedValues = this.props.allSelectedMarkers.filter((value) => {
            return value != null && value != this.props.selectedMarker
        })
        // Remove all select options in the list of filtered, selected values from above.
        // This is so that a marker cannot be selected to be displayed in two channels.
        const selectOptions = generateSelectOptions(this.props.markers)
        const filteredSelectOptions = selectOptions.filter((option: SelectOption) => {
            return !filteredSelectedValues.includes(option.value)
        })
        const selectedValue = getSelectedOptions(this.props.selectedMarker, selectOptions)

        let brightnessSlider = (
            <RangeSlider
                min={this.props.sliderMin}
                max={this.props.sliderMax}
                value={this.props.sliderValue}
                labelStepSize={labelStepSize}
                labelPrecision={1}
                stepSize={this.props.sliderMax / 1000} // Might want to change the number/size of steps. Seemed like a good starting point.
                onChange={this.setChannelDomain}
            />
        )

        if (this.props.sliderMin == this.props.sliderMax) {
            brightnessSlider = <div>No non-zero values present in image</div>
        }

        return (
            <Grid fluid={true}>
                <Row between="xs">
                    <Col xs={2} sm={2} md={2} lg={2}>
                        {this.channelBadge(this.props.channel)}
                    </Col>
                    <Col xs={10} sm={10} md={10} lg={10}>
                        <Select
                            value={selectedValue}
                            options={filteredSelectOptions}
                            onChange={onClearableSelectChange(this.props.setMarker)}
                            isClearable={true}
                            styles={SelectStyle}
                            theme={SelectTheme}
                        />
                    </Col>
                </Row>
                <Row between="xs" style={paddingStyle}>
                    <Col xs={10} sm={10} md={10} lg={10}>
                        {brightnessSlider}
                    </Col>
                    <Col xs={2} sm={2} md={2} lg={2}>
                        {this.visibleIcon(this.props.channelVisible)}
                    </Col>
                </Row>
            </Grid>
        )
    }
}
