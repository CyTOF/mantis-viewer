import * as React from "react";
import { ImageSelection } from "../components/IMCIMage"
import { EditableText, Button } from "@blueprintjs/core"
import { observer } from "mobx-react"
import { CompactPicker } from 'react-color'

interface SelectedDataProps {
    regions: Array<ImageSelection>|null
    updateName: ((id: string, name: string) => void)
    updateNotes: ((id: string, notes: string) => void)
    updateColor: ((id: string, color: number) => void)
    deleteRegion: ((id: string) => void)
    highlightRegion: ((id: string) => void)
    unhighlightRegion: ((id: string) => void)
}

interface SelectedDataRowProps {
    region: ImageSelection,
    updateName: ((id: string, name: string) => void)
    updateNotes: ((id: string, notes: string) => void)
    updateColor: ((id: string, color: number) => void)
    deleteRegion: ((id: string) => void)
    highlightRegion: ((id: string) => void)
    unhighlightRegion: ((id: string) => void)
}

interface TableRowState {
    pickerVisible: boolean
}

@observer
export class SelectedRegions extends React.Component<SelectedDataProps, {}> {

    constructor(props:SelectedDataProps) {
        super(props)
    }

    TableRowItem = class TableRow extends React.Component<SelectedDataRowProps, TableRowState> {
        state = {
            pickerVisible: false,
          }

        deleteRegion = () => {
            this.props.deleteRegion(this.props.region.id)
        }

        updateName = (name: string) => {
            this.props.updateName(this.props.region.id, name)
        }

        updateNotes = (notes: string) => {
            this.props.updateNotes(this.props.region.id, notes)
        }

        updateColor = (color:number) => {
            this.props.updateColor(this.props.region.id, color)
        }

        highlightRegion = (event: React.MouseEvent<HTMLTableRowElement>) => {
            this.props.highlightRegion(this.props.region.id)
        }

        unhighlightRegion = (event: React.MouseEvent<HTMLTableRowElement>) => {
            this.props.unhighlightRegion(this.props.region.id)
        }

        onTogglePicker = () => this.setState({ pickerVisible: !this.state.pickerVisible })
        handleColorChange = (color: { hex:any }) => this.updateColor(parseInt(color.hex.replace(/^#/, ''), 16))

        backgroundColor = () => {
            let hex = this.props.region.color.toString(16)
            hex = "000000".substr(0, 6 - hex.length) + hex
            return "#" + hex
        }

        render() {
            let thisNotes = (this.props.region.notes == null) ? "" : this.props.region.notes
            return(
                <tr onMouseEnter={this.highlightRegion} onMouseLeave={this.unhighlightRegion}>
                    <td><EditableText defaultValue={this.props.region.name} onConfirm={this.updateName}/></td>
                    <td onClick={this.onTogglePicker} style={{backgroundColor: this.backgroundColor()}}>
                        { this.state.pickerVisible && (
                        <div style={{ position: 'absolute', zIndex:9999 }}>
                            <CompactPicker
                            color={"#" + this.props.region.color.toString(16)}
                            onChangeComplete={ this.handleColorChange }
                            />
                        </div>
                    ) }</td>
                    <td><EditableText defaultValue={thisNotes} onConfirm={this.updateNotes}/></td>
                    <td><Button text={"Delete"} onClick={this.deleteRegion}/></td>
                </tr>)
        }
    }

    regionRows(regions: ImageSelection[] | null) {
        if(regions!= null){
            return regions.map((region) => {
                return <this.TableRowItem
                    key={region.id}
                    region={region}
                    updateName={this.props.updateName}
                    updateNotes={this.props.updateNotes}
                    deleteRegion={this.props.deleteRegion}
                    updateColor={this.props.updateColor}
                    highlightRegion={this.props.highlightRegion}
                    unhighlightRegion={this.props.unhighlightRegion}
                />
                })
            }
        return null
    }

    render() {
        let regions = this.props.regions
        return(
            <div>
                <table className="table table-hover">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Color</th>
                            <th>Notes</th>
                            <th> </th>
                        </tr>
                    </thead>
                    <tbody>
                        { this.regionRows(regions) }
                    </tbody>
                </table>
            </div>
        )
    }



}