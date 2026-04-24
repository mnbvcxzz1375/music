import React from 'react'
import { PitchIndicatorProps } from './types'
import { usePitchFeedback } from './usePitchFeedback'

const PitchIndicator: React.FC<PitchIndicatorProps> = ({
  centsDeviation,
  expectedPitch,
  detectedPitch,
  confidence,
  showDetails = true,
}) => {
  const {
    accuracy,
    direction,
    color,
    displayCents,
    detectedNoteName,
    expectedNoteName,
    isConfident,
  } = usePitchFeedback(centsDeviation, expectedPitch, detectedPitch, confidence)

  if (!isConfident) {
    return (
      <div className="pitch-indicator pitch-indicator--inactive">
        <div className="pitch-indicator__status">No Pitch Detected</div>
      </div>
    )
  }

  const indicatorStyle = {
    backgroundColor: color,
    transition: 'background-color 0.2s ease',
  }

  return (
    <div className={`pitch-indicator pitch-indicator--${accuracy}`}>
      <div className="pitch-indicator__main">
        <div
          className="pitch-indicator__visual"
          style={indicatorStyle}
          aria-label={`Pitch accuracy: ${accuracy}`}
        >
          {direction === 'sharp' && '↑'}
          {direction === 'flat' && '↓'}
          {direction === 'on-pitch' && '•'}
        </div>
        <div className="pitch-indicator__value">{displayCents} cents</div>
      </div>

      {showDetails && (
        <div className="pitch-indicator__details">
          <div className="pitch-indicator__detail-item">
            <span className="label">Expected:</span>
            <span className="value">{expectedNoteName}</span>
          </div>
          <div className="pitch-indicator__detail-item">
            <span className="label">Detected:</span>
            <span className="value">{detectedNoteName}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default PitchIndicator
