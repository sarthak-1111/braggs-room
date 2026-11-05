/**
 * LeafIndex: registers the Bragg's Room LEAF scenarios (one or more per done criterion of
 * devpost/design-brief.md). Attached to the "LeafIndex" SceneObject; it only registers, it
 * never runs anything on its own. Run them from Lens Studio's LEAF panel (Window > LEAF),
 * or through the Lens Studio MCP tools list_leaf_scenarios / run_leaf_scenario.
 */
import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {BraggsC1DragScenario} from "./BraggsC1DragScenario"
import {BraggsC2SpotScenario} from "./BraggsC2SpotScenario"
import {BraggsC2RealDragScenario} from "./BraggsC2RealDragScenario"
import {BraggsC3WavelengthScenario} from "./BraggsC3WavelengthScenario"
import {BraggsC4ScScenario} from "./BraggsC4ScScenario"
import {BraggsC4FccScenario} from "./BraggsC4FccScenario"
import {BraggsC4NoLeakScenario} from "./BraggsC4NoLeakScenario"
import {BraggsC5LabelsScenario} from "./BraggsC5LabelsScenario"

const T = {__leaf__timeout_secs: "240"}

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "c1-drag-turn-tilt-reset", typename: BraggsC1DragScenario.getTypeName(), parameters: T},
    {id: "c2-spot-010-hooks", typename: BraggsC2SpotScenario.getTypeName(), parameters: T},
    {id: "c2-spot-010-real-drag", typename: BraggsC2RealDragScenario.getTypeName(), parameters: T},
    {id: "c3-wavelength-slide-ghost", typename: BraggsC3WavelengthScenario.getTypeName(), parameters: T},
    {id: "c4-mission-sc-verdict", typename: BraggsC4ScScenario.getTypeName(), parameters: T},
    {id: "c4-mission-fcc-verdict", typename: BraggsC4FccScenario.getTypeName(), parameters: T},
    {id: "c4-no-leak-helpers", typename: BraggsC4NoLeakScenario.getTypeName(), parameters: T},
    {id: "c5-labels-content-size", typename: BraggsC5LabelsScenario.getTypeName(), parameters: T},
  ]
}
