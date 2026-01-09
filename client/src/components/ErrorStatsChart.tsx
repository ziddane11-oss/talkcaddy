import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorStats {
  totalErrors: number;
  bySeverity: {
    info: number;
    warning: number;
    error: number;
    critical: number;
  };
  byErrorCode: Record<string, number>;
  byLocation: Record<string, number>;
  resolved: number;
}

interface ErrorStatsChartProps {
  stats: ErrorStats | null | undefined;
}

/**
 * 에러 통계를 시각화하는 차트 컴포넌트
 */
export function ErrorStatsChart({ stats }: ErrorStatsChartProps) {
  if (!stats) {
    return null;
  }

  // 에러 코드 TOP 5
  const topErrorCodes = useMemo(() => {
    return Object.entries(stats.byErrorCode)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [stats.byErrorCode]);

  // 위치별 에러 TOP 5
  const topLocations = useMemo(() => {
    return Object.entries(stats.byLocation)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [stats.byLocation]);

  // 심각도별 백분율
  const severityPercentages = useMemo(() => {
    const total = stats.totalErrors || 1;
    return {
      info: Math.round((stats.bySeverity.info / total) * 100),
      warning: Math.round((stats.bySeverity.warning / total) * 100),
      error: Math.round((stats.bySeverity.error / total) * 100),
      critical: Math.round((stats.bySeverity.critical / total) * 100),
    };
  }, [stats]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* 심각도별 분포 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">심각도별 분포</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Critical */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">심각 (Critical)</span>
              <span className="text-purple-600 font-semibold">
                {stats.bySeverity.critical} ({severityPercentages.critical}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full"
                style={{ width: `${severityPercentages.critical}%` }}
              />
            </div>
          </div>

          {/* Error */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">에러 (Error)</span>
              <span className="text-red-600 font-semibold">
                {stats.bySeverity.error} ({severityPercentages.error}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full"
                style={{ width: `${severityPercentages.error}%` }}
              />
            </div>
          </div>

          {/* Warning */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">경고 (Warning)</span>
              <span className="text-yellow-600 font-semibold">
                {stats.bySeverity.warning} ({severityPercentages.warning}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-600 h-2 rounded-full"
                style={{ width: `${severityPercentages.warning}%` }}
              />
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">정보 (Info)</span>
              <span className="text-blue-600 font-semibold">
                {stats.bySeverity.info} ({severityPercentages.info}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${severityPercentages.info}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 해결 현황 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">해결 현황</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">해결됨</span>
              <span className="text-green-600 font-semibold">
                {stats.resolved} (
                {Math.round((stats.resolved / stats.totalErrors) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{
                  width: `${Math.round((stats.resolved / stats.totalErrors) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">미해결</span>
              <span className="text-orange-600 font-semibold">
                {stats.totalErrors - stats.resolved} (
                {Math.round(
                  ((stats.totalErrors - stats.resolved) / stats.totalErrors) * 100
                )}
                %)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-600 h-2 rounded-full"
                style={{
                  width: `${Math.round(
                    ((stats.totalErrors - stats.resolved) / stats.totalErrors) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TOP 에러 코드 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">TOP 에러 코드</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topErrorCodes.length === 0 ? (
              <p className="text-sm text-muted-foreground">에러 코드 데이터가 없습니다.</p>
            ) : (
              topErrorCodes.map(([code, count], index) => (
                <div key={code} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {code}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${Math.round(
                            (count / (topErrorCodes[0]?.[1] || 1)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold min-w-8 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* TOP 위치 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">TOP 에러 위치</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topLocations.length === 0 ? (
              <p className="text-sm text-muted-foreground">위치 데이터가 없습니다.</p>
            ) : (
              topLocations.map(([location, count], index) => (
                <div key={location} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-600 h-2 rounded-full"
                        style={{
                          width: `${Math.round(
                            (count / (topLocations[0]?.[1] || 1)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold min-w-8 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
