import type { MetadataField } from "@/lib/tracking/types";

interface RequestMetadataProps {
  fields: MetadataField[];
}

export default function RequestMetadata({ fields }: RequestMetadataProps) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-y-8 gap-x-12">
        {fields.map((field) => (
          <div key={field.label}>
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-outline">
              {field.label}
            </div>
            <div className="text-sm font-headline font-bold text-on-surface">
              {field.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
