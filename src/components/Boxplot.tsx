import * as React from "react"
import { PlotlyPlot } from "./PlotlyPlot"




interface BoxplotProps {
    data: {[x:string]: number[]} | null
}


export class Boxplot extends React.Component<BoxplotProps, undefined> {
    constructor(props: BoxplotProps) {
        super(props)
    }

    /*
    mountPlot(el:HTMLElement | null) {
        if(el != null && this.props.data != null) {
            let plotData = _.keys(this.props.data).map((s, i) => {
                return({
                    x: this.props.data![s],
                    type: "histogram",
                    xbins: {
                        start: 0,
                        end: 300,
                        size: 1,
                    },
                    xaxis: "x" + (i + 1),
                    yaxis: "y" + (i + 1),
                    name: s
                })
                
            })
            let layout = {
                xaxis: {domain: [0, 0.45]},
                yaxis: {domain: [0, 1]},

                xaxis2: {domain: [0.55, 1]},
                yaxis2: {domain: [0, 1], anchor: 'x2'}
            }
            Plotly.newPlot(el, plotData, layout)
        }

    }*/

    render() {
        return(
            <PlotlyPlot
                data = {this.props.data}
                type = "box"
            />
        )
    }
}