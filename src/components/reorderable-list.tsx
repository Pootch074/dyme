import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedStyle,
  useFrameCallback,
  useScrollOffset,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/** How long an item must be held before it lifts and can be dragged. */
const LONG_PRESS_MS = 350;
/** Distance from the top/bottom edge of the list where a held item scrolls it. */
const AUTO_SCROLL_EDGE = 64;
/** Fastest auto-scroll, in points per frame, reached right at the edge. */
const AUTO_SCROLL_MAX_SPEED = 12;
/** How long items take to glide into their new slots. */
const SETTLE_MS = 180;

type ReorderableListProps<T> = {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, state: { isActive: boolean }) => ReactNode;
  /** Called once when a drag ends with the item somewhere new (and for the screen reader move actions). */
  onReorder: (fromIndex: number, toIndex: number) => void;
  /** Vertical space between items. */
  gap?: number;
  /** Shown instead of the list when `data` is empty. */
  emptyComponent?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/** Shared, stable drag state and callbacks handed to every row. */
type DragContext = {
  order: SharedValue<string[]>;
  heights: SharedValue<Record<string, number>>;
  activeId: SharedValue<string | null>;
  /** Top of the lifted item, in list coordinates, following the finger. */
  dragTop: SharedValue<number>;
  /** While true, items glide to their slots instead of snapping. */
  animating: SharedValue<boolean>;
  gap: number;
  /** UI thread: the finger moved to `translationY` from where the drag started. */
  onDragMove: (translationY: number) => void;
  /** UI thread: `id` was lifted. */
  onDragStart: (id: string) => void;
  /** UI thread: the lifted `id` was let go. */
  onDragEnd: (id: string) => void;
};

/** Top of `id`'s slot: the heights (plus gaps) of everything before it in `order`. */
function slotTop(order: string[], heights: Record<string, number>, id: string, gap: number) {
  'worklet';
  let top = 0;
  for (const other of order) {
    if (other === id) break;
    top += (heights[other] ?? 0) + gap;
  }
  return top;
}

function totalHeight(order: string[], heights: Record<string, number>, gap: number) {
  'worklet';
  let total = 0;
  order.forEach((id, index) => {
    total += (heights[id] ?? 0) + (index > 0 ? gap : 0);
  });
  return total;
}

/**
 * Returns `order` with `id` swapped past any neighbor whose middle the lifted
 * item's center has crossed (several at once after a fast drag).
 */
function reorderAround(
  order: string[],
  heights: Record<string, number>,
  id: string,
  center: number,
  gap: number
) {
  'worklet';
  let current = order;
  let index = current.indexOf(id);
  for (let guard = 0; guard < order.length; guard++) {
    const next = current[index + 1];
    const prev = current[index - 1];
    const nextMid =
      next === undefined ? Infinity : slotTop(current, heights, next, gap) + (heights[next] ?? 0) / 2;
    const prevMid =
      prev === undefined ? -Infinity : slotTop(current, heights, prev, gap) + (heights[prev] ?? 0) / 2;
    if (center > nextMid) {
      current = [...current];
      current[index] = next;
      current[index + 1] = id;
      index += 1;
    } else if (center < prevMid) {
      current = [...current];
      current[index] = prev;
      current[index - 1] = id;
      index -= 1;
    } else {
      break;
    }
  }
  return current;
}

/**
 * A scrolling list whose items can be rearranged: press and hold an item until
 * it lifts, then drag it up or down. The others slide aside to make room, and
 * the list scrolls when the item is held near its top or bottom edge.
 *
 * Items are absolutely positioned from an order kept on the UI thread, which
 * already matches the new order when the parent re-renders after the drop, so
 * nothing jumps. Screen reader users get "Move up" / "Move down" actions.
 */
