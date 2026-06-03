// Subtle loading placeholder shown while a server page fetches from the DB.
export default function Skeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl animate-pulse px-6 py-8">
      <div className="mb-6">
        <div className="h-7 w-52 rounded bg-line" />
        <div className="mt-2 h-4 w-80 rounded bg-line/70" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card p-5">
            <div className="h-4 w-1/3 rounded bg-line" />
            <div className="mt-3 h-3 w-2/3 rounded bg-line/70" />
            <div className="mt-2 h-3 w-1/2 rounded bg-line/70" />
          </div>
        ))}
      </div>
    </div>
  );
}
