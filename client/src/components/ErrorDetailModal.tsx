import { useState } from "react";
import { AlertCircle, AlertTriangle, AlertOctagon, Info, Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

interface ErrorDetailModalProps {
  error: ErrorLog | null;
  onClose: () => void;
  onResolve?: (errorLogId: number) => void;
  isResolving?: boolean;
}

const severityConfig: Record<ErrorSeverity, { color: string; icon: any; label: string }> = {
  info: { color: "bg-blue-100 text-blue-800", icon: Info, label: "정보" },
  warning: { color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle, label: "경고" },
  error: { color: "bg-red-100 text-red-800", icon: AlertCircle, label: "에러" },
  critical: { color: "bg-purple-100 text-purple-800", icon: AlertOctagon, label: "심각" },
};

/**
 * 에러 상세 정보를 표시하는 모달 컴포넌트
 */
export function ErrorDetailModal({
  error,
  onClose,
  onResolve,
  isResolving,
}: ErrorDetailModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!error) return null;

  const config = severityConfig[error.severity];
  const Icon = config.icon;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 ${config.color.split(" ")[1]}`} />
            <CardTitle className="text-lg">에러 상세 정보</CardTitle>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* 기본 정보 */}
          <section>
            <h3 className="font-semibold mb-4 text-base">기본 정보</h3>
            <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
              {/* 에러 ID */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">에러 ID:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{error.id}</span>
                  <button
                    onClick={() => handleCopy(error.id.toString(), "id")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedField === "id" ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* 에러 코드 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">에러 코드:</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {error.errorCode}
                  </Badge>
                  <button
                    onClick={() => handleCopy(error.errorCode, "code")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedField === "code" ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* 심각도 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">심각도:</span>
                <Badge className={config.color}>
                  <Icon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
              </div>

              {/* 위치 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">위치:</span>
                <span className="text-sm font-medium">{error.location}</span>
              </div>

              {/* 상태 코드 */}
              {error.statusCode && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">상태 코드:</span>
                  <span className="font-mono text-sm">{error.statusCode}</span>
                </div>
              )}

              {/* 사용자 ID */}
              {error.userId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">사용자 ID:</span>
                  <span className="font-mono text-sm">{error.userId}</span>
                </div>
              )}

              {/* 발생 시간 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">발생 시간:</span>
                <span className="text-sm">
                  {new Date(error.createdAt).toLocaleString("ko-KR")}
                </span>
              </div>

              {/* 상태 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">상태:</span>
                {error.resolved ? (
                  <Badge variant="outline" className="bg-green-50">
                    ✓ 해결됨
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-orange-50">
                    ⚠ 미해결
                  </Badge>
                )}
              </div>
            </div>
          </section>

          {/* 에러 메시지 */}
          <section>
            <h3 className="font-semibold mb-2 text-base">에러 메시지</h3>
            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
              <p className="text-sm font-mono break-words text-foreground">
                {error.errorMessage}
              </p>
            </div>
          </section>

          {/* 컨텍스트 */}
          {error.context && Object.keys(error.context).length > 0 && (
            <section>
              <h3 className="font-semibold mb-2 text-base">컨텍스트</h3>
              <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                  {JSON.stringify(error.context, null, 2)}
                </pre>
              </div>
            </section>
          )}

          {/* 액션 */}
          <section className="flex gap-2 pt-4 border-t">
            {!error.resolved && onResolve && (
              <Button
                onClick={() => onResolve(error.id)}
                disabled={isResolving}
                className="flex-1"
              >
                {isResolving ? "처리 중..." : "해결됨으로 표시"}
              </Button>
            )}
            <Button variant="outline" onClick={onClose} className="flex-1">
              닫기
            </Button>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