export function ReorderableList<T>({
  data,
  keyExtractor,
  renderItem,
  onReorder,
  gap = 0,
  emptyComponent,
  style,
  contentContainerStyle,
}: ReorderableListProps<T>) {
  const ids = data.map(keyExtractor);
  const idsKey = ids.join('\n');

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollOffset(scrollRef);
  const viewportHeight = useSharedValue(0);
  /** Where the items start inside the scroll content (e.g. below its padding). */
  const listOffset = useSharedValue(0);

  const order = useSharedValue<string[]>(ids);
  const heights = useSharedValue<Record<string, number>>({});
  const activeId = useSharedValue<string | null>(null);
  const dragTop = useSharedValue(0);
  const animating = useSharedValue(false);
  const startTop = useSharedValue(0);
  const startScroll = useSharedValue(0);
  const translation = useSharedValue(0);
  const fromIndex = useSharedValue(-1);

  // React-side copy of the lifted item, for its "picked up" look and to pause scrolling.
  const [liftedId, setLiftedId] = useState<string | null>(null);

  // Follow the parent's order whenever it changes (added, removed or moved items).
  useEffect(() => {
    if (activeId.get() === null) order.set(idsKey ? idsKey.split('\n') : []);
  }, [idsKey, order, activeId]);

  /** Moves the lifted item with the finger (and the scroll) and reorders around it. */
  const followFinger = useCallback(() => {
    'worklet';
    const id = activeId.get();
    if (id === null) return;
    const itemHeights = heights.get();
    const height = itemHeights[id] ?? 0;
    const maxTop = Math.max(0, totalHeight(order.get(), itemHeights, gap) - height);
    const top = startTop.get() + translation.get() + (scrollOffset.get() - startScroll.get());
    const clamped = Math.min(Math.max(top, 0), maxTop);
    dragTop.set(clamped);

    const next = reorderAround(order.get(), itemHeights, id, clamped + height / 2, gap);
    if (next !== order.get()) order.set(next);
  }, [activeId, heights, order, gap, startTop, translation, scrollOffset, startScroll, dragTop]);

  // Auto-scroll while the lifted item is held near the top or bottom edge.
  const autoScroll = useFrameCallback(() => {
    const id = activeId.get();
    if (id === null) return;
    const itemTop = listOffset.get() + dragTop.get() - scrollOffset.get();
    const itemBottom = itemTop + (heights.get()[id] ?? 0);
    const bottomEdge = viewportHeight.get() - AUTO_SCROLL_EDGE;
    const maxScroll = Math.max(
      0,
      listOffset.get() + totalHeight(order.get(), heights.get(), gap) - viewportHeight.get()
    );

    let speed = 0;
    if (itemTop < AUTO_SCROLL_EDGE) {
      speed = -AUTO_SCROLL_MAX_SPEED * Math.min(1, (AUTO_SCROLL_EDGE - itemTop) / AUTO_SCROLL_EDGE);
    } else if (itemBottom > bottomEdge) {
      speed = AUTO_SCROLL_MAX_SPEED * Math.min(1, (itemBottom - bottomEdge) / AUTO_SCROLL_EDGE);
    }
    const nextScroll = Math.min(Math.max(scrollOffset.get() + speed, 0), maxScroll);
    if (nextScroll !== scrollOffset.get()) {
      scrollTo(scrollRef, 0, nextScroll, false);
      scrollOffset.set(nextScroll);
      followFinger();
    }
  }, false);

  // The latest props for the stable JS-side drag callbacks below.
  const latest = useRef({ onReorder, autoScroll });
  useLayoutEffect(() => {
    latest.current = { onReorder, autoScroll };
  });

  const onLift = useCallback((id: string) => {
    setLiftedId(id);
    latest.current.autoScroll.setActive(true);
  }, []);

  const onDrop = useCallback(
    (from: number, to: number) => {
      setLiftedId(null);
      latest.current.autoScroll.setActive(false);
      if (from >= 0 && from !== to) latest.current.onReorder(from, to);
      // Later layout changes (like a name wrapping onto two lines) snap into place.
      setTimeout(() => {
        if (activeId.get() === null) animating.set(false);
      }, SETTLE_MS + 40);
    },
    [activeId, animating]
  );

  const drag = useMemo<DragContext>(
    () => ({
      order,
      heights,
      activeId,
      dragTop,
      animating,
      gap,
      onDragStart: (id) => {
        'worklet';
        const top = slotTop(order.get(), heights.get(), id, gap);
        animating.set(true);
        fromIndex.set(order.get().indexOf(id));
        startTop.set(top);
        startScroll.set(scrollOffset.get());
        translation.set(0);
        dragTop.set(top);
        activeId.set(id);
        scheduleOnRN(onLift, id);
      },
      onDragMove: (translationY) => {
        'worklet';
        translation.set(translationY);
        followFinger();
      },
      onDragEnd: (id) => {
        'worklet';
        if (activeId.get() !== id) return;
        // Glide into the final slot.
        dragTop.set(withTiming(slotTop(order.get(), heights.get(), id, gap), { duration: SETTLE_MS }));
        activeId.set(null);
        scheduleOnRN(onDrop, fromIndex.get(), order.get().indexOf(id));
      },
    }),
    [
      order,
      heights,
      activeId,
      dragTop,
      animating,
      gap,
      fromIndex,
      startTop,
      startScroll,
      scrollOffset,
      translation,
      followFinger,
      onLift,
      onDrop,
    ]
  );

  const containerStyle = useAnimatedStyle(() => {
    const itemHeights = heights.get();
    const allMeasured = order.get().every((id) => itemHeights[id] !== undefined);
    // Hidden for the first frame, until every item's height is known.
    return { height: totalHeight(order.get(), itemHeights, gap), opacity: allMeasured ? 1 : 0 };
  });

  return (
    <Animated.ScrollView
      ref={scrollRef}
      style={style}
      contentContainerStyle={contentContainerStyle}
      scrollEnabled={liftedId === null}
      onLayout={(event) => viewportHeight.set(event.nativeEvent.layout.height)}>
      {data.length === 0 ? (
        emptyComponent
      ) : (
        <Animated.View
          style={containerStyle}
          onLayout={(event) => listOffset.set(event.nativeEvent.layout.y)}>
          {data.map((item, index) => (
            <ReorderableRow
              key={ids[index]}
              id={ids[index]}
              drag={drag}
              isLifted={liftedId === ids[index]}
              canMoveUp={index > 0}
              canMoveDown={index < data.length - 1}
              onMove={(delta) => onReorder(index, index + delta)}>
              {renderItem(item, { isActive: liftedId === ids[index] })}
            </ReorderableRow>
          ))}
        </Animated.View>
      )}
    </Animated.ScrollView>
  );
}

