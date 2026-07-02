// KPI
export { KPINumber, type KPINumberProps, type KPINumberSize } from './components/KPINumber';
export { TrendIndicator, type TrendIndicatorProps, type TrendDirection } from './components/TrendIndicator';
export { default as AnalyticsSparkline, type AnalyticsSparklineProps } from './components/Sparkline';
export { KPICard, type KPICardProps } from './components/KPICard';

// Charts
export { AnalyticsBarChart, type AnalyticsBarChartProps, type BarChartOrientation, type BarChartVariant } from './components/BarChart';
export { AnalyticsLineChart, type AnalyticsLineChartProps } from './components/LineChart';
export { AnalyticsAreaChart, type AnalyticsAreaChartProps } from './components/AreaChart';

// Tables & layout
export { DataTable, type DataTableProps, type DataTableColumn } from './components/DataTable';
export { DashboardGrid, type DashboardGridProps, type DashboardWidget } from './components/DashboardGrid';
export { AnalyticsKpiStrip, type AnalyticsKpiStripProps } from './components/AnalyticsKpiStrip';

// Real-time
export { LiveIndicator, type LiveIndicatorProps, type LiveStatus } from './components/LiveIndicator';
export { ConnectionQuality, type ConnectionQualityProps } from './components/ConnectionQuality';
export { AnomalyBadge, type AnomalyBadgeProps } from './components/AnomalyBadge';

// Hooks
export { useCountUp, type UseCountUpOptions, type CountUpFormat, type CountUpFlash } from './hooks/useCountUp';
export { useAnimatedValue, type UseAnimatedValueOptions } from './hooks/useAnimatedValue';
export { useDashboardEntrance, type DashboardEntrancePhase } from './hooks/useDashboardEntrance';

// Utils
export { easeOutExpo, CHART_PALETTE } from './lib/easing';
