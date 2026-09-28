// Renders the actual حقوق logo file — no circular frame, no background
// treatment. Only one export exists (dark wordmark + gold icon, for light/
// cream surfaces), so `variant="dark"` derives a reversed white version from
// that same file with a CSS filter (brightness(0) invert(1) maps every
// opaque pixel to white while keeping the original transparency/shape) —
// a standard "knockout" logo treatment, not a color hack. If a real
// dedicated dark-background export ever replaces this, just point the
// "dark" branch at that file instead and drop the filter.
export default function BrandMark({ size = 64, variant = 'light', className = '' }) {
  return (
    <img
      src="/brand/logo-light.png"
      alt="حقوق"
      className={`w-auto object-contain ${className}`}
      style={{
        height: size,
        filter: variant === 'dark' ? 'brightness(0) invert(1)' : undefined,
      }}
    />
  )
}
