export interface MetadataField {
  label: string;
  value: string;
}

interface RequestMetadataProps {
  fields: MetadataField[];
}

export default function RequestMetadata({ fields }: RequestMetadataProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
        Request Metadata
      </h3>
      <dl className="flex flex-col gap-3">
        {fields.map((field) => (
          <div key={field.label} className="flex flex-col gap-0.5">
            <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {field.label}
            </dt>
            <dd className="text-sm font-medium text-slate-800">{field.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
