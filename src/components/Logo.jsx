export default function Logo({ size = 44, withText = true, textClassName = "" }) {
  return (
    <div className="logo-block">
      <img src="/assets/logo.svg" alt="Adifase '97 crest" width={size} height={size} />
      {withText && (
        <div className={`logo-text ${textClassName}`}>
          <span className="logo-title">ADIFASE &apos;97</span>
          <span className="logo-subtitle">Class Elections 2026</span>
        </div>
      )}
    </div>
  );
}
