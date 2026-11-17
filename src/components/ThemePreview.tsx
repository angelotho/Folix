import type { ResolvedTheme, ThemeMode } from '../types/folix';

interface ThemePreviewProps {
  mode: ThemeMode;
  systemTheme?: ResolvedTheme;
  compact?: boolean;
}

function LightScene() {
  return (
    <div className="flex h-full w-full flex-col bg-[#F4F2ED] text-[#181816]">
      {/* Mini TitleBar */}
      <div className="flex h-3.5 items-center justify-between border-b border-[#E0DDD4] bg-[#E7E4DD] px-2">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4F46E5]" />
          <span className="h-1 w-6 rounded-full bg-[#181816]/25" />
        </div>
        <div className="flex items-center gap-1">
          <span className="h-1 w-2.5 rounded-sm bg-[#181816]/20" />
          <span className="h-1 w-2.5 rounded-sm bg-[#181816]/20" />
        </div>
      </div>

      {/* Body: Sidebar + Document Paper */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-[28%] flex-col gap-1.5 border-r border-[#E0DDD4] bg-[#ECEAE4] p-1.5">
          <span className="h-1.5 w-4/5 rounded-sm bg-[#4F46E5]/25" />
          <span className="h-1 w-3/4 rounded-sm bg-[#5A5852]/30" />
          <span className="ml-1.5 h-1 w-2/3 rounded-sm bg-[#5A5852]/20" />
          <span className="h-1 w-4/5 rounded-sm bg-[#5A5852]/30" />
        </div>
        <div className="flex flex-1 items-center justify-center p-2">
          <div className="flex h-full w-full flex-col gap-1.5 rounded-md border border-[#E0DDD4] bg-white p-2 shadow-sm">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D97706]" />
              <span className="h-1.5 w-3/5 rounded-sm bg-[#181816]/85" />
            </div>
            <span className="h-1 w-full rounded-sm bg-[#5A5852]/30" />
            <span className="h-1 w-11/12 rounded-sm bg-[#5A5852]/25" />
            <div className="mt-0.5 rounded bg-[#F7F6F2] p-1 border border-[#E0DDD4]/70">
              <span className="block h-1 w-2/3 rounded-sm bg-[#4F46E5]/55" />
            </div>
            <span className="h-1 w-4/5 rounded-sm bg-[#5A5852]/25" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DarkScene() {
  return (
    <div className="flex h-full w-full flex-col bg-[#0B0C10] text-[#EDEDEF]">
      {/* Mini TitleBar */}
      <div className="flex h-3.5 items-center justify-between border-b border-[#222530] bg-[#090A0D] px-2">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#6366F1]" />
          <span className="h-1 w-6 rounded-full bg-[#EDEDEF]/30" />
        </div>
        <div className="flex items-center gap-1">
          <span className="h-1 w-2.5 rounded-sm bg-[#EDEDEF]/20" />
          <span className="h-1 w-2.5 rounded-sm bg-[#EDEDEF]/20" />
        </div>
      </div>

      {/* Body: Sidebar + Document Paper */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-[28%] flex-col gap-1.5 border-r border-[#222530] bg-[#0E1015] p-1.5">
          <span className="h-1.5 w-4/5 rounded-sm bg-[#6366F1]/45" />
          <span className="h-1 w-3/4 rounded-sm bg-[#9B9EA8]/35" />
          <span className="ml-1.5 h-1 w-2/3 rounded-sm bg-[#9B9EA8]/20" />
          <span className="h-1 w-4/5 rounded-sm bg-[#9B9EA8]/35" />
        </div>
        <div className="flex flex-1 items-center justify-center p-2">
          <div className="flex h-full w-full flex-col gap-1.5 rounded-md border border-[#222530] bg-[#111319] p-2 shadow-sm">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
              <span className="h-1.5 w-3/5 rounded-sm bg-[#EDEDEF]/90" />
            </div>
            <span className="h-1 w-full rounded-sm bg-[#9B9EA8]/35" />
            <span className="h-1 w-11/12 rounded-sm bg-[#9B9EA8]/25" />
            <div className="mt-0.5 rounded bg-[#0C0E13] p-1 border border-[#222530]">
              <span className="block h-1 w-2/3 rounded-sm bg-[#818CF8]/70" />
            </div>
            <span className="h-1 w-4/5 rounded-sm bg-[#9B9EA8]/25" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThemePreview({
  mode,
  systemTheme = 'light',
  compact = false,
}: ThemePreviewProps) {
  if (mode === 'light') {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-lg border border-black/10">
        <LightScene />
      </div>
    );
  }

  if (mode === 'dark') {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-lg border border-white/10">
        <DarkScene />
      </div>
    );
  }

  // System split preview (half light, half dark) with subtle Windows indicator
  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-folix-border">
      <div className="absolute inset-0">
        <LightScene />
      </div>
      <div
        className="absolute inset-0"
        style={{ clipPath: 'polygon(52% 0, 100% 0, 100% 100%, 42% 100%)' }}
      >
        <DarkScene />
      </div>
      {!compact && (
        <span className="absolute bottom-1.5 right-1.5 rounded-md border border-white/15 bg-black/70 px-1.5 py-0.5 text-[9.5px] font-medium text-white backdrop-blur-sm">
          Windows: {systemTheme === 'dark' ? 'Escuro' : 'Claro'}
        </span>
      )}
    </div>
  );
}

