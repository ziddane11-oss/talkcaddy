import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Trash2, ChevronRight } from "lucide-react";
import { getHistory, removeFromHistory, clearHistory, formatHistoryTime } from "@/lib/localHistory";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

interface HistoryPanelProps {
  onSelectHistory?: (conversationId: number) => void;
}

export default function HistoryPanel({ onSelectHistory }: HistoryPanelProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [, setLocation] = useLocation();

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleDelete = (id: string) => {
    removeFromHistory(id);
    setHistory(getHistory());
  };

  const handleClearAll = () => {
    if (confirm("모든 히스토리를 삭제하시겠습니까?")) {
      clearHistory();
      setHistory([]);
    }
  };

  const handleSelectHistory = (conversationId: number) => {
    if (onSelectHistory) {
      onSelectHistory(conversationId);
    } else {
      setLocation(`/analysis/${conversationId}`);
    }
  };

  if (history.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500">
        <p className="text-sm">분석 히스토리가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900">최근 분석</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          className="text-xs text-slate-500 hover:text-red-600"
        >
          전체 삭제
        </Button>
      </div>

      {/* 히스토리 목록 */}
      <div className="space-y-2 px-4">
        {history.map((item) => (
          <Card
            key={item.id}
            className="p-3 hover:bg-slate-50 cursor-pointer transition-colors"
            onClick={() => handleSelectHistory(item.conversationId)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* 제목 */}
                <h4 className="font-medium text-sm text-slate-900 truncate">
                  {item.conversationName}
                </h4>

                {/* 메타정보 */}
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {item.relationshipType}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {formatHistoryTime(item.timestamp)}
                  </span>
                </div>

                {/* 요약 */}
                <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                  {item.summary}
                </p>

                {/* 지표 미리보기 */}
                <div className="flex gap-1 mt-2">
                  <Badge
                    className="text-xs bg-orange-100 text-orange-700"
                    variant="outline"
                  >
                    호감 {item.metrics.affection}
                  </Badge>
                  <Badge
                    className="text-xs bg-blue-100 text-blue-700"
                    variant="outline"
                  >
                    관심 {item.metrics.engagement}
                  </Badge>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                  className="text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
