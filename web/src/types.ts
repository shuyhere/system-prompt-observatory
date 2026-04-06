export interface AgentInfo {
  id: string
  name: string
  provider: string
  type: string
  versionCount: number
}

export interface VersionEntry {
  version: string
  file?: string
  date?: string
  label?: string
}
