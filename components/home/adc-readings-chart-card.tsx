import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  useAdcDatabase,
  type AdcReading,
} from "@/contexts/adc-database-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type TextStyle,
} from "react-native";
import { LineChart, ruleTypes } from "react-native-gifted-charts";

const REFRESH_MS = 5 * 60 * 1000;

/** LineChart `width` is only the plot/scroll viewport; the library adds Y-axis labels beside it */
const Y_AXIS_LABEL_WIDTH = 44;
const Y_AXIS_THICKNESS = 1;
const Y_AXIS_TOTAL = Y_AXIS_LABEL_WIDTH + Y_AXIS_THICKNESS;
/** Fixed Y-axis top for ADC count scale (0 … 2000) */
const Y_AXIS_MAX = 2000;

const RANGES = [
  { id: "1D" as const, ms: 24 * 60 * 60 * 1000, limit: 200 },
  { id: "3D" as const, ms: 3 * 24 * 60 * 60 * 1000, limit: 400 },
  { id: "7D" as const, ms: 7 * 24 * 60 * 60 * 1000, limit: 600 },
  { id: "15D" as const, ms: 15 * 24 * 60 * 60 * 1000, limit: 1000 },
  { id: "30D" as const, ms: 30 * 24 * 60 * 60 * 1000, limit: 1500 },
  { id: "90D" as const, ms: 90 * 24 * 60 * 60 * 1000, limit: 2000 },
];

export type RangeId = (typeof RANGES)[number]["id"];

/** Gifted Charts line point + our timestamp for tooltips */
export type AdcChartPoint = {
  value: number;
  timestamp: number;
  label?: string;
};

