import React from 'react'
import { PartSelectorProps } from './types'
import { Part } from '../../types/part'

const PartSelector: React.FC<PartSelectorProps> = ({
  score,
  selectedPartId,
  onPartChange,
  className = '',
}) => {
  if (!score || !score.parts || score.parts.length === 0) {
    return (
      <div className={`part-selector part-selector--empty ${className}`}>
        <p className="part-selector__message">No parts available</p>
      </div>
    )
  }

  const handlePartClick = (part: Part) => {
    if (part.id !== selectedPartId) {
      onPartChange(part.id)
    }
  }

  return (
    <div className={`part-selector ${className}`}>
      <h3 className="part-selector__title">Parts</h3>
      <ul className="part-selector__list" role="listbox" aria-label="Select a part">
        {score.parts.map((part) => {
          const isSelected = part.id === selectedPartId

          return (
            <li
              key={part.id}
              className="part-selector__item"
              role="option"
              aria-selected={isSelected}
            >
              <button
                className={`part-selector__button ${isSelected ? 'part-selector__button--selected' : ''}`}
                onClick={() => handlePartClick(part)}
                type="button"
                aria-pressed={isSelected}
              >
                <div className="part-selector__part-info">
                  <span className="part-selector__part-name">{part.name}</span>
                  {part.instrument && part.instrument.name !== part.name && (
                    <span className="part-selector__instrument-name">{part.instrument.name}</span>
                  )}
                </div>
                {isSelected && (
                  <div className="part-selector__indicator" aria-hidden="true">
                    •
                  </div>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default PartSelector
