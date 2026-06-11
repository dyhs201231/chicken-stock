export default function StockDetailLoading() {
  return (
    <main className="mx-auto w-full max-w-355 px-8 py-16 text-zinc-950">
      <section className="mb-9 flex items-end justify-between gap-8">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-zinc-200" />

          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="h-8 w-36 rounded-md bg-zinc-200" />
              <div className="h-8 w-20 rounded-md bg-zinc-200" />
            </div>

            <div className="h-9 w-96 rounded-md bg-zinc-200" />
          </div>
        </div>

        <dl className="grid grid-cols-4 gap-10 text-right">
          {["high", "low", "year-high", "year-low"].map((item) => (
            <div key={item}>
              <dt className="mb-2 h-5 w-16 rounded-md bg-zinc-200" />
              <dd className="h-8 w-24 rounded-md bg-zinc-200" />
            </div>
          ))}
        </dl>
      </section>

      <div className="mb-9 flex gap-3">
        <div className="h-10 w-32 rounded-md bg-zinc-200" />
        <div className="h-10 w-48 rounded-md bg-zinc-200" />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_20rem_20rem] gap-7">
        <section className="h-130 rounded-3xl bg-white px-7 py-6 shadow-[0_10px_18px_rgba(0,0,0,0.22)]">
          <div className="mb-6 flex gap-3">
            <div className="h-8 w-16 rounded-md bg-zinc-200" />
            <div className="h-8 w-16 rounded-md bg-zinc-200" />
            <div className="h-8 w-16 rounded-md bg-zinc-200" />
          </div>
          <div className="h-[25rem] rounded-xl bg-zinc-100" />
        </section>

        <section className="h-130 rounded-3xl bg-white px-5 py-5 shadow-[0_10px_18px_rgba(0,0,0,0.22)]">
          <div className="mb-5 h-7 w-24 rounded-md bg-zinc-200" />
          <div className="space-y-2">
            {Array.from({ length: 12 }, (_, index) => (
              <div
                key={index}
                className="grid h-8 grid-cols-[4rem_minmax(0,1fr)_4rem] gap-3"
              >
                <div className="rounded-md bg-zinc-200" />
                <div className="rounded-md bg-zinc-100" />
                <div className="rounded-md bg-zinc-200" />
              </div>
            ))}
          </div>
        </section>

        <section className="h-130 rounded-3xl bg-white px-5 py-5 shadow-[0_10px_18px_rgba(0,0,0,0.22)]">
          <div className="mb-5 flex gap-4">
            <div className="h-8 w-20 rounded-md bg-zinc-200" />
            <div className="h-8 w-20 rounded-md bg-zinc-200" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 7 }, (_, index) => (
              <div key={index} className="h-10 rounded-lg bg-zinc-100" />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
