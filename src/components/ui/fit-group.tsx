import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import {
  Text,
  View,
  useWindowDimensions,
  type AccessibilityRole,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { MIN_TEXT_SIZE, TEXT_CAP, renderedSize, type TextRole } from '@/theme/text-scale';

/**
 * Text that sits side by side, or repeats down one card, renders at one size at every text setting
 * and is never cut. `shrink` lowers every member together until the widest fits; `switch` never
 * scales and only reports whether the layout holds. When `fits` turns false the owner draws its next
 * layout (more rows, a stacked row) and the group measures again.
 *
 * Measured in a layout effect: on Fabric a host ref reads the layout React just committed, and a state
 * update there re-renders before the JS task ends, which is when the tree is mounted, so the first
 * frame already has the shared size. onLayout only catches later layout passes.
 */

export type FitMode = 'shrink' | 'switch';

/** Room for rounding: layout sits on the pixel grid, and widths of text round up to it. */
const SLACK = 1;

/** Wide enough that no measuring copy ever wraps. */
const LAYER_WIDTH = 4000;

/** State changes allowed under one set of conditions; past this a slot is chasing its own text. */
const MAX_PASSES = 6;

const CONTAINER = 'container';

export type FitInput = {
  /** The member's room, in points. */
  slot: number;
  /** Its widest word at the design size with the phone's text size applied, in points. */
  natural: number;
};

export type FitResult = { scale: number; fits: boolean };

/** The group's shared scale, and whether this layout holds without going under the floor. */
export function fitScale(
  members: FitInput[],
  {
    mode,
    size,
    role,
    fontScale,
  }: { mode: FitMode; size: number; role: TextRole; fontScale: number },
): FitResult {
  const measured = members.filter((member) => member.natural > 0);

  if (mode === 'switch') {
    return { scale: 1, fits: measured.every((member) => member.natural <= member.slot - SLACK) };
  }

  const room = Math.min(
    1,
    ...measured.map((member) => Math.max(0, member.slot - SLACK) / member.natural),
  );
  // Down to the hundredth, so the shared size can only err small; the epsilon keeps 0.8 from
  // flooring to 0.79.
  const scale = Math.floor(room * 100 + 1e-6) / 100;
  if (scale >= 1) return { scale: 1, fits: true };

  const full = renderedSize(size, role, fontScale);
  // Shrinking only takes back part of the user's increase. A group of one has no other layout to
  // move to, so only the absolute floor applies to it.
  const floor =
    members.length === 1 ? MIN_TEXT_SIZE : Math.max(MIN_TEXT_SIZE, size * Math.min(fontScale, 1));
  if (full * scale >= floor - 1e-6) return { scale, fits: true };
  return { scale: Math.min(1, floor / full), fits: false };
}

type Member = {
  text: string;
  size: number;
  lineHeight: number | undefined;
  role: TextRole;
  family: string | undefined;
  /** Points of the slot that are not the text's: an icon beside it and the gap. */
  reserve: number;
  hug: boolean;
  slot: RefObject<View | null>;
  copy: RefObject<Text | null>;
};

type Decision = FitResult & { key: string };

export type FitGroupHandle = {
  mode: FitMode;
  /** Every member draws at its design size times this. */
  scale: number;
  /** False when this layout cannot hold the group: draw the next one. */
  fits: boolean;
  register: (id: string, member: Member) => () => void;
  noteLayout: (part: string, width: number) => void;
  container: RefObject<View | null>;
};

/**
 * The width a host view was laid out at. The test renderer has no layout, so there it is whatever
 * onLayout last reported, and nothing at all until something does.
 */
function widthOf(node: unknown, laidOut: number | undefined): number | undefined {
  const host = node as { getBoundingClientRect?: () => { width: number } } | null;
  return typeof host?.getBoundingClientRect === 'function'
    ? host.getBoundingClientRect().width
    : laidOut;
}

function assertAlike(mode: FitMode, members: [string, Member][]) {
  const [firstId, first] = members[0];
  for (const [id, member] of members) {
    // Nothing scales in switch mode, so only the ceilings have to agree for one size per setting.
    const differs =
      member.role !== first.role ||
      (mode === 'shrink' &&
        (member.size !== first.size ||
          member.lineHeight !== first.lineHeight ||
          member.family !== first.family));
    if (differs) {
      throw new Error(
        `FitGroup: "${id}" and "${firstId}" differ in role, size, line height or font, so they cannot share one size.`,
      );
    }
  }
}

export function useFitGroup({ mode }: { mode: FitMode }): FitGroupHandle {
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const container = useRef<View>(null);
  const membersRef = useRef(new Map<string, Member>());
  /** What onLayout last said, per part. */
  const laidOutRef = useRef(new Map<string, number>());
  /** The widths the current decision was made from, per part. */
  const usedRef = useRef(new Map<string, number>());
  const passesRef = useRef({ key: '', count: 0 });
  const [decision, setDecision] = useState<Decision>({ key: '', scale: 1, fits: true });
  // Bumped by every registration and every changed width, so each one measures again.
  const [version, setVersion] = useState(0);

  const remeasure = useCallback(() => setVersion((version) => version + 1), []);

  const register = useCallback(
    (id: string, member: Member) => {
      membersRef.current.set(id, member);
      remeasure();
      return () => {
        if (membersRef.current.get(id) !== member) return;
        membersRef.current.delete(id);
        remeasure();
      };
    },
    [remeasure],
  );

  // A late layout pass (a tab mounting at a passing width, a parent settling) reaches the group
  // here, so a size worked out against a passing width cannot stay.
  const noteLayout = useCallback(
    (part: string, width: number) => {
      laidOutRef.current.set(part, width);
      if (usedRef.current.get(part) !== width) remeasure();
    },
    [remeasure],
  );

  useLayoutEffect(() => {
    const members = [...membersRef.current.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
    const laidOut = laidOutRef.current;
    const box = widthOf(container.current, laidOut.get(CONTAINER));
    if (members.length === 0 || !box) return;

    const used = new Map<string, number>([[CONTAINER, box]]);
    const inputs: FitInput[] = [];
    const naturals: string[] = [];
    for (const [id, member] of members) {
      const natural = widthOf(member.copy.current, laidOut.get(`${id}:copy`));
      // Not laid out yet: decide nothing rather than decide from half the group.
      if (natural === undefined || (natural === 0 && member.text.trim() !== '')) return;
      used.set(`${id}:copy`, natural);
      naturals.push(`${id}=${member.text}@${natural.toFixed(2)}`);
      if (member.hug) continue;
      const slot = widthOf(member.slot.current, laidOut.get(`${id}:slot`));
      if (!slot) return;
      used.set(`${id}:slot`, slot);
      inputs.push({ slot: slot - member.reserve, natural });
    }
    if (__DEV__) assertAlike(mode, members);
    usedRef.current = used;

    // Everything the right layout depends on except the slots, which move with the layout itself.
    const key = [fontScale, windowWidth, Math.round(box), ...naturals].join('|');
    const [, first] = members[0];
    const result = fitScale(inputs, { mode, size: first.size, role: first.role, fontScale });

    let next: Decision;
    if (key !== decision.key) {
      // New conditions are judged in the first layout again, so a fallback picked for the old ones
      // cannot outlive them.
      next = decision.fits ? { key, ...result } : { key, scale: 1, fits: true };
    } else if (decision.fits) {
      next = { key, ...result };
    } else {
      // Held in the fallback until the conditions change: judged from the fallback's own wider
      // slots it would fit, flip back, and flip again.
      next = { key, scale: result.scale, fits: false };
    }
    if (next.scale === decision.scale && next.fits === decision.fits && next.key === decision.key) {
      return;
    }

    const passes = passesRef.current;
    passesRef.current = passes.key === key ? { key, count: passes.count + 1 } : { key, count: 1 };
    if (passesRef.current.count > MAX_PASSES) return;
    setDecision(next);
  }, [mode, fontScale, windowWidth, decision, version]);

  return { mode, scale: decision.scale, fits: decision.fits, register, noteLayout, container };
}

const FitGroupContext = createContext<FitGroupHandle | null>(null);

type FitGroupProps = {
  group: FitGroupHandle;
  /**
   * The box around every layout the owner can switch to. Its width must not depend on which layout
   * is showing; a change in it re-runs the decision.
   */
  className?: string;
  testID?: string;
  children: ReactNode;
};

export function FitGroup({ group, className, testID, children }: FitGroupProps) {
  const { container, noteLayout } = group;
  return (
    <FitGroupContext.Provider value={group}>
      <View
        ref={container}
        className={className}
        testID={testID}
        onLayout={(event) => noteLayout(CONTAINER, event.nativeEvent.layout.width)}
      >
        {children}
      </View>
    </FitGroupContext.Provider>
  );
}

/** Off screen and out of the accessibility tree; only its width is read. */
const COPY_LAYER: ViewStyle = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: LAYER_WIDTH,
  opacity: 0,
  alignItems: 'flex-start',
  pointerEvents: 'none',
};

const FAMILY = /(?:^|\s)(font-app(?:-[a-z]+)?)(?=\s|$)/;

type FitTextProps = {
  /** Unique within its group. */
  id: string;
  role: TextRole;
  /** Points at the default text setting, before any shrinking. */
  size: number;
  /** Points at the default text setting; scales with the size. The font's own when omitted. */
  lineHeight?: number;
  /** Weight, colour and alignment. Size and line height are props here, never classes. */
  className?: string;
  style?: StyleProp<TextStyle>;
  /**
   * The box the text has to fit in. Its width must come from the layout, not from the text (flex-1,
   * w-full), or a smaller size would make less room and the group would chase it.
   */
  slotClassName?: string;
  /** The group, when this sits inside another group's FitGroup. */
  group?: FitGroupHandle;
  /** Drawn beside the text inside the slot, such as an icon; `reserve` is the room they take. */
  before?: ReactNode;
  after?: ReactNode;
  /** Points of the slot taken by `before`, `after` and the gaps around them. */
  reserve?: number;
  /**
   * The slot is only as wide as this text (an amount beside a label), so it is never short of room
   * and is not checked; its width still re-runs the decision when it changes.
   */
  hug?: boolean;
  accessibilityRole?: AccessibilityRole;
  textRef?: Ref<ComponentRef<typeof Text>>;
  children: string;
};

/**
 * One member of a group. It wraps only between words; the group makes sure the widest word fits. Its
 * measuring copy draws each word on its own line, so the copy's width is the widest word.
 */
export function FitText({
  id,
  role,
  size,
  lineHeight,
  className,
  style,
  slotClassName,
  group,
  before,
  after,
  reserve = 0,
  hug = false,
  accessibilityRole,
  textRef,
  children,
}: FitTextProps) {
  const fromContext = useContext(FitGroupContext);
  const handle = group ?? fromContext;
  const register = handle?.register;
  const noteLayout = handle?.noteLayout;
  const scale = handle?.scale ?? 1;
  const slot = useRef<View>(null);
  const copy = useRef<Text>(null);
  const family = className?.match(FAMILY)?.[1];

  useLayoutEffect(() => {
    if (!register) return undefined;
    return register(id, {
      text: children,
      size,
      lineHeight,
      role,
      family,
      reserve,
      hug,
      slot,
      copy,
    });
  }, [register, id, children, size, lineHeight, role, family, reserve, hug]);

  const words = children.trim().split(/\s+/).join('\n');

  return (
    <View
      ref={slot}
      className={slotClassName}
      testID={`fit-slot-${id}`}
      onLayout={(event) => noteLayout?.(`${id}:slot`, event.nativeEvent.layout.width)}
    >
      {before}
      <Text
        ref={textRef}
        accessibilityRole={accessibilityRole}
        className={className}
        style={[
          style,
          {
            fontSize: size * scale,
            lineHeight: lineHeight === undefined ? undefined : lineHeight * scale,
          },
          // Beside an icon the text sits in a row, where it would otherwise keep its one-line width.
          before || after ? { flexShrink: 1 } : null,
        ]}
        maxFontSizeMultiplier={TEXT_CAP[role]}
      >
        {children}
      </Text>
      {after}

      <View
        style={COPY_LAYER}
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text
          ref={copy}
          testID={`fit-copy-${id}`}
          className={className}
          style={[style, { fontSize: size, lineHeight }]}
          maxFontSizeMultiplier={TEXT_CAP[role]}
          onLayout={(event) => noteLayout?.(`${id}:copy`, event.nativeEvent.layout.width)}
        >
          {words}
        </Text>
      </View>
    </View>
  );
}
