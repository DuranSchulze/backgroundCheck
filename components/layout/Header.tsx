interface HeaderProps {
  brand?: string;
}

export default function Header({
  brand = "Editorial Logistics",
}: HeaderProps) {
  return (
    <header className="border-b border-slate-100 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-center px-6">
        <span className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
          {brand}
        </span>
      </div>
    </header>
  );
}
