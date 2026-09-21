// Screen: a consistent page wrapper so every screen looks and
// behaves the same (padding, spacing, entrance animation).

export default function Screen({ children }) {
  return <div className="page">{children}</div>
}
