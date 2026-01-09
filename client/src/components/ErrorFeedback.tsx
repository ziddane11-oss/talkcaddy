/**
 * ChatGPT 조언 기반 에러 UX 컴포넌트
 * OCR 실패, 맥락 부족, 애매한 대화 해석 등
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Camera, FileText, RefreshCw } from "lucide-react";

interface ErrorFeedbackProps {
  type: "ocr_failed" | "context_needed" | "ambiguous" | "ai_failed";
  message?: string;
  contextQuestion?: string;
  onRetry?: () => void;
  onAlternative?: () => void;
  onAddContext?: () => void;
  onUploadNew?: () => void;
}

export function ErrorFeedback({
  type,
  message,
  contextQuestion,
  onRetry,
  onAlternative,
  onAddContext,
  onUploadNew,
}: ErrorFeedbackProps) {
  if (type === "ocr_failed") {
    return (
      <Card className="border-yellow-500 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <AlertCircle className="h-5 w-5" />
            텍스트를 잘 못 읽었음
          </CardTitle>
          <CardDescription className="text-yellow-700">
            말풍선이 작거나 화면이 흐릴 때 이런 일이 생김
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2">
            <Button variant="default" onClick={onRetry} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              말풍선 영역 다시 잡기
            </Button>
            <Button variant="outline" onClick={onUploadNew} className="w-full">
              <Camera className="mr-2 h-4 w-4" />
              다른 스샷 올리기
            </Button>
          </div>
          <p className="text-xs text-yellow-600">
            💡 팁: 대화 부분만 크게 나오게 캡처하면 정확도 올라감
          </p>
        </CardContent>
      </Card>
    );
  }

  if (type === "context_needed") {
    return (
      <Card className="border-blue-500 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <AlertCircle className="h-5 w-5" />
            맥락이 조금 더 필요함
          </CardTitle>
          {contextQuestion && (
            <CardDescription className="text-blue-700 font-medium">
              {contextQuestion}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="default" onClick={onAddContext} className="w-full">
            <FileText className="mr-2 h-4 w-4" />
            상황 한 줄 입력
          </Button>
          <Button variant="outline" onClick={onUploadNew} className="w-full">
            <Camera className="mr-2 h-4 w-4" />
            이전 대화 스샷 1장 추가
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (type === "ambiguous") {
    return (
      <Card className="border-purple-500 bg-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <AlertCircle className="h-5 w-5" />
            해석이 갈리는 구간임
          </CardTitle>
          <CardDescription className="text-purple-700">
            {message || "여러 해석이 가능한 대화입니다. 상황을 선택해주세요."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button variant="outline" onClick={() => onAlternative?.()} className="w-full justify-start">
              상대가 호감은 있는데 조심 중
            </Button>
            <Button variant="outline" onClick={() => onAlternative?.()} className="w-full justify-start">
              상대가 관심이 식는 중
            </Button>
            <Button variant="outline" onClick={() => onAlternative?.()} className="w-full justify-start">
              그냥 바쁜 상태
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (type === "ai_failed") {
    return (
      <Card className="border-red-500 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            답변 생성이 잠깐 막힘
          </CardTitle>
          <CardDescription className="text-red-700">
            {message || "네트워크 오류 또는 일시적인 문제가 발생했습니다."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="default" onClick={onRetry} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            다시 시도
          </Button>
          <Button variant="outline" onClick={onAlternative} className="w-full">
            <FileText className="mr-2 h-4 w-4" />
            텍스트로만 간단 추천
          </Button>
          <p className="text-xs text-red-600 mt-2">
            💡 fallback 템플릿: "ㅇㅋ 이해함. 시간 될 때 편할 때 연락줘"
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
}
