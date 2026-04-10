import Image from "next/image";

interface HeaderProps {
  showBadge?: boolean;
}

export default function Header({ showBadge = true }: HeaderProps) {
  return (
    <div className="mb-12 flex flex-col items-center gap-4">
      <Image
        src="/branding/filepino-logo.png"
        alt="Filepino"
        width={184}
        height={93}
        priority
        className="h-auto w-[148px] sm:w-[172px] md:w-[184px]"
      />
      {showBadge && (
        <span className="inline-flex items-center gap-2 rounded-full border border-primary-fixed-dim bg-primary-fixed px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-[color:var(--color-on-primary-fixed)]">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
          Client Portal
        </span>
      )}
    </div>
  );
}
