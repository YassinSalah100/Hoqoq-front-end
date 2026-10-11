import { useReveal } from './motion'

// Wraps content that should fade up into place when scrolled into view.
export default function Reveal({ as: Tag = 'div', delay = 0, scale = false, className = '', style, children, ...rest }) {
  const ref = useReveal()
  return (
    <Tag
      ref={ref}
      className={`reveal ${scale ? 'reveal-scale' : ''} ${className}`}
      style={{ '--reveal-delay': `${delay}ms`, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
