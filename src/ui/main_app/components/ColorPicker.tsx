'use client'

import { useTheme } from '@/contexts/ThemeContext';

export default function ColorPicker() {
  const { colors, updateColors } = useTheme();

  const handleColorChange = (colorKey: 'glowColor' | 'flowColor1', newColor: string) => {
    updateColors({
      ...colors,
      [colorKey]: newColor
    });
  };

  return (
    <div className="fixed top-4 left-4 z-50 flex gap-2">
      <div
        className="w-8 h-8 rounded-lg cursor-pointer border-2 border-white/30 hover:border-white/60 transition-all glass-button"
        style={{ backgroundColor: colors.glowColor }}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'color';
          input.value = colors.glowColor;
          input.onchange = (e) => {
            const newColor = (e.target as HTMLInputElement).value;
            handleColorChange('glowColor', newColor);
          };
          input.click();
        }}
        title="Primary Color"
      />
      <div
        className="w-8 h-8 rounded-lg cursor-pointer border-2 border-white/30 hover:border-white/60 transition-all glass-button"
        style={{ backgroundColor: colors.flowColor1 }}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'color';
          input.value = colors.flowColor1;
          input.onchange = (e) => {
            const newColor = (e.target as HTMLInputElement).value;
            handleColorChange('flowColor1', newColor);
          };
          input.click();
        }}
        title="Accent Color"
      />
    </div>
  );
}
