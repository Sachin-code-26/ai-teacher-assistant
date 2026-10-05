// =============================================================
//  client/src/components/LoadingSpinner.jsx
//  Reusable animated loading indicator.
// =============================================================

function LoadingSpinner({ size = "md", text, fullPage = false }) {
  const sizes = {
    sm: "h-5 w-5 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-4",
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`animate-spin rounded-full border-blue-600 border-t-transparent ${sizes[size]}`}
      />
      {text && <p className="text-sm text-slate-500">{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}

export default LoadingSpinner;
