import { StyleProp, Text, TextStyle } from 'react-native';

import { formatPence } from '@/lib/format';

export function MoneyText({
  cents,
  style,
}: {
  cents: number;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={style}>{formatPence(cents)}</Text>;
}
