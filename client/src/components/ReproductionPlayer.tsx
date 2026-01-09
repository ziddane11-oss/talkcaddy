import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from "lucide-react";

/**
 * 재현 단계 인터페이스
 */
export interface ReproductionStep {
  type: "input" | "click" | "wait" | "navigate";
  fieldName?: string;
  value?: string;
  targetElement?: string;
  duration?: number;
  url?: string;
  timestamp?: number;
}

/**
 * 재현 플레이백 컴포넌트 Props
 */
export interface ReproductionPlayerProps {
  steps: ReproductionStep[];
  difficulty?: "easy" | "medium" | "hard" | "very_hard";
  onStepChange?: (stepIndex: number) => void;
}

/**
 * ReproductionPlayer 컴포넌트
 * 에러 재현 단계를 자동으로 재생
 */
export function ReproductionPlayer({
  steps,
  difficulty = "medium",
  onStepChange,
}: ReproductionPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null);

  /**
   * 재생 속도 레이블
   */
  const getSpeedLabel = (speed: number) => {
    if (speed === 0.5) return "0.5x";
    if (speed === 1) return "1x";
    if (speed === 2) return "2x";
    return `${speed}x`;
  };

  /**
   * 난이도 색상
   */
  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "easy":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "hard":
        return "bg-orange-100 text-orange-800";
      case "very_hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  /**
   * 난이도 텍스트
   */
  const getDifficultyText = (diff: string) => {
    switch (diff) {
      case "easy":
        return "쉬움";
      case "medium":
        return "중간";
      case "hard":
        return "어려움";
      case "very_hard":
        return "매우 어려움";
      default:
        return "알 수 없음";
    }
  };

  /**
   * 단계 타입별 아이콘 및 설명
   */
  const getStepDescription = (step: ReproductionStep): string => {
    switch (step.type) {
      case "input":
        return `입력: "${step.fieldName}" = "${step.value}"`;
      case "click":
        return `클릭: ${step.targetElement || "요소"}`;
      case "wait":
        return `대기: ${step.duration}ms`;
      case "navigate":
        return `이동: ${step.url}`;
      default:
        return "알 수 없는 단계";
    }
  };

  /**
   * 단계 타입별 색상
   */
  const getStepColor = (type: string) => {
    switch (type) {
      case "input":
        return "bg-blue-100 text-blue-800";
      case "click":
        return "bg-purple-100 text-purple-800";
      case "wait":
        return "bg-gray-100 text-gray-800";
      case "navigate":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  /**
   * 자동 재생 로직
   */
  useEffect(() => {
    if (!isPlaying || currentStep >= steps.length) {
      setIsPlaying(false);
      return;
    }

    const step = steps[currentStep];
    let delay = 500; // 기본 지연

    if (step.type === "wait") {
      delay = (step.duration || 1000) / playbackSpeed;
    } else if (step.type === "input" || step.type === "click") {
      delay = 800 / playbackSpeed;
    } else if (step.type === "navigate") {
      delay = 1000 / playbackSpeed;
    }

    // 요소 하이라이트
    if (step.targetElement) {
      setHighlightedElement(step.targetElement);
    } else if (step.fieldName) {
      setHighlightedElement(step.fieldName);
    }

    const timer = setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
      onStepChange?.(currentStep + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, playbackSpeed, steps, onStepChange]);

  /**
   * 재생 토글
   */
  const togglePlayback = () => {
    if (currentStep >= steps.length) {
      setCurrentStep(0);
    }
    setIsPlaying(!isPlaying);
  };

  /**
   * 이전 단계로
   */
  const goToPreviousStep = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
    setIsPlaying(false);
  };

  /**
   * 다음 단계로
   */
  const goToNextStep = () => {
    setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1));
    setIsPlaying(false);
  };

  /**
   * 처음부터 시작
   */
  const reset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
    setHighlightedElement(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>재현 플레이백</CardTitle>
            <CardDescription>에러 재현 단계를 자동으로 재생합니다</CardDescription>
          </div>
          <Badge className={getDifficultyColor(difficulty)}>
            {getDifficultyText(difficulty)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 현재 단계 표시 */}
        <div className="bg-muted p-4 rounded-lg">
          <div className="text-sm text-muted-foreground mb-2">
            단계 {currentStep + 1} / {steps.length}
          </div>
          <div className="text-lg font-semibold">
            {currentStep < steps.length ? getStepDescription(steps[currentStep]) : "재생 완료"}
          </div>
        </div>

        {/* 단계 목록 */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                index === currentStep
                  ? "border-blue-500 bg-blue-50"
                  : index < currentStep
                    ? "border-green-200 bg-green-50"
                    : "border-gray-200 bg-gray-50"
              }`}
              onClick={() => {
                setCurrentStep(index);
                setIsPlaying(false);
              }}
            >
              <div className="flex items-center gap-2">
                <Badge className={getStepColor(step.type)} variant="outline">
                  {step.type}
                </Badge>
                <span className="text-sm">{getStepDescription(step)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 재생 속도 조절 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">재생 속도</label>
            <span className="text-sm text-muted-foreground">{getSpeedLabel(playbackSpeed)}</span>
          </div>
          <div className="flex items-center gap-4">
            <Slider
              value={[playbackSpeed]}
              onValueChange={(value) => setPlaybackSpeed(value[0])}
              min={0.5}
              max={2}
              step={0.5}
              className="flex-1"
              disabled={isPlaying}
            />
          </div>
          <div className="flex gap-2 text-xs">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPlaybackSpeed(0.5)}
              disabled={isPlaying}
            >
              0.5x
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPlaybackSpeed(1)}
              disabled={isPlaying}
            >
              1x
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPlaybackSpeed(2)}
              disabled={isPlaying}
            >
              2x
            </Button>
          </div>
        </div>

        {/* 컨트롤 버튼 */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousStep}
            disabled={currentStep === 0 || isPlaying}
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            onClick={togglePlayback}
            className="flex-1"
            disabled={steps.length === 0}
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                일시정지
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                재생
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={goToNextStep}
            disabled={currentStep >= steps.length - 1 || isPlaying}
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            disabled={currentStep === 0 && !isPlaying}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* 진행률 표시 */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* 정보 메시지 */}
        <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg">
          💡 단계를 클릭하여 특정 위치로 이동할 수 있습니다
        </div>
      </CardContent>
    </Card>
  );
}
