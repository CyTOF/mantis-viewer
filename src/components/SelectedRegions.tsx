import * as React from "react";
import { IMCImageROI } from "../components/IMCIMage"
import { EditableText, Button } from "@blueprintjs/core"
import { observer } from "mobx-react"

interface SelectedDataProps {
    regions: Array<IMCImageROI>
    updateName: ((id: string, name: string) => void)
    updateNotes: ((id: string, notes: string) => void)
    deleteRegion: ((id: string) => void)
}

interface SelectedDataRowProps {
    region: IMCImageROI,
    updateName: ((id: string, name: string) => void)
    updateNotes: ((id: string, notes: string) => void)
    deleteRegion: ((id: string) => void)
}

@observer
export class SelectedRegions extends React.Component<SelectedDataProps, undefined> {

    constructor(props:SelectedDataProps) {
        super(props)
    }

    TableRowItem = class TableRow extends React.Component<SelectedDataRowProps, undefined> {
        deleteRegion = () => {
            this.props.deleteRegion(this.props.region.id)
        }

        updateName = (name: string) => {
            this.props.updateName(this.props.region.id, name)
        }

        updateNotes = (notes: string) => {
            this.props.updateNotes(this.props.region.id, notes)
        }
        render() {
            let thisNotes = (this.props.region.notes == null) ? "" : this.props.region.notes
            return(
                <tr>
                    <td><EditableText defaultValue={this.props.region.name} onConfirm={this.updateName}/></td>
                    <td><EditableText defaultValue={thisNotes} onConfirm={this.updateNotes}/></td> 
                    <td><Button text={"Delete"} onClick={this.deleteRegion}/></td>
                </tr>)
        }
    }

    render() {
        let regions = this.props.regions
        return(
            <div>
                Selected Regions:
                <table><tbody>
                    <tr>
                        <th>Name</th>
                        <th>Notes</th> 
                        <th></th>
                    </tr>
                    { regions.map((region) => {
                        return <this.TableRowItem 
                            key={region.id}
                            region={region}
                            updateName={this.props.updateName}
                            updateNotes={this.props.updateNotes}
                            deleteRegion={this.props.deleteRegion}
                        />
                        })
                    }
                </tbody></table>
            </div>
        )
    }



}