import { resolveByePriorityTie } from '../core/bracket/byeStrategy.ts'

export interface TournamentRules {
  format: 'single-elimination'
  largerHalfSide: 'left'
  resolveByePriorityTie: typeof resolveByePriorityTie
}

export const tournamentRules: TournamentRules = {
  format: 'single-elimination',
  largerHalfSide: 'left',
  resolveByePriorityTie,
}
