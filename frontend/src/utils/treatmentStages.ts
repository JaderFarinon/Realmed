export function treatmentStageClosed(process: any, stage: string): boolean {
  let state = process?.workflow_stages || {}
  if (typeof state === 'string') {
    try {
      state = JSON.parse(state)
    } catch {
      state = {}
    }
  }
  // Documents was the last part of the former two-stage Central workflow.
  const key = ['central', 'documents', 'evaluation_document'].includes(stage) ? 'documents' : stage
  return Boolean(state[key]?.completed_at)
}
