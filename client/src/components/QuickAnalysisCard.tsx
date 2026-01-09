import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Upload, Type } from "lucide-react";
import { useState } from "react";

interface QuickAnalysisCardProps {
  conversationId: number;
  onUploadClick: () => void;
  onTextInputClick: () => void;
}

/**
 * 온보딩 개선: 빠른 분석 버튼
 * ChatGPT 피드백: 대화방 진입 후 즉시 분석 시작 가능하도록 개선
 * 스크린샷 업로드 또는 텍스트 입력 두 가지 경로 제공
 */
export function QuickAnalysisCard({
  conversationId,
  onUploadClick,
  onTextInputClick,
}: QuickAnalysisCardProps) {
  const [hoveredButton, setHoveredButton] = useState<"upload" | "text" | null>(null);

  return (
    <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900">
          <Zap className="h-5 w-5 text-orange-500" />
          빠른 분석 시작
        </CardTitle>
        <CardDescription className="text-orange-800">
          스크린샷 또는 텍스트로 즉시 분석을 시작하세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            onClick={onUploadClick}
            onMouseEnter={() => setHoveredButton("upload")}
            onMouseLeave={() => setHoveredButton(null)}
            className={`h-auto py-4 flex flex-col items-center gap-2 transition-all ${
              hoveredButton === "upload"
                ? "bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
                : "bg-white border border-orange-200 text-orange-900 hover:bg-orange-50"
            }`}
          >
            <Upload className="h-5 w-5" />
            <span className="font-semibold">스크린샷 업로드</span>
            <span className="text-xs opacity-75">카톡 대화 캡처</span>
          </Button>
          <Button
            onClick={onTextInputClick}
            onMouseEnter={() => setHoveredButton("text")}
            onMouseLeave={() => setHoveredButton(null)}
            className={`h-auto py-4 flex flex-col items-center gap-2 transition-all ${
              hoveredButton === "text"
                ? "bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
                : "bg-white border border-orange-200 text-orange-900 hover:bg-orange-50"
            }`}
          >
            <Type className="h-5 w-5" />
            <span className="font-semibold">텍스트 입력</span>
            <span className="text-xs opacity-75">직접 입력하기</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
