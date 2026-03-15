/**
 * OC-11: Maps current operator-facing runtime state to furthest incident stage reached.
 * Tamamen deterministik; sadece mevcut advisory view bilgisini kullanır.
 */

import type { OperatorAdvisoryView } from '../operator-advisory-view'
import type { OperatorIncidentTimelineStage } from './operator-incident-timeline-stage'

/**
 * incident-ready yalnızca advisory gerçekten operatör için anlamlıysa (en az bir özet var).
 * Boş projection varsa advisory-projected kalır.
 */
function isIncidentReady(advisoryView: OperatorAdvisoryView): boolean {
  if (!advisoryView.hasAdvisory || advisoryView.advisory == null) return false
  const n = advisoryView.advisory.projection.advisorySummaries?.length ?? 0
  return n > 0
}

/**
 * Öncelik: incident-ready > advisory-projected > governance > hero-analysis > repair-intake
 * > pr-inspection > event-normalized > webhook-intake
 * repair-intake: bridge path pr-inspection’ı tamamlandığında (intake oluşturulmuş, hero henüz değil).
 */
export function mapRuntimeStateToIncidentStage(
  advisoryView: OperatorAdvisoryView
): OperatorIncidentTimelineStage | null {
  const bridgePath = advisoryView.explainability.bridgePath

  if (isIncidentReady(advisoryView)) {
    return 'incident-ready'
  }
  if (advisoryView.hasAdvisory) {
    return 'advisory-projected'
  }

  const finalStage = bridgePath.finalStage

  if (finalStage === 'advisory-projection') {
    return 'advisory-projected'
  }
  if (finalStage === 'governance') {
    return 'governance'
  }
  if (finalStage === 'hero-analysis') {
    return 'hero-analysis'
  }
  if (finalStage === 'pr-inspection') {
    // PR incelemesi bitti; repair intake oluşturulmuş, hero-analysis henüz ulaşılmadı.
    return 'repair-intake'
  }
  if (finalStage === 'webhook-intake') {
    return 'event-normalized'
  }

  // Bridge path adımları varsa ama finalStage yoksa, en azından webhook-intake gerçekleşmiş kabul edilir.
  if (bridgePath.steps.length > 0) {
    return 'webhook-intake'
  }

  // Yetersiz durum: hiçbir sinyal yok.
  return null
}

