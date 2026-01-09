import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { AlertCircle } from "lucide-react";

interface PsychologyMetrics {
  affection: number; // 호감도 0-100
  anger: number; // 화남/방어 0-100
  engagement: number; // 관심/몰입 0-100
  distance: number; // 거리감 0-100
  misunderstanding: number; // 오해 위험 0-100
  flowScore: number; // 썸 흐름 점수 0-100
  flowDescription: string; // 흐름 설명
  keywords: {
    affection: string;
    anger: string;
    engagement: string;
    distance: string;
    misunderstanding: string;
  };
}

interface PsychologyMetricsCardProps {
  metrics: PsychologyMetrics;
}

export default function PsychologyMetricsCard({ metrics }: PsychologyMetricsCardProps) {
  // 각 지표별 색상
  const COLORS = {
    affection: "#f97316", // orange
    anger: "#ef4444", // red
    engagement: "#3b82f6", // blue
    distance: "#8b5cf6", // purple
    misunderstanding: "#ec4899", // pink
  };

  // 게이지 데이터
  const gaugeData = [
    { name: "Score", value: metrics.flowScore },
    { name: "Remaining", value: 100 - metrics.flowScore },
  ];

  // 도넛 데이터
  const metricsData = [
    { name: "호감도", value: metrics.affection, color: COLORS.affection },
    { name: "화남/방어", value: metrics.anger, color: COLORS.anger },
    { name: "관심/몰입", value: metrics.engagement, color: COLORS.engagement },
    { name: "거리감", value: metrics.distance, color: COLORS.distance },
    { name: "오해 위험", value: metrics.misunderstanding, color: COLORS.misunderstanding },
  ];

  // 흐름 점수 레벨 판단
  const getFlowLevel = (score: number) => {
    if (score >= 75) return "매우 좋음";
    if (score >= 60) return "좋음";
    if (score >= 45) return "보통";
    if (score >= 30) return "조심";
    return "위험";
  };

  const getFlowColor = (score: number) => {
    if (score >= 75) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 45) return "text-yellow-600";
    if (score >= 30) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-8">
      {/* 썸 흐름 점수 게이지 */}
      <div className="border-2 border-orange-200 bg-orange-50 p-8 rounded-lg">
        <div className="flex items-center gap-2 mb-6">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <h3 className="text-lg font-bold text-slate-900">현재 흐름 점수</h3>
          <span className="text-xs text-slate-500 ml-auto">대화 톤 기반 추정치</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 게이지 */}
          <div className="lg:col-span-1 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={gaugeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  startAngle={180}
                  endAngle={0}
                  dataKey="value"
                >
                  <Cell fill="#f97316" />
                  <Cell fill="#e5e7eb" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center mt-4">
              <div className="text-4xl font-bold text-orange-600">{metrics.flowScore}</div>
              <div className="text-sm text-slate-600">/100</div>
              <div className={`text-sm font-semibold mt-2 ${getFlowColor(metrics.flowScore)}`}>
                {getFlowLevel(metrics.flowScore)}
              </div>
            </div>
          </div>

          {/* 설명 */}
          <div className="lg:col-span-2 flex flex-col justify-center">
            <p className="text-slate-900 font-medium leading-relaxed mb-4">
              {metrics.flowDescription}
            </p>
            <div className="bg-white p-4 rounded border border-orange-200">
              <p className="text-xs text-slate-600">
                <span className="font-semibold">💡 팁:</span> 이 점수는 현재 대화의 흐름을 기반으로 한 추정치입니다. 
                정확한 심리검사가 아니며, 상황과 맥락에 따라 달라질 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5개 지표 도넛 */}
      <div className="border border-slate-200 p-8 rounded-lg">
        <h3 className="text-lg font-bold text-slate-900 mb-6">대화 톤 분석</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {metricsData.map((metric) => (
            <div key={metric.name} className="flex flex-col items-center">
              {/* 도넛 차트 */}
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={[
                      { name: metric.name, value: metric.value },
                      { name: "Remaining", value: 100 - metric.value },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    dataKey="value"
                  >
                    <Cell fill={metric.color} />
                    <Cell fill="#e5e7eb" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* 라벨 */}
              <div className="text-center mt-4">
                <div className="text-2xl font-bold" style={{ color: metric.color }}>
                  {metric.value}
                </div>
                <div className="text-xs text-slate-600 font-medium mt-1">{metric.name}</div>

                {/* 근거 키워드 */}
                <div className="text-xs text-slate-500 mt-2 px-2">
                  {metric.name === "호감도" && (
                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">
                      {metrics.keywords.affection}
                    </span>
                  )}
                  {metric.name === "화남/방어" && (
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded">
                      {metrics.keywords.anger}
                    </span>
                  )}
                  {metric.name === "관심/몰입" && (
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {metrics.keywords.engagement}
                    </span>
                  )}
                  {metric.name === "거리감" && (
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      {metrics.keywords.distance}
                    </span>
                  )}
                  {metric.name === "오해 위험" && (
                    <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded">
                      {metrics.keywords.misunderstanding}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
