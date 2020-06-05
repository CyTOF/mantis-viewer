import { SelectedPopulation } from '../../interfaces/ImageInterfaces'

import { DefaultSelectionName, DefaultSelectionId } from '../../definitions/PlotDataDefinitions'
import { PlotTransform } from '../../definitions/UIDefinitions'

export function buildSelectionIdArray(selectedPopulations: SelectedPopulation[] | null): string[] {
    const selectionIds = [DefaultSelectionId]
    if (selectedPopulations != null) {
        const sortedRegions = selectedPopulations.sort((a: SelectedPopulation, b: SelectedPopulation) => {
            return a.renderOrder > b.renderOrder ? 1 : -1
        })
        sortedRegions.map((value: SelectedPopulation) => {
            selectionIds.push(value.id)
        })
    }
    return selectionIds
}

// Builds a map of populationId to the population it belongs to.
export function buildSelectedPopulationMap(
    selectedPopulation: SelectedPopulation[] | null,
): { [key: string]: SelectedPopulation } {
    const map: { [key: string]: SelectedPopulation } = {}
    if (selectedPopulation != null) {
        for (const region of selectedPopulation) {
            map[region.id] = region
        }
    }
    return map
}

export function applyTransform(
    value: number,
    plotTransform: PlotTransform,
    transformCoefficient: number | null,
): number {
    let result = value

    if (plotTransform != 'none' && transformCoefficient) result = result * transformCoefficient

    // If the user has selected a transform, apply it.
    if (plotTransform == 'arcsinh') {
        result = Math.asinh(result)
    } else if (plotTransform == 'log') {
        result = Math.log10(result)
    }

    return result
}

export function getSelectionName(
    selectionId: string,
    selectedRegionMap: { [key: string]: SelectedPopulation },
): string {
    if (selectionId == DefaultSelectionId) {
        return DefaultSelectionName
    } else {
        return selectedRegionMap[selectionId].name
    }
}
