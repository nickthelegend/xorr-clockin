/**
 * A labelled text field — the recipe xorr's agent-maker uses (`app/agent/new.tsx`): an `Eyebrow small` label over a
 * 48pt input in the body face, on `inputBg` with the input border. One recipe, so no screen ships a field in the
 * system font.
 */
import React from 'react';
import { TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { Eyebrow } from './Eyebrow';
import { border, colors, radius, space } from './tokens';
import { type as typeScale } from './type';

const FIELD_H = 48;

export function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  capitalize = 'none',
  keyboard = 'default',
  editable = true,
  secure = false,
  onSubmit,
  testID,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  maxLength?: number;
  capitalize?: 'none' | 'words' | 'sentences';
  keyboard?: KeyboardTypeOptions;
  editable?: boolean;
  secure?: boolean;
  onSubmit?: () => void;
  testID?: string;
}) {
  return (
    <View style={{ gap: space.s8 }}>
      <Eyebrow small>{label}</Eyebrow>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.ink35}
        maxLength={maxLength}
        autoCapitalize={capitalize}
        autoCorrect={false}
        keyboardType={keyboard}
        editable={editable}
        secureTextEntry={secure}
        onSubmitEditing={onSubmit}
        accessibilityLabel={label}
        testID={testID}
        style={[
          typeScale.body,
          border.input,
          {
            height: FIELD_H,
            borderRadius: radius.tile,
            backgroundColor: colors.inputBg,
            paddingHorizontal: space.s14,
            color: editable ? colors.ink : colors.ink55,
          },
        ]}
      />
    </View>
  );
}
