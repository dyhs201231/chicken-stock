type MetricCardProps = {
  label: string;
  value: string;
};

export default function MetricCard({ label, value }: MetricCardProps) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-xl bg-zinc-100 px-3 py-2.5 md:block md:min-h-18 md:py-3">
      <p className="shrink-0 text-xs font-semibold text-zinc-950 md:mb-2">
        {label}
      </p>
      <p className="min-w-0 text-right text-base font-medium tracking-normal break-keep text-zinc-950 md:text-left md:text-xl">
        {value}
      </p>
    </article>
  );
}
