import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Loader2, AlertCircle, RotateCcw } from "lucide-react";

interface AnalysisProgressProps {
  currentStep: "ocr" | "parsing" | "analysis" | "complete" | "error";
  errorMessage?: string | null;
  onRetry?: () => void;
  onUploadNew?: () => void;
}

export default function AnalysisProgress({ 
  currentStep, 
  errorMessage,
  onRetry,
  onUploadNew 
}: AnalysisProgressProps) {
  const steps = [
    { id: "ocr", label: "OCR 텍스트 추출", description: "스크린샷에서 대화 내용을 읽고 있어요" },
    { id: "parsing", label: "대화 파싱", description: "발신자와 내용을 구분하고 있어요" },
    { id: "analysis", label: "AI 분석", description: "상대 심리를 분석하고 답변을 생성하고 있어요" },
  ];

  const getStepStatus = (stepId: string) => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    const currentIndex = steps.findIndex(s => s.id === currentStep);

    if (currentStep === "complete") return "complete";
    if (currentStep === "error") return "error";
    if (stepIndex < currentIndex) return "complete";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  // 에러 상태
  if (currentStep === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <Card className="w-full max-w-md border-2 border-orange-500">
          <CardContent className="pt-8">
            <div className="space-y-6">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <AlertCircle className="h-12 w-12 text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">분석 실패</h2>
                <p className="text-sm text-slate-600 mb-4">
                  {errorMessage || "분석 중 오류가 발생했습니다."}
                </p>
              </div>

              <div className="bg-orange-50 border border-orange-200 p-4 rounded">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">💡 다시 시도하기:</span>
                </p>
                <ul className="text-sm text-slate-600 mt-2 space-y-1">
                  <li>• 다른 스크린샷으로 시도해보세요</li>
                  <li>• 대화 내용이 명확하게 보이는지 확인하세요</li>
                  <li>• 스크린샷이 너무 작거나 흐릿하지 않은지 확인하세요</li>
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                {onRetry && (
                  <Button
                    onClick={onRetry}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    다시 시도
                  </Button>
                )}
                {onUploadNew && (
                  <Button
                    onClick={onUploadNew}
                    variant="outline"
                    className="w-full border-slate-200 hover:border-orange-500"
                  >
                    다른 스크린샷 올리기
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <Card className="w-full max-w-md border border-slate-200">
        <CardContent className="pt-8">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">분석 중...</h2>
              <p className="text-sm text-slate-600">잠시만 기다려주세요</p>
            </div>

            <div className="space-y-4">
              {steps.map((step, index) => {
                const status = getStepStatus(step.id);
                return (
                  <div key={step.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {status === "complete" && (
                        <CheckCircle2 className="h-6 w-6 text-orange-500" />
                      )}
                      {status === "active" && (
                        <Loader2 className="h-6 w-6 text-orange-500 animate-spin" />
                      )}
                      {status === "pending" && (
                        <Circle className="h-6 w-6 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${
                        status === "complete" ? "text-orange-600" :
                        status === "active" ? "text-orange-600" :
                        "text-slate-400"
                      }`}>
                        {step.label}
                      </p>
                      {status === "active" && (
                        <p className="text-sm text-slate-600 mt-1">{step.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 진행률 바 */}
            <div className="pt-4">
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 transition-all duration-500"
                  style={{
                    width: currentStep === "ocr" ? "33%" :
                           currentStep === "parsing" ? "66%" :
                           currentStep === "analysis" ? "90%" :
                           "100%"
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
