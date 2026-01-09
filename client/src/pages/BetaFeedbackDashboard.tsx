import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { AlertCircle, CheckCircle, Clock, TrendingUp } from "lucide-react";

/**
 * 베타 피드백 대시보드
 * 관리자용 피드백 모니터링 및 분석
 */

export default function BetaFeedbackDashboard() {
  const [filter, setFilter] = useState<"all" | "bug" | "feature" | "usability">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "in_progress" | "resolved">("open");

  // API 호출
  const { data: feedbacks, isLoading: feedbacksLoading } = trpc.betaFeedback.list.useQuery({
    type: filter === "all" ? undefined : filter,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const { data: stats } = trpc.betaFeedback.getStats.useQuery();
  const reproducibleCount = feedbacks?.filter(f => f.reproducible).length || 0;

  // 관리자 권한 확인 (TODO: 실제 권한 확인은 서버에서 처리)
  if (false) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              접근 거부
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">관리자만 접근할 수 있습니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 차트 데이터 준비
  const typeData = stats
    ? [
        { name: "버그", value: stats.byType.bug, fill: "#ef4444" },
        { name: "기능", value: stats.byType.feature, fill: "#3b82f6" },
        { name: "사용성", value: stats.byType.usability, fill: "#f59e0b" },
      ]
    : [];

  const statusData = stats
    ? [
        { name: "열림", value: stats.byStatus.open, fill: "#ef4444" },
        { name: "진행중", value: stats.byStatus.in_progress, fill: "#f59e0b" },
        { name: "해결됨", value: stats.byStatus.resolved, fill: "#10b981" },
        { name: "거절됨", value: stats.byStatus.rejected, fill: "#6b7280" },
      ]
    : [];

  const severityData = stats
    ? [
        { name: "Critical", value: stats.bySeverity.critical, fill: "#dc2626" },
        { name: "High", value: stats.bySeverity.high, fill: "#ea580c" },
        { name: "Medium", value: stats.bySeverity.medium, fill: "#f59e0b" },
        { name: "Low", value: stats.bySeverity.low, fill: "#6b7280" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">베타 피드백 대시보드</h1>
          <p className="text-gray-600">베타 테스터 피드백 모니터링 및 분석</p>
        </div>

        {/* 통계 카드 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">총 피드백</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.total}</div>
                <p className="text-xs text-gray-500 mt-1">모든 피드백</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">미해결</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-500">{stats.byStatus.open}</div>
                <p className="text-xs text-gray-500 mt-1">즉시 조치 필요</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">재현 가능</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-500">{reproducibleCount}</div>
                <p className="text-xs text-gray-500 mt-1">버그 재현 가능</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">평균 평점</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-500">{stats.averageRating.toFixed(1)}/5</div>
                <p className="text-xs text-gray-500 mt-1">사용자 만족도</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 차트 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">피드백 유형</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">상태 분포</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">심각도 분포</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={severityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* 피드백 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>피드백 목록</CardTitle>
            <CardDescription>우선순위 순으로 정렬됨</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="mb-6">
              <TabsList>
                <TabsTrigger value="all" onClick={() => setFilter("all")}>
                  전체
                </TabsTrigger>
                <TabsTrigger value="bug" onClick={() => setFilter("bug")}>
                  버그
                </TabsTrigger>
                <TabsTrigger value="feature" onClick={() => setFilter("feature")}>
                  기능
                </TabsTrigger>
                <TabsTrigger value="usability" onClick={() => setFilter("usability")}>
                  사용성
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Tabs defaultValue="open" className="mb-6">
              <TabsList>
                <TabsTrigger value="open" onClick={() => setStatusFilter("open")}>
                  미해결
                </TabsTrigger>
                <TabsTrigger value="in_progress" onClick={() => setStatusFilter("in_progress")}>
                  진행중
                </TabsTrigger>
                <TabsTrigger value="resolved" onClick={() => setStatusFilter("resolved")}>
                  해결됨
                </TabsTrigger>
                <TabsTrigger value="all" onClick={() => setStatusFilter("all")}>
                  전체
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {feedbacksLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">로딩 중...</p>
              </div>
            ) : feedbacks && feedbacks.length > 0 ? (
              <div className="space-y-4">
                {feedbacks.map((feedback) => (
                  <div key={feedback.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{feedback.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{feedback.description}</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Badge
                          variant={
                            feedback.feedbackType === "bug"
                              ? "destructive"
                              : feedback.feedbackType === "feature"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {feedback.feedbackType === "bug"
                            ? "버그"
                            : feedback.feedbackType === "feature"
                              ? "기능"
                              : "사용성"}
                        </Badge>
                        <Badge
                          variant={
                            feedback.status === "open"
                              ? "destructive"
                              : feedback.status === "in_progress"
                                ? "outline"
                                : "default"
                          }
                        >
                          {feedback.status === "open"
                            ? "열림"
                            : feedback.status === "in_progress"
                              ? "진행중"
                              : feedback.status === "resolved"
                                ? "해결됨"
                                : "거절됨"}
                        </Badge>
                        {feedback.severity && (
                          <Badge
                            variant={
                              feedback.severity === "critical"
                                ? "destructive"
                                : feedback.severity === "high"
                                  ? "outline"
                                  : "secondary"
                            }
                          >
                            {feedback.severity}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
                      <div className="flex gap-4">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          우선순위: {feedback.priorityScore}
                        </span>
                        {feedback.rating && (
                          <span>평점: {feedback.rating}/5</span>
                        )}
                        {feedback.reproducible && (
                          <span className="flex items-center gap-1 text-orange-600">
                            <AlertCircle className="w-4 h-4" />
                            재현 가능
                          </span>
                        )}
                      </div>
                      <span className="text-xs">
                        {new Date(feedback.createdAt).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">피드백이 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
