import { StyleSheet, View } from 'react-native';

import { RowActionButton } from './row-action-button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import type { DtrEntry } from '@/hooks/use-dtr';
import { formatDisplayDate, formatTimeOnly12h, parseDateOnly, withTimePart } from '@/utils/date';

type DtrRowProps = {
  entry: DtrEntry;
  onEdit: (date: string) => void;
  onRemove: (date: string) => void;
};

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function formatTimeLabel(time: string | null): string {
  return time ? formatTimeOnly12h(withTimePart(new Date(), time)) : '—';
}

export function DtrRow({ entry, onEdit, onRemove }: DtrRowProps) {
  const date = parseDateOnly(entry.date);
  const hasAnyTime = Boolean(entry.amIn || entry.lunchOut || entry.lunchIn || entry.pmOut);

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <View style={styles.info}>
        <ThemedText numberOfLines={1} style={styles.name}>
          {WEEKDAY_NAMES[date.getDay()]}, {formatDisplayDate(date)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {hasAnyTime
            ? [entry.amIn, entry.lunchOut, entry.lunchIn, entry.pmOut]
                .map(formatTimeLabel)
                .join('   ')
            : 'No time recorded'}
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <RowActionButton
          icon="edit-2"
          tooltip="Edit"
          accessibilityLabel={`Edit time log for ${formatDisplayDate(date)}`}
          onPress={() => onEdit(entry.date)}
        />
        <RowActionButton
          icon="trash-2"
          tooltip="Remove"
          tone="danger"
          accessibilityLabel={`Remove time log for ${formatDisplayDate(date)}`}
          onPress={() => onRemove(entry.date)}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  info: {
    flex: 1,
    gap: Spacing.half,
  },
  name: {
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
