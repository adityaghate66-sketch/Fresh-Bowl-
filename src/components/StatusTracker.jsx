// StatusTracker: the visual "Preparing → Ready → ... → Delivered" chain.
// Vertical (detail) and horizontal (compact card) variants.

export const DELIVERY_STEPS = [
  'Preparing',
  'Ready',
  'Assigned',
  'Picked Up',
  'Out for Delivery',
  'Delivered'
]

export function HorizontalTracker({ currentStep }) {
  return (
    <div className="h-tracker">
      {DELIVERY_STEPS.map((step, index) => (
        <div key={step} className={`h-step ${index < currentStep ? 'done' : ''} ${index === currentStep ? 'current' : ''}`}>
          <div className="h-dot">{index < currentStep ? '✓' : index + 1}</div>
          <div className="h-lbl">{step}</div>
        </div>
      ))}
    </div>
  )
}

export default function StatusTracker({ currentStep, horizontal = false }) {
  if (horizontal) return <HorizontalTracker currentStep={currentStep} />
  return (
    <div className="tracker">
      {DELIVERY_STEPS.map((step, index) => {
        const done = index < currentStep
        const current = index === currentStep
        return (
          <div key={step}>
            <div className="tracker-row">
              <div className={`tracker-dot ${done ? 'done' : ''} ${current ? 'current' : ''}`}>
                {done ? '✓' : index + 1}
              </div>
              <span className={`tracker-label ${done ? 'done' : ''} ${current ? 'current' : ''}`}>
                {step}
                {current && <span className="tiny"> • in progress</span>}
              </span>
            </div>
            {index < DELIVERY_STEPS.length - 1 && (
              <div className={`tracker-line ${done ? 'done' : ''}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
