'use client'

import { useTheme } from '@/contexts/ThemeContext';

export default function ColorPicker() {
  const { colors, updateColors } = useTheme();

  const handleColorChange = (colorKey: 'color1' | 'color2', newColor: string) => {
    updateColors({
      ...colors,
      [colorKey]: newColor
    });
  };

  return (
    <div className="fixed top-4 left-4 z-50 flex gap-2">
      <div
        className="w-8 h-8 rounded-lg cursor-pointer border-2 border-white/30 hover:border-white/60 transition-all glass-button"
        style={{ backgroundColor: colors.color1 }}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'color';
          input.value = colors.color1;
          input.onchange = (e) => {
            const newColor = (e.target as HTMLInputElement).value;
            handleColorChange('color1', newColor);
          };
          input.click();
        }}
        title="Primary Color"
      />
      <div
        className="w-8 h-8 rounded-lg cursor-pointer border-2 border-white/30 hover:border-white/60 transition-all glass-button"
        style={{ backgroundColor: colors.color2 }}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'color';
          input.value = colors.color2;
          input.onchange = (e) => {
            const newColor = (e.target as HTMLInputElement).value;
            handleColorChange('color2', newColor);
          };
          input.click();
        }}
        title="Accent Color"
      />
    </div>
  );
}
