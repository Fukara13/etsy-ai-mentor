/**
 * DC-5: Attempt / progress panel.
 */

import { Card, SectionHeader, DataRow } from '../../ui'

type Props = {
  stepCount?: number
  nodesVisited: number
}

export function StateMachineProgress({ stepCount, nodesVisited }: Props) {
  const stepsDisplay = stepCount != null ? String(stepCount) : 'N/A'
  return (
    <Card>
      <SectionHeader title="Progress" />
      <div className="sm-progress">
        <DataRow label="Steps" value={stepsDisplay} />
        <DataRow label="States visited" value={nodesVisited} />
      </div>
    </Card>
  )
}
