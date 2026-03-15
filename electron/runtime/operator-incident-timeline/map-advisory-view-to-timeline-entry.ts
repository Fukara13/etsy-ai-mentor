/**
 * OC-11: Maps advisory view + stage + status to human-friendly incident timeline entry.
 */

import type { OperatorAdvisoryView } from '../operator-advisory-view'
import type { OperatorIncidentTimelineStage } from './operator-incident-timeline-stage'
import type { OperatorIncidentTimelineStatus } from './operator-incident-timeline-status'
import type { OperatorIncidentTimelineEntry } from './operator-incident-timeline-entry'

function hasAdvisoryImpactStage(stage: OperatorIncidentTimelineStage): boolean {
  return (
    stage === 'hero-analysis' ||
    stage === 'governance' ||
    stage === 'advisory-projected' ||
    stage === 'incident-ready'
  )
}

function buildHeadline(
  stage: OperatorIncidentTimelineStage,
  status: OperatorIncidentTimelineStatus
): string {
  const suffix = status === 'completed' ? '' : status === 'active' ? ' (active)' : ''
  switch (stage) {
    case 'webhook-intake':
      return 'Webhook alındı' + suffix
    case 'event-normalized':
      return 'Olay normalize edildi' + suffix
    case 'pr-inspection':
      return 'Pull Request incelendi' + suffix
    case 'repair-intake':
      return 'Onarım girdisi hazırlandı' + suffix
    case 'hero-analysis':
      return 'Hero analizi çalıştırıldı' + suffix
    case 'governance':
      return 'Governance uygulandı' + suffix
    case 'advisory-projected':
      return 'Advisory projeksiyonu hazır' + suffix
    case 'incident-ready':
      return 'Incident operatör için hazır' + suffix
    default:
      return 'Bilinmeyen aşama' + suffix
  }
}

function buildDetail(
  stage: OperatorIncidentTimelineStage,
  status: OperatorIncidentTimelineStatus,
  advisoryView: OperatorAdvisoryView
): string {
  const projection = advisoryView.advisory?.projection ?? null
  const bridgePath = advisoryView.explainability.bridgePath
  const advisoryCount = projection?.advisorySummaries?.length ?? 0

  switch (stage) {
    case 'webhook-intake':
      return 'GitHub webhook isteği alındı ve temel doğrulamalar geçti.'
    case 'event-normalized':
      return 'Webhook yükü iç modele dönüştürüldü (normalizeGitHubEvent).'
    case 'pr-inspection':
      return 'Pull request içeriği ve bağlamı inspectPullRequest ile analiz edildi.'
    case 'repair-intake':
      return 'GitHub olayı repair engine girişi için deriveGitHubRepairIntake ile map\'lendi.'
    case 'hero-analysis':
      if (!advisoryView.hasAdvisory) {
        return 'Hero analizi henüz advisory üretmedi.'
      }
      if (advisoryCount === 0) {
        return 'Hero analizi tamamlandı, ancak advisory öğesi üretilmedi.'
      }
      if (advisoryCount === 1) {
        return 'Hero analizi 1 adet advisory öğesi üretti.'
      }
      return `Hero analizi ${advisoryCount} adet advisory öğesi üretti.`
    case 'governance':
      return 'Governance runtime kararları uygulanarak advisory çıktısı filtrelendi ve zenginleştirildi.'
    case 'advisory-projected':
      if (bridgePath.advisorySummary) {
        return `Advisory projeksiyonu hazır: ${bridgePath.advisorySummary}`
      }
      return 'Advisory projeksiyonu operatör görünürlüğü için hazırlandı.'
    case 'incident-ready':
      if (advisoryView.hasAdvisory) {
        return 'Operatör advisory view tamamlandı; insan operatör için karar desteği hazır.'
      }
      return 'Incident henüz operatör advisory view seviyesine ulaşmadı.'
    default:
      if (status === 'unknown') {
        return 'Bu aşama için yeterli çalışma zamanı bilgisi yok.'
      }
      return 'Bu aşama için detay bulunamadı.'
  }
}

export function mapAdvisoryViewToTimelineEntry(
  stage: OperatorIncidentTimelineStage,
  status: OperatorIncidentTimelineStatus,
  order: number,
  advisoryView: OperatorAdvisoryView
): OperatorIncidentTimelineEntry {
  const headline = buildHeadline(stage, status)
  const detail = buildDetail(stage, status, advisoryView)
  const hasAdvisoryImpact = hasAdvisoryImpactStage(stage)

  return {
    stage,
    status,
    order,
    headline,
    detail,
    hasAdvisoryImpact,
  }
}

