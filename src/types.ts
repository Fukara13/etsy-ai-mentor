export type Session = {
  id: string
  note: string | null
  created_at: number
}

export type Capture = {
  id: string
  session_id: string
  url: string
  html_path: string
  png_path: string
  created_at: number
}

export type Store = {
  id: number
  name: string
  url: string | null
  niche_theme: string | null
  niche_emotion: string | null
  niche_buyer: string | null
  level: string
  risk_profile: string | null
  active_goal: string | null
}
