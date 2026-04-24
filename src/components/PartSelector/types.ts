import { Score } from '../../types/score'

export interface PartSelectorProps {
  score: Score
  selectedPartId?: string
  onPartChange: (partId: string) => void
  className?: string
}
