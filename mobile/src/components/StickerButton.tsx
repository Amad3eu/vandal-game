import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { FONTS, UI } from '../theme'

interface StickerButtonProps {
  label: ReactNode
  note?: string
  onPress: () => void
  color?: string
  textColor?: string
  size?: 'big' | 'normal' | 'small'
  /** Outline only, no fill or shadow (secondary links). */
  ghost?: boolean
  selected?: boolean
  testID?: string
  accessibilityRole?: 'button' | 'radio'
  style?: StyleProp<ViewStyle>
}

/** Sticker button like the web's .sticker-btn: thick ink outline and a hard shadow that "presses". */
export default function StickerButton({
  label,
  note,
  onPress,
  color = UI.paper,
  textColor = UI.ink,
  size = 'normal',
  ghost = false,
  selected,
  testID,
  accessibilityRole = 'button',
  style,
}: StickerButtonProps) {
  const shadow = size === 'small' ? 3 : 4
  return (
    <View style={[styles.wrap, { paddingRight: ghost ? 0 : shadow, paddingBottom: ghost ? 0 : shadow }, style]}>
      {!ghost && <View style={[styles.shadow, { left: shadow, top: shadow, borderRadius: size === 'small' ? 9 : 12 }]} />}
      <Pressable
        testID={testID}
        accessibilityRole={accessibilityRole}
        accessibilityState={selected === undefined ? undefined : { checked: selected, selected }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          size === 'big' && styles.big,
          size === 'small' && styles.small,
          ghost ? styles.ghost : { backgroundColor: color },
          pressed && !ghost && { transform: [{ translateX: shadow - 1 }, { translateY: shadow - 1 }] },
        ]}
      >
        <Text style={[styles.label, size === 'big' && styles.bigLabel, size === 'small' && styles.smallLabel, { color: textColor }]}>
          {label}
        </Text>
        {note ? <Text style={[styles.note, { color: textColor }]}>{note}</Text> : null}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  shadow: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 3,
    borderColor: UI.ink,
    borderRadius: 12,
  },
  big: {
    paddingVertical: 16,
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 9,
    borderWidth: 2,
  },
  ghost: {
    backgroundColor: 'rgba(20, 15, 31, 0.72)',
    borderColor: 'rgba(255, 255, 255, 0.55)',
  },
  label: {
    fontFamily: FONTS.display,
    fontSize: 16,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  bigLabel: {
    fontSize: 21,
  },
  smallLabel: {
    fontSize: 13,
  },
  note: {
    marginTop: 2,
    fontFamily: FONTS.pixel,
    fontSize: 12,
    opacity: 0.8,
  },
})
