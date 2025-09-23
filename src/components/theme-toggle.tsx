'use client';

import { useTheme } from '@/components/theme-provider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ThemeToggle() {
  const { theme, setTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <div className="w-[140px] h-10 bg-muted rounded-md animate-pulse" />
    );
  }

  return (
    <Select value={theme} onValueChange={(value: 'neon' | 'brutal') => setTheme(value)}>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Theme" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="neon">Neon</SelectItem>
        <SelectItem value="brutal">Neo‑Brutalism</SelectItem>
      </SelectContent>
    </Select>
  );
}