type ReorderableRowProps = {
  id: string;
  drag: DragContext;
  isLifted: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (delta: -1 | 1) => void;
  children: ReactNode;
};

function ReorderableRow({
  id,
  drag,
  isLifted,
  canMoveUp,
  canMoveDown,
  onMove,
  children,
}: ReorderableRowProps) {
  const { order, heights, activeId, dragTop, animating, gap } = drag;

  // Built once per row: recreating it mid-drag would cancel the drag.
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(LONG_PRESS_MS)
        .onStart(() => drag.onDragStart(id))
        .onUpdate((event) => drag.onDragMove(event.translationY))
        .onFinalize(() => drag.onDragEnd(id)),
    [drag, id]
  );

  const animatedStyle = useAnimatedStyle(() => {
    const isActive = activeId.get() === id;
    const top = slotTop(order.get(), heights.get(), id, gap);
    let translateY = top;
    if (isActive) translateY = dragTop.get();
    else if (animating.get()) translateY = withTiming(top, { duration: SETTLE_MS });
    return {
      zIndex: isActive ? 10 : 0,
      transform: [{ translateY }, { scale: withTiming(isActive ? 1.02 : 1, { duration: 120 }) }],
    };
  });

  const accessibilityActions = [
    ...(canMoveUp ? [{ name: 'moveUp', label: 'Move up' }] : []),
    ...(canMoveDown ? [{ name: 'moveDown', label: 'Move down' }] : []),
  ];

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.row, animatedStyle, isLifted && styles.lifted]}
        onLayout={(event) => {
          const height = event.nativeEvent.layout.height;
          // Merged on the UI thread: every row reports at once on mount, and a
          // read-then-set from here would let those updates overwrite each other,
          // leaving heights missing and the list hidden.
          heights.modify((prev) => {
            'worklet';
            return prev[id] === height ? prev : { ...prev, [id]: height };
          });
        }}
        accessibilityActions={accessibilityActions}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'moveUp') onMove(-1);
          if (event.nativeEvent.actionName === 'moveDown') onMove(1);
        }}>
        <View>{children}</View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  lifted: {
    opacity: 0.95,
    borderRadius: 16,
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)',
  },
});
