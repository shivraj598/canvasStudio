import {
  DESIGN_STYLES,
  FONT_PAIRINGS,
  FONT_PAIRING_IDS,
  PALETTE_PRESETS,
  type ColorPalette,
} from '@canvas/shared';
import { RadioCards } from '../../../components/Choice';
import { seedCustomPalette } from '../defaults';
import type { StepProps } from '../types';

const COLOR_KEYS: { key: keyof ColorPalette; label: string }[] = [
  { key: 'primary', label: 'Primary' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'accent', label: 'Accent' },
  { key: 'background', label: 'Background' },
  { key: 'text', label: 'Text' },
];

function Swatches({ colors }: { colors: ColorPalette }) {
  return (
    <span className="mt-2 flex gap-1" aria-hidden>
      {COLOR_KEYS.map(({ key }) => (
        <span
          key={key}
          className="size-6 rounded-full border border-black/10"
          style={{ background: colors[key] }}
        />
      ))}
    </span>
  );
}

const PALETTE_OPTIONS = [
  ...PALETTE_PRESETS.map((p) => ({
    value: p.id as string,
    label: p.name,
    adornment: <Swatches colors={p.colors} />,
  })),
  { value: 'custom', label: 'Custom colours', description: 'Choose your own brand colours.' },
];

const STYLE_DESCRIPTIONS: Record<(typeof DESIGN_STYLES)[number], string> = {
  modern: 'Clean lines and soft corners',
  classic: 'Timeless and trustworthy',
  minimal: 'Lots of space, nothing extra',
  playful: 'Rounded, bright and friendly',
  elegant: 'Refined and understated',
  bold: 'Big type, strong statements',
};

const STYLE_OPTIONS = DESIGN_STYLES.map((id) => ({
  value: id,
  label: id[0]!.toUpperCase() + id.slice(1),
  description: STYLE_DESCRIPTIONS[id],
}));

const FONT_OPTIONS = FONT_PAIRING_IDS.map((id) => ({
  value: id,
  label: FONT_PAIRINGS[id].label,
  description:
    FONT_PAIRINGS[id].heading === FONT_PAIRINGS[id].body
      ? FONT_PAIRINGS[id].heading
      : `${FONT_PAIRINGS[id].heading} + ${FONT_PAIRINGS[id].body}`,
}));

export function DesignStep({ value, onChange, errors }: StepProps<'design'>) {
  function selectPalette(paletteId: string) {
    const next = { ...value, paletteId } as typeof value;
    if (paletteId === 'custom' && !value.customPalette) {
      next.customPalette = seedCustomPalette(value.paletteId);
    }
    onChange(next);
  }

  return (
    <div className="space-y-8">
      <RadioCards
        name="palette"
        legend="Colour palette"
        options={PALETTE_OPTIONS}
        value={value.paletteId}
        onChange={selectPalette}
        error={errors.paletteId ?? errors.customPalette}
        columns={3}
      />

      {value.paletteId === 'custom' && value.customPalette && (
        <fieldset className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-5">
          <legend className="px-1 text-sm font-medium">Your colours</legend>
          {COLOR_KEYS.map(({ key, label }) => (
            <label key={key} className="space-y-1 text-sm">
              <span className="block">{label}</span>
              <input
                type="color"
                aria-label={`${label} colour`}
                value={value.customPalette![key]}
                onChange={(e) =>
                  onChange({
                    ...value,
                    customPalette: { ...value.customPalette!, [key]: e.target.value },
                  })
                }
                className="h-10 w-full cursor-pointer rounded border border-gray-300"
              />
              {errors[`customPalette.${key}`] && (
                <span role="alert" className="block text-red-600">
                  {errors[`customPalette.${key}`]}
                </span>
              )}
            </label>
          ))}
        </fieldset>
      )}

      <RadioCards
        name="style"
        legend="Style"
        options={STYLE_OPTIONS}
        value={value.style}
        onChange={(style) => onChange({ ...value, style })}
        error={errors.style}
      />

      <RadioCards
        name="font"
        legend="Fonts"
        options={FONT_OPTIONS}
        value={value.font}
        onChange={(font) => onChange({ ...value, font })}
        error={errors.font}
      />
    </div>
  );
}