function formatTime(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatShortDay(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatFullTimestamp(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatXLabel(ms: number, rangeId: RangeId): string {
  if (rangeId === "1D" || rangeId === "3D") {
    return formatTime(ms);
  }
  if (rangeId === "90D") {
    return formatShortDay(ms);
  }
  return formatShortDay(ms);
}

/** Spread ~6 readable labels across the series */
function pickLabelIndices(length: number): Set<number> {
  if (length === 0) return new Set();
  const target = Math.min(6, length);
  const indices = new Set<number>();
  indices.add(0);
  indices.add(length - 1);
  if (target <= 2) return indices;
  const step = (length - 1) / (target - 1);
  for (let k = 1; k < target - 1; k++) {
    indices.add(Math.round(k * step));
  }
  return indices;
}

export type AdcReadingsChartCardProps = {
  /** Chart viewport height in px (axis + plot area; default 200). */
  height?: number;
};

export function AdcReadingsChartCard({
  height = 200,
}: AdcReadingsChartCardProps) {
  const db = useAdcDatabase();
  const { width: screenW } = useWindowDimensions();

  const [rows, setRows] = useState<AdcReading[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [rangeId, setRangeId] = useState<RangeId>("1D");
  const [chartSlotWidth, setChartSlotWidth] = useState<number | null>(null);

  const scrollRef = useRef<React.ElementRef<typeof ScrollView> | null>(null);

  const accent = useThemeColor({}, "accent");
  const border = useThemeColor({}, "border");
  const text = useThemeColor({}, "text");
  const cardBg = useThemeColor({}, "card");

  const activeRange = useMemo(
    () => RANGES.find((r) => r.id === rangeId) ?? RANGES[0]!,
    [rangeId],
  );

  const load = useCallback(async () => {
    const sinceMs = Date.now() - activeRange.ms;
    const next = await db.listRecentReadings({
      limit: activeRange.limit,
      sinceMs,
      order: "asc",
    });
    setRows(next);
    setLastUpdatedAt(Date.now());
  }, [db, activeRange.ms, activeRange.limit]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  /** Snap horizontal chart scroll to latest samples after data/range updates */
  useEffect(() => {
    if (rows.length === 0) return;
    const t = requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    });
    return () => cancelAnimationFrame(t);
  }, [rows, rangeId]);

  /** Screen padding (16×2) + card padding (16×2) — Y-axis is added by gifted-charts on top of `width` */
  const fallbackContentWidth = useMemo(
    () => Math.max(200, screenW - 64),
    [screenW],
  );
  const chartContentWidth = chartSlotWidth ?? fallbackContentWidth;
  const plotViewportWidth = Math.max(
    160,
    Math.floor(chartContentWidth - Y_AXIS_TOTAL),
  );

  const labelIndices = useMemo(
    () => pickLabelIndices(rows.length),
    [rows.length],
  );

  const chartData: AdcChartPoint[] = useMemo(() => {
    if (rows.length === 0) return [];

    const mapped: AdcChartPoint[] = rows.map((r, i) => ({
      value: r.value,
      timestamp: r.createdAt,
      ...(labelIndices.has(i)
        ? { label: formatXLabel(r.createdAt, rangeId) }
        : {}),
    }));

    if (mapped.length === 1) {
      const only = mapped[0]!;
      return [
        only,
        {
          value: only.value,
          timestamp: only.timestamp + 1,
          label: "",
        },
      ];
    }

    return mapped;
  }, [rows, labelIndices, rangeId]);

  const spacing = useMemo(() => {
    const n = chartData.length;
    if (n <= 1) return 12;
    const inner = plotViewportWidth - 10 - 12; // initialSpacing + endSpacing
    const ideal = inner / Math.max(1, n - 1);
    return Math.round(Math.min(14, Math.max(3, ideal)));
  }, [chartData.length, plotViewportWidth]);

  const axisMuted = useMemo((): TextStyle => {
    return {
      color: text,
      opacity: 0.75,
      fontSize: 10,
    };
  }, [text]);

  const rulesMuted = useMemo(() => {
    return typeof border === "string" && border.startsWith("rgba")
      ? border
      : `${border}`;
  }, [border]);

  return (
    <ThemedView variant="card" style={styles.card}>
      <View style={styles.headerRow}>
        <ThemedText type="subtitle">ADC history</ThemedText>
        <ThemedText style={styles.meta}>
          {lastUpdatedAt == null ? "—" : `Updated ${formatTime(lastUpdatedAt)}`}
        </ThemedText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rangeScrollContent}
        nestedScrollEnabled
      >
        {RANGES.map((r) => {
          const active = r.id === rangeId;
          return (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${r.id} range`}
              onPress={() => setRangeId(r.id)}
              style={[
                styles.rangePill,
                {
                  borderColor: active ? accent : border,
                  backgroundColor: active ? `${accent}22` : "transparent",
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.rangePillText,
                  active && { color: accent, fontWeight: "600" },
                ]}
              >
                {r.id}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {rows.length === 0 ? (
        <ThemedText style={styles.muted}>No stored readings yet.</ThemedText>
      ) : (
        <View
          style={styles.chartSlot}
          onLayout={(e) => setChartSlotWidth(e.nativeEvent.layout.width)}
        >
          <LineChart
            scrollRef={scrollRef}
            scrollToEnd
            scrollAnimation={false}
            nestedScrollEnabled
            parentWidth={chartContentWidth}
            data={chartData}
            width={plotViewportWidth}
            height={height}
            spacing={spacing}
            initialSpacing={10}
            endSpacing={12}
            curved
            areaChart
            color={accent}
            thickness={2.5}
            startFillColor={accent}
            endFillColor={accent}
            startOpacity={0.28}
            endOpacity={0}
            hideDataPoints
            dataPointsRadius={0}
            disableScroll={false}
            showScrollIndicator
            indicatorColor="default"
            rulesType={ruleTypes.DASHED}
            rulesColor={rulesMuted}
            dashWidth={4}
            dashGap={6}
            xAxisColor={border}
            yAxisColor={border}
            xAxisThickness={1}
            yAxisThickness={Y_AXIS_THICKNESS}
            maxValue={Y_AXIS_MAX}
            noOfSections={4}
            yAxisLabelWidth={Y_AXIS_LABEL_WIDTH}
            yAxisTextStyle={axisMuted}
            xAxisLabelTextStyle={axisMuted}
            xAxisTextNumberOfLines={1}
            pointerConfig={{
              pointerStripUptoDataPoint: true,
              pointerStripColor: border,
              pointerStripWidth: 1,
              pointerColor: accent,
              radius: 4,
              pointerLabelWidth: 168,
              pointerLabelHeight: 62,
              activatePointersInstantlyOnTouch: true,
              activatePointersOnLongPress: false,
              pointerLabelComponent: (items: AdcChartPoint[]) => (
                <ChartPointerTooltip
                  items={items}
                  accentColor={accent}
                  borderColor={border}
                  textColor={text}
                  cardBg={cardBg}
                />
              ),
            }}
          />
        </View>
      )}

      <ThemedText style={[styles.note, { color: text }]}>
        Refreshes every 5 minutes from on-device SQLite.
      </ThemedText>
    </ThemedView>
  );
}

function ChartPointerTooltip({
  items,
  accentColor,
  borderColor,
  textColor,
  cardBg,
}: {
  items: AdcChartPoint[];
  accentColor: string;
  borderColor: string;
  textColor: string;
  cardBg: string;
}) {
  const item = items[0];
  const ts = item?.timestamp;
  const val = item?.value;

  return (
    <View style={[styles.tooltip, { borderColor, backgroundColor: cardBg }]}>
      <ThemedText style={[styles.tooltipValue, { color: accentColor }]}>
        {typeof val === "number" ? val : "—"}
      </ThemedText>
      <ThemedText style={[styles.tooltipTime, { color: textColor }]}>
        {ts != null ? formatFullTimestamp(ts) : "—"}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
  },
  meta: {
    opacity: 0.65,
    fontSize: 12,
  },
  rangeScrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  rangePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  rangePillText: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  muted: {
    opacity: 0.78,
  },
  chartSlot: {
    width: "100%",
    alignSelf: "stretch",
    overflow: "hidden",
  },
  note: {
    opacity: 0.55,
    fontSize: 12,
  },
  tooltip: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  tooltipValue: {
    fontSize: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  tooltipTime: {
    fontSize: 11,
    opacity: 0.85,
    fontVariant: ["tabular-nums"],
  },
});
