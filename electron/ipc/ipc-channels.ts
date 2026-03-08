/**
 * DC-2: IPC channel constants.
 * Query-only channels; no mutation channels in DC-2.
 */

export const IPC_CHANNELS = {
  HEALTH_PING: 'desktop:health:ping',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
