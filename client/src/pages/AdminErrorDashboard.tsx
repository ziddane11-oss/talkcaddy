import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { AlertCircle, AlertTriangle, AlertOctagon, Info, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorStatsChart } from "@/components/ErrorStatsChart";
import { ErrorDetailModal } from "@/components/ErrorDetailModal";
import { useErrorWebSocket } from "@/hooks/useErrorWebSocket";

type ErrorSeverity = "info" | "warning" | "error" | "critical";

interface ErrorLog {
  id: number;
  userId: number | null;
  errorCode: string;
  errorMessage: string;
  location: string;
  context: Record<string, any> | null;
  statusCode: number | null;
  severity: ErrorSeverity;
  resolved: boolean;
  createdAt: Date;
}

const severityConfig: Record<ErrorSeverity, { color: string; icon: any; label: string }> = {
  info: { color: "bg-blue-100 text-blue-800", icon: Info, label: "정보" },
  warning: { color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle, label: "경고" },
  error: { color: "bg-red-100 text-red-800", icon: AlertCircle, label: "에러" },
  critical: { color: "bg-purple-100 text-purple-800", icon: AlertOctagon, label: "심각" },
};

export default function AdminErrorDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<ErrorSeverity | "all">("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [limit, setLimit] = useState(50);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // P5: tRPC utils 가져오기
  const utils = trpc.useUtils();

  const { isConnected } = useErrorWebSocket({
    onNewError: () => {
      // P5: 새 에러 받으면 목록 새로고침
      utils.admin.getRecentErrors.invalidate();
      utils.admin.getStats.invalidate();
      setLastRefreshTime(new Date());
    },
    onErrorBatch: (errors: any[]) => {
      // P5: 배치 에러 받으면 목록 새로고침
      utils.admin.getRecentErrors.invalidate();
      utils.admin.getStats.invalidate();
      setLastRefreshTime(new Date());
    },
    onStatsUpdate: () => {
      // P5: 통계 업데이트 받으면 갱신
      utils.admin.getStats.invalidate();
      setLastRefreshTime(new Date());
    },
    onErrorResolved: () => {
      // P5: 에러 해결되면 목록 새로고침
      utils.admin.getRecentErrors.invalidate();
      utils.admin.getStats.invalidate();
      setLastRefreshTime(new Date());
    },
  });

  useEffect(() => {
    setWsConnected(isConnected);
  }, [isConnected]);

  // 관리자 권한 확인
  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              접근 거부
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              관리자만 접근할 수 있습니다.
            </p>
            <Button onClick={() => navigate("/")} className="w-full">
              홈으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 에러 로그 조회
  const { data: errors, isLoading: errorsLoading } = trpc.admin.getRecentErrors.useQuery({
    limit,
  });

  // 에러 통계 조회
  const { data: stats } = trpc.admin.getStats.useQuery();

  // 에러 해결 표시
  const { mutate: markResolved, isPending: isResolving } = trpc.admin.markAsResolved.useMutation({
    onSuccess: () => {
      // P5: 목록 새로고침
      utils.admin.getRecentErrors.invalidate();
      utils.admin.getStats.invalidate();
      setLastRefreshTime(new Date());
      setSelectedError(null);
    },
  });

  // 필터링된 에러 목록
  const filteredErrors = useMemo(() => {
    if (!errors) return [];

    return errors.filter((error) => {
      const matchesSearch =
        error.errorCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        error.errorMessage.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSeverity =
        filterSeverity === "all" || error.severity === filterSeverity;

      const matchesLocation =
        filterLocation === "all" || error.location === filterLocation;

      return matchesSearch && matchesSeverity && matchesLocation;
    });
  }, [errors, searchTerm, filterSeverity, filterLocation]);

  // 고유한 위치 목록
  const locations = useMemo(() => {
    if (!errors) return [];
    return Array.from(new Set(errors.map((e) => e.location)));
  }, [errors]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">에러 로그 대시보드</h1>
              <p className="text-muted-foreground">
                시스템 에러를 모니터링하고 관리합니다.
              </p>
            </div>
            {/* P5: WebSocket 연결 상태 표시 */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm text-muted-foreground">
                {wsConnected ? '실시간 모니터링 중' : '연결 대기 중'}
              </span>
              {lastRefreshTime && (
                <span className="text-xs text-muted-foreground ml-2">
                  마지막 갱신: {lastRefreshTime.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 통계 차트 */}
        <ErrorStatsChart stats={stats} />

        {/* 통계 카드 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">총 에러</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalErrors}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">심각</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.bySeverity.critical}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">에러</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.bySeverity.error}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">해결됨</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">해결율</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalErrors > 0
                    ? Math.round((stats.resolved / stats.totalErrors) * 100)
                    : 0}
                  %
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 필터 및 검색 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>필터</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="에러 코드 또는 메시지 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <Select value={filterSeverity} onValueChange={(value) => setFilterSeverity(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="심각도 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 심각도</SelectItem>
                  <SelectItem value="info">정보</SelectItem>
                  <SelectItem value="warning">경고</SelectItem>
                  <SelectItem value="error">에러</SelectItem>
                  <SelectItem value="critical">심각</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="위치 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 위치</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 에러 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>에러 로그 ({filteredErrors.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {errorsLoading ? (
              <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
            ) : filteredErrors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">에러가 없습니다.</div>
            ) : (
              <div className="space-y-4">
                {filteredErrors.map((error) => {
                  const config = severityConfig[error.severity];
                  const Icon = config.icon;

                  return (
                    <div
                      key={error.id}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => setSelectedError(error)}
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <Icon className={`w-5 h-5 mt-1 ${config.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{error.errorCode}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {error.errorMessage}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {error.location} • {new Date(error.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Badge variant={error.resolved ? "outline" : "default"}>
                          {error.resolved ? "해결됨" : "미해결"}
                        </Badge>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 에러 상세 모달 */}
        {selectedError && (
          <ErrorDetailModal
            error={selectedError}
            onClose={() => setSelectedError(null)}
            onResolve={() => {
              markResolved({ errorLogId: selectedError.id });
            }}
            isResolving={isResolving}
          />
        )}
      </div>
    </div>
  );
}
