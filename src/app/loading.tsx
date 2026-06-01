// app/loading.tsx
export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 animate-pulse">
      {/* Nav Skeleton */}
      <div className="h-20 bg-white border-b border-slate-100" />

      {/* Hero Skeleton */}
      <div className="h-[500px] bg-slate-200" />

      {/* Value Props Skeleton */}
      <div className="h-24 bg-white border-b border-slate-100" />

      {/* Category Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="h-8 w-48 bg-slate-200 rounded-lg mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="aspect-square bg-slate-200 rounded-2xl" />
          ))}
        </div>
      </div>

      {/* Products Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="h-8 w-48 bg-slate-200 rounded-lg mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square bg-slate-200 rounded-2xl" />
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-4 w-full bg-slate-200 rounded" />
              <div className="h-4 w-24 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}