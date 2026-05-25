'use client'

import { create } from 'zustand'

export interface WorkerToolbarActiveJob {
  id: string
  status: string
  statusLabel: string
  progressText: string
}

interface WorkerToolbarState {
  workerId: string | null
  executing: boolean
  activeJob: WorkerToolbarActiveJob | null
  executeRef: (() => void) | null
  cancelRef: ((jobId: string) => void) | null
  setWorkerPage: (
    workerId: string,
    handlers: { execute: () => void; cancel: (jobId: string) => void }
  ) => void
  patchWorkerPage: (
    patch: Partial<Pick<WorkerToolbarState, 'executing' | 'activeJob'>>
  ) => void
  clearWorkerPage: () => void
}

export const useWorkerToolbarStore = create<WorkerToolbarState>((set) => ({
  workerId: null,
  executing: false,
  activeJob: null,
  executeRef: null,
  cancelRef: null,
  setWorkerPage: (workerId, handlers) =>
    set({
      workerId,
      executeRef: handlers.execute,
      cancelRef: handlers.cancel,
      executing: false,
      activeJob: null,
    }),
  patchWorkerPage: (patch) => set(patch),
  clearWorkerPage: () =>
    set({
      workerId: null,
      executing: false,
      activeJob: null,
      executeRef: null,
      cancelRef: null,
    }),
}))
