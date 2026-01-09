import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Mail, CheckCircle, Clock, XCircle, TrendingUp, Users } from "lucide-react";

/**
 * 관리자용 초대 통계 대시보드
 * 발송한 초대 링크 현황, 수락률, 테스터별 활동 통계
 */

interface InvitationStats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  acceptanceRate: number;
  averageDaysToAccept: number;
}

interface InvitationRecord {
  id: string;
  email: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
  acceptedAt?: Date;
  userId?: number;
}

interface InvitationStatsData {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  acceptanceRate?: number;
  averageDaysToAccept?: number;
}

export default function AdminBetaStatistics() {
  const [searchEmail, setSearchEmail] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "accepted" | "rejected">("all");

  // API 호출 (메모리 기반 데이터 사용)
  const { data: statsRaw } = trpc.beta.getStats.useQuery();
  const { data: invitations } = trpc.beta.listInvitations.useQuery();
  
  // 통계 데이터 계산
  const stats: InvitationStatsData | undefined = statsRaw ? {
    ...statsRaw,
    acceptanceRate: statsRaw.total > 0 ? Math.round((statsRaw.accepted / statsRaw.total) * 100) : 0,
    averageDaysToAccept: 2.5, // 샘플 데이터
  } : undefined;

  // 필터링된 초대 목록
  const filteredInvitations = (invitations || []).filter((inv) => {
    const emailMatch = inv.email.toLowerCase().includes(searchEmail.toLowerCase());
    const statusMatch = filterStatus === "all" || inv.status === filterStatus;
    return emailMatch && statusMatch;
  });

  // 차트 데이터
  const statusData = stats
    ? [
        { name: "대기 중", value: stats.pending, fill: "#f59e0b" },
        { name: "수락", value: stats.accepted, fill: "#10b981" },
        { name: "거절", value: stats.rejected, fill: "#ef4444" },
      ]
    : [];

  const timelineData = [
    { day: "1일차", accepted: 5, pending: 15 },
    { day: "2일차", accepted: 8, pending: 12 },
    { day: "3일차", accepted: 12, pending: 8 },
    { day: "4일차", accepted: 15, pending: 5 },
    { day: "5일차", accepted: 18, pending: 2 },
    { day: "6일차", accepted: 20, pending: 0 },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">대기 중</Badge>;
      case "accepted":
        return <Badge variant="outline" className="bg-green-50 text-green-700">✓ 수락</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700">✗ 거절</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "accepted":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const formatDate = (dateInput: string | Date) => {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">초대 통계 대시보드</h1>
          <p className="text-gray-600">베타 테스터 초대 현황 및 수락률 모니터링</p>
        </div>

        {/* 통계 카드 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  총 초대
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.total}</div>
                <p className="text-xs text-gray-500 mt-1">발송된 초대</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  대기 중
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
                <p className="text-xs text-gray-500 mt-1">응답 대기</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  수락
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.accepted}</div>
                <p className="text-xs text-gray-500 mt-1">베타 참여</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  거절
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
                <p className="text-xs text-gray-500 mt-1">거절</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  수락률
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats.acceptanceRate}%</div>
                <p className="text-xs text-gray-500 mt-1">수락 비율</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 차트 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 상태 분포 */}
          <Card>
            <CardHeader>
              <CardTitle>초대 상태 분포</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 시간대별 수락 추이 */}
          <Card>
            <CardHeader>
              <CardTitle>시간대별 수락 추이</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="accepted" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* 초대 리스트 */}
        <Card>
          <CardHeader>
            <CardTitle>초대 리스트</CardTitle>
            <CardDescription>발송한 모든 초대 현황</CardDescription>
          </CardHeader>
          <CardContent>
            {/* 필터 */}
            <div className="flex gap-4 mb-6">
              <Input
                placeholder="이메일로 검색..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="flex-1"
              />
              <div className="flex gap-2">
                {(["all", "pending", "accepted", "rejected"] as const).map((status) => (
                  <Button
                    key={status}
                    variant={filterStatus === status ? "default" : "outline"}
                    onClick={() => setFilterStatus(status)}
                    className={filterStatus === status ? "bg-orange-500 hover:bg-orange-600" : ""}
                  >
                    {status === "all"
                      ? "전체"
                      : status === "pending"
                        ? "대기 중"
                        : status === "accepted"
                          ? "수락"
                          : "거절"}
                  </Button>
                ))}
              </div>
            </div>

            {/* 테이블 */}
            {filteredInvitations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">이메일</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">상태</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">발송일</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">수락일</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">소요 시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvitations.map((inv) => (
                      <tr key={inv.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">{inv.email}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(inv.status)}
                            {getStatusBadge(inv.status)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(inv.createdAt.toString())}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {inv.acceptedAt ? formatDate(inv.acceptedAt.toString()) : "-"}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {inv.acceptedAt ? `${Math.ceil((inv.acceptedAt.getTime() - inv.createdAt.getTime()) / (1000 * 60 * 60 * 24))}일` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">초대 기록이 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 통계 요약 */}
        {stats && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-base">📊 통계 요약</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <p>
                ✓ <strong>평균 수락 시간:</strong> {stats.averageDaysToAccept}일
              </p>
              <p>
                ✓ <strong>수락률:</strong> {stats.acceptanceRate}% ({stats.accepted}/{stats.total})
              </p>
              <p>
                ✓ <strong>아직 응답 대기:</strong> {stats.pending}명 ({((stats.pending / stats.total) * 100).toFixed(1)}%)
              </p>
              <p>
                ✓ <strong>거절:</strong> {stats.rejected}명 ({((stats.rejected / stats.total) * 100).toFixed(1)}%)
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
