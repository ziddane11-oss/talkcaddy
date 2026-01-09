import { AlertCircle, RefreshCw, MessageSquare, HelpCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ErrorHandlerProps {
  errorCode?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onSwitchToText?: () => void;
  onUploadNew?: () => void;
  onAddContext?: () => void;
}

/**
 * 에러 코드별 사용자 친화적 메시지 및 액션 제공
 * ChatGPT 피드백: 에러 UX 케이스 5가지
 */
export function ErrorHandler({
  errorCode,
  errorMessage,
  onRetry,
  onSwitchToText,
  onUploadNew,
  onAddContext,
}: ErrorHandlerProps) {
  // 에러 코드별 UI 렌더링
  const renderErrorUI = () => {
    switch (errorCode) {
      case "OCR_EMPTY":
        return (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900">
                <AlertCircle className="h-5 w-5" />
                스크린샷에서 대화를 찾을 수 없습니다
              </CardTitle>
              <CardDescription className="text-red-800">
                말풍선 영역이 명확하지 않거나 텍스트가 없을 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-red-300 bg-white">
                <HelpCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>팁:</strong> 말풍선이 명확하게 보이는 부분을 스크린샷하세요. 상태바나 배터리 표시는 제외해도 괜찮습니다.
                </AlertDescription>
              </Alert>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={onUploadNew}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  다른 스크린샷 올리기
                </Button>
                <Button
                  onClick={onSwitchToText}
                  variant="outline"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  텍스트로 입력하기
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case "CONTEXT_TOO_SHORT":
        return (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-900">
                <AlertCircle className="h-5 w-5" />
                입력 텍스트가 너무 짧습니다
              </CardTitle>
              <CardDescription className="text-yellow-800">
                최소 10자 이상 입력해주세요. 더 자세한 대화 내용을 입력하면 더 정확한 분석이 가능합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-yellow-300 bg-white">
                <HelpCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>예시:</strong> "안녕, 요즘 어떻게 지내?" (최소 10자)
                </AlertDescription>
              </Alert>
              <Button
                onClick={onRetry}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                다시 시도
              </Button>
            </CardContent>
          </Card>
        );

      case "CONTEXT_MISSING":
        return (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <HelpCircle className="h-5 w-5" />
                분석할 대화 내용이 없습니다
              </CardTitle>
              <CardDescription className="text-blue-800">
                스크린샷을 올리거나 텍스트를 입력해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <Button
                  onClick={onUploadNew}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  스크린샷 올리기
                </Button>
                <Button
                  onClick={onSwitchToText}
                  variant="outline"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  텍스트 입력하기
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case "CONTEXT_AMBIGUOUS":
        return (
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <HelpCircle className="h-5 w-5" />
                대화 내용이 애매합니다
              </CardTitle>
              <CardDescription className="text-purple-800">
                더 자세한 상황을 설명해주시면 더 정확한 답변을 제공할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-purple-300 bg-white">
                <HelpCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>예시:</strong> "상대가 바쁜 상태인 것 같아" 또는 "최근에 싸웠어"
                </AlertDescription>
              </Alert>
              <Button
                onClick={onAddContext}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                상황 설명 추가하기
              </Button>
            </CardContent>
          </Card>
        );

      case "MODEL_TIMEOUT":
        return (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-900">
                <AlertCircle className="h-5 w-5" />
                AI 분석이 시간 초과되었습니다
              </CardTitle>
              <CardDescription className="text-orange-800">
                잠시 후 다시 시도해주세요. 네트워크 상태를 확인하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={onRetry}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                다시 시도
              </Button>
            </CardContent>
          </Card>
        );

      case "RATE_LIMIT":
        return (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900">
                <AlertCircle className="h-5 w-5" />
                요청이 너무 많습니다
              </CardTitle>
              <CardDescription className="text-red-800">
                잠시 후 다시 시도해주세요. (1분 정도 기다려주세요)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-red-300 bg-white">
                <HelpCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>안내:</strong> 무료 사용자는 분석 횟수가 제한됩니다. 프리미엄 가입 시 무제한 이용 가능합니다.
                </AlertDescription>
              </Alert>
              <Button
                onClick={onRetry}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                1분 후 다시 시도
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900">
                <AlertCircle className="h-5 w-5" />
                분석 중 오류가 발생했습니다
              </CardTitle>
              <CardDescription className="text-red-800">
                {errorMessage || "잠시 후 다시 시도해주세요."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={onRetry}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                다시 시도
              </Button>
            </CardContent>
          </Card>
        );
    }
  };

  return renderErrorUI();
}
