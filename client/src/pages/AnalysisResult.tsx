import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Copy, Heart, Loader2, RefreshCw, Plus, TrendingUp, Smile, Zap, AlertCircle } from "lucide-react";
import { ErrorFeedback } from "@/components/ErrorFeedback";
import PrivacyMaskingAlert from "@/components/PrivacyMaskingAlert";
import PsychologyMetricsCard from "@/components/PsychologyMetricsCard";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { addToHistory } from "@/lib/localHistory";
import { analyzeReplyRisk, getRiskIcon } from "../../../server/forbiddenWords";
import { recordToneSelection, getPreferredTone, getProfileSummary } from "@/lib/styleProfile";
import { recommendBestReply, getConfidenceBadge, getConfidenceColor } from "../../../server/recommendationEngine";
import { LengthPreference, getLengthConfig, getLengthLabel, getLengthDescription, getLengthColor } from "../../../server/lengthControl";
import { extractReplyFeatures } from "@/lib/styleProfileFeatures";
import { recordStyleChoice, getModeProfile, getProfileConfidence, resetStyleProfile } from "@/lib/styleProfileManager";
import { addChoiceRecord } from "@/lib/choiceHistory";
import { calculateReplyScore, getRecommendationReason, getRecommendationBadge } from "@/lib/styleRecommendation";

export default function AnalysisResult() {
  const [, params] = useRoute("/analysis/:conversationId");
  const conversationId = params?.conversationId ? parseInt(params.conversationId) : 0;
  const [, setLocation] = useLocation();

  // 상태 관리
  const [selectedTone, setSelectedTone] = useState<"soft" | "balanced" | "humor" | null>(null);
  const [lengthPreference, setLengthPreference] = useState<LengthPreference>("medium");
  const [contextDialogOpen, setContextDialogOpen] = useState(false);
  const [contextHint, setContextHint] = useState("");
  const [regeneratedReply, setRegeneratedReply] = useState<any>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [recommendation, setRecommendation] = useState<any>(null);

  // 최근 분석 결과 조회
  const { data: analysis, isLoading: analysisLoading } = trpc.analysis.getLatest.useQuery(
    { conversationId },
    { enabled: conversationId > 0 }
  );

  // 대화방 정보 조회
  const { data: conversation } = trpc.conversations.get.useQuery(
    { id: conversationId },
    { enabled: conversationId > 0 }
  );

  // 톤 변경 재생성 mutation
  const regenerateMutation = (trpc.conversations as any).regenerateWithTone.useMutation({
    onSuccess: (data: any) => {
      setRegeneratedReply(data);
      toast.success(`${getToneLabel(selectedTone!)} 톤으로 재생성되었습니다!`);
    },
    onError: (error: any) => {
      toast.error("재생성 중 오류가 발생했습니다: " + error.message);
    },
  });

  // 피드백 제출 mutation
  const submitFeedbackMutation = trpc.feedback.submitFeedback.useMutation({
    onSuccess: () => {
      toast.success("피드백이 저장되었습니다!");
    },
    onError: (error: any) => {
      toast.error("피드백 저장 중 오류가 발생했습니다.");
    },
  });

  // 맥락 추가 재분석 mutation
  const addContextMutation = (trpc.conversations as any).addContextAndReanalyze.useMutation({
    onSuccess: () => {
      setContextDialogOpen(false);
      setContextHint("");
      toast.success("맥락을 추가하여 재분석되었습니다!");
      window.location.reload();
    },
    onError: (error: any) => {
      toast.error("재분석 중 오류가 발생했습니다: " + error.message);
    },
  });

  const getToneLabel = (tone: string) => {
    switch (tone) {
      case "soft":
        return "부드럽게";
      case "balanced":
        return "균형";
      case "humor":
        return "유머";
      default:
        return tone;
    }
  };

  const getToneIcon = (tone: string) => {
    switch (tone) {
      case "soft":
        return <Heart className="h-5 w-5" />;
      case "balanced":
        return <TrendingUp className="h-5 w-5" />;
      case "humor":
        return <Smile className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getToneEffect = (tone: string) => {
    switch (tone) {
      case "soft":
        return "상대방의 감정을 존중하며 부드럽게 접근합니다. 거리감을 좁히고 신뢰를 쌓는 데 효과적입니다.";
      case "balanced":
        return "감정과 논리의 균형을 맞춰 자연스럽고 진정성 있게 들립니다. 대부분의 상황에서 가장 무난합니다.";
      case "humor":
        return "유머를 섞어 밝고 긍정적인 분위기를 만듭니다. 관계를 가볍게 유지하고 싶을 때 좋습니다.";
      default:
        return "";
    }
  };

  const copyToClipboard = (text: string, replyIndex?: number) => {
    navigator.clipboard.writeText(text);
    toast.success("✓ 복사됨!", {
      duration: 2000,
      position: "bottom-right",
    });

    if (replyIndex !== undefined && analysisData && conversation) {
      try {
        const features = extractReplyFeatures(text);
        const mode = (conversation.relationshipType === "직장" ? "work" : conversation.relationshipType === "거래" ? "trade" : "dating") as "dating" | "work" | "trade";
        recordStyleChoice(mode, features);
        addChoiceRecord(mode, replyIndex as 0 | 1 | 2, text, features);
      } catch (error) {
        console.error("Failed to record style choice:", error);
      }
    }
  };

  const handleRegenerateTone = (tone: "soft" | "balanced" | "humor") => {
    setSelectedTone(tone);
    regenerateMutation.mutate({ conversationId, tone });
  };

  const handleAddContext = () => {
    if (!contextHint.trim()) {
      toast.error("상황을 입력해주세요.");
      return;
    }
    addContextMutation.mutate({ conversationId, contextHint });
  };

  const handleSubmitFeedback = (rating: 1 | -1) => {
    if (!analysis?.id) return;
    submitFeedbackMutation.mutate({
      analysisResultId: analysis.id,
      tone: "strong",
      rating,
    });
    setFeedbackSubmitted(true);
  };

  // analysis.getLatest는 이미 파싱된 객체를 반환하므로 그대로 사용
  const analysisData = analysis;

  // 히스토리에 분석 결과 저장 - 훅은 항상 최상단에서 호출
  useEffect(() => {
    if (analysisData && conversation) {
      addToHistory({
        conversationId,
        conversationName: conversation.partnerName || "분석 결과",
        relationshipType: (conversation.relationshipType as any) || "기타",
        summary: analysisData?.one_line_psychology || "분석 완료",
        metrics: {
          affection: (analysisData as any).affection || 0,
          anger: (analysisData as any).anger || 0,
          engagement: (analysisData as any).engagement || 0,
          distance: (analysisData as any).distance || 0,
          misunderstanding: (analysisData as any).misunderstanding || 0,
        },
      });
    }
  }, [analysisData, conversation, conversationId]);

  // A/B 테스트 추천 및 프로필 계산 - 훅은 항상 최상단에서 호출
  useEffect(() => {
    if (analysisData && analysisData.replies && analysisData.replies.length === 3 && conversation) {
      const rec = recommendBestReply(
        analysisData.replies as any,
        {
          affection: (analysisData as any).affection || 0,
          anger: (analysisData as any).anger || 0,
          engagement: (analysisData as any).engagement || 0,
          distance: (analysisData as any).distance || 0,
          misunderstanding: (analysisData as any).misunderstanding || 0,
          relationshipType: (conversation.relationshipType as any) || "기타",
        }
      );
      setRecommendation(rec);
    }
  }, [analysisData, conversation]);

  // 단축키 이벤트 리스너 (Ctrl+1/2/3) - 훅은 항상 최상단에서 호출
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key === "1" && analysisData?.replies?.[0]) {
          e.preventDefault();
          copyToClipboard(analysisData.replies[0].text, 0);
        } else if (e.key === "2" && analysisData?.replies?.[1]) {
          e.preventDefault();
          copyToClipboard(analysisData.replies[1].text, 1);
        } else if (e.key === "3" && analysisData?.replies?.[2]) {
          e.preventDefault();
          copyToClipboard(analysisData.replies[2].text, 2);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [analysisData]);

  // early return은 모든 훅 호출 아래에 위치
  if (analysisLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="border border-slate-200 p-8 text-center">
          <p className="text-slate-600 mb-4">분석 결과를 찾을 수 없습니다.</p>
          <Button onClick={() => setLocation(`/conversation/${conversationId}`)} className="bg-orange-500 hover:bg-orange-600">
            대화방으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 - 모든 화면에서 표시 */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => setLocation(`/conversation/${conversationId}`)}
            className="text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="container mx-auto px-4 py-8">
        {/* 데스크탑 2컬럼 레이아웃 (>=1024px) */}
        <div className="hidden lg:grid lg:grid-cols-3 lg:gap-8">
          {/* 좌측: 프로필 + 심리 분석 (1컬럼) */}
          <div className="space-y-6">
            {conversation && (
              <div className="border border-slate-200 p-6">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">{conversation.partnerName}</h1>
                <p className="text-sm text-slate-600">
                  {conversation.relationshipType} · {JSON.parse(conversation.goals).join(", ")}
                </p>
              </div>
            )}

            {/* 상대 심리 분석 - 강조 */}
            <div className="border-2 border-orange-500 bg-orange-50 p-6">
              <div className="flex items-start gap-2 mb-3">
                <Zap className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-orange-600">상대방 심리</h2>
                {(analysisData as any).isGroupChat && (
                  <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-700 text-xs">
                    단톡 모드 ({(analysisData as any).participantCount}명)
                  </Badge>
                )}
              </div>
              <p className="text-lg font-bold text-slate-900 leading-relaxed">{analysisData?.one_line_psychology}</p>
            </div>

            {/* 개인정보 마스킹 알림 */}
            {(analysisData as any).privacyMasking && (analysisData as any).privacyMasking.hasSensitiveInfo && (
              <PrivacyMaskingAlert detectedTypes={(analysisData as any).privacyMasking.detectedTypes} />
            )}

            {/* 맥락 부족 경고 */}
            {analysisData?.need_more_context && (
              <ErrorFeedback
                type="context_needed"
                contextQuestion={analysisData?.context_question}
                onAddContext={() => setContextDialogOpen(true)}
                onUploadNew={() => setLocation(`/conversation/${conversationId}`)}
              />
            )}
          </div>

          {/* 우측: 심리 지표 + 답변 3종 (2컬럼) */}
          <div className="lg:col-span-2 space-y-6">
            {/* 심리 지표 시각화 */}
            <PsychologyMetricsCard
              metrics={{
                affection: 78,
                anger: 15,
                engagement: 82,
                distance: 25,
                misunderstanding: 12,
                flowScore: 78,
                flowDescription: "분위기 좋음. 다만 질문이 단답이면 흐름 꺾일 수 있음.",
                keywords: {
                  affection: "ㅎㅎ/이모지 많음",
                  anger: "부정어 적음",
                  engagement: "질문 반복",
                  distance: "존댓말 유지",
                  misunderstanding: "명령형 없음",
                },
              }}
            />

            {/* 재생성된 답변 표시 */}
            {regeneratedReply && (
              <div className="border-2 border-orange-500 bg-orange-50 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">
                  ✨ 재생성 ({getToneLabel(regeneratedReply.reply.tone)})
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-slate-900 font-medium mb-2">{regeneratedReply.reply.text}</p>
                    <p className="text-sm text-slate-600">💡 {regeneratedReply.reply.why}</p>
                    {regeneratedReply.reply.risk && (
                      <p className="text-sm text-orange-600 mt-2">⚠️ {regeneratedReply.reply.risk}</p>
                    )}
                  </div>
                  <Button
                    onClick={() => copyToClipboard(regeneratedReply.reply.text)}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-5"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    복사하기
                  </Button>
                </div>
              </div>
            )}

            {/* 답변 3종 */}
            <div className="space-y-4">

            {/* 길이 슬라이더 */}
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">답변 길이 조절</h3>
              <div className="flex gap-2">
                {(['short', 'medium', 'long'] as const).map((length) => (
                  <button
                    key={length}
                    onClick={() => setLengthPreference(length)}
                    className={`flex-1 p-3 rounded-lg font-semibold text-sm transition-all ${
                      lengthPreference === length
                        ? getLengthColor(length)
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {getLengthLabel(length)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-600 mt-3">{getLengthDescription(lengthPreference)}</p>
            </div>
              <h2 className="text-xl font-bold text-slate-900">추천 답변</h2>
              {analysisData?.replies?.map((reply: any, index: number) => (
                <div 
                  key={index} 
                  className={`border-2 p-6 transition-all ${
                    reply.tone === "balanced" 
                      ? "border-orange-500 bg-orange-50" 
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  {/* 톤 헤더 */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${
                        reply.tone === "balanced" ? "bg-orange-100" : "bg-slate-100"
                      }`}>
                        <div className={reply.tone === "balanced" ? "text-orange-600" : "text-slate-600"}>
                          {getToneIcon(reply.tone)}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{getToneLabel(reply.tone)}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{getToneEffect(reply.tone)}</p>
                      </div>
                    </div>
                    {recommendation && recommendation.recommendedIndex === index && (
                      <Badge className={`${getConfidenceColor(recommendation.confidence)} text-xs`}>
                        {getConfidenceBadge(recommendation.confidence)}
                      </Badge>
                    )}
                  </div>

                  {/* 답변 내용 */}
                  <div className="space-y-3 mb-4">
                    <div className="bg-white p-3 rounded border border-slate-200">
                      <p className="text-slate-900 font-medium text-sm leading-relaxed">{reply.text}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-600">
                        <span className="font-semibold">💡</span> {reply.why}
                      </p>
                      {reply.risk && (
                        <p className="text-xs text-orange-600">
                          <span className="font-semibold">⚠️</span> {reply.risk}
                        </p>
                      )}
                    </div>

                      {recommendation && recommendation.recommendedIndex === index && (
                        <p className="text-xs text-green-600 font-semibold">
                          ✓ {recommendation.reason}
                        </p>
                      )}
                  </div>

                  {/* 영향 배지 */}
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {reply.tone === "soft" && (
                      <>
                        <Badge className="bg-orange-100 text-orange-700 text-xs font-semibold">호감↑</Badge>
                        <Badge className="bg-blue-100 text-blue-700 text-xs font-semibold">대화지속↑</Badge>
                      </>
                    )}
                    {reply.tone === "balanced" && (
                      <>
                        <Badge className="bg-orange-100 text-orange-700 text-xs font-semibold">호감↑</Badge>
                        <Badge className="bg-pink-100 text-pink-700 text-xs font-semibold">오해↓</Badge>
                        <Badge className="bg-blue-100 text-blue-700 text-xs font-semibold">대화지속↑</Badge>
                      </>
                    )}
                    {reply.tone === "humor" && (
                      <>
                        <Badge className="bg-orange-100 text-orange-700 text-xs font-semibold">호감↑</Badge>
                        <Badge className="bg-green-100 text-green-700 text-xs font-semibold">분위기↑</Badge>
                      </>
                    )}
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        copyToClipboard(reply.text, index);
                        recordToneSelection(reply.tone);
                      }}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 text-sm relative group"
                      title={`Ctrl+${index + 1}로도 복사 가능`}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      복사
                      {/* 단축키 힌트 */}
                      <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Ctrl+{index + 1}
                      </span>
                    </Button>
                    <Button
                      onClick={() => handleRegenerateTone(reply.tone)}
                      variant="outline"
                      disabled={regenerateMutation.isPending || regenerateMutation.isError}
                      className={`border-slate-200 hover:border-orange-500 py-4 ${regenerateMutation.isError ? "opacity-50 cursor-not-allowed" : ""}`}
                      title={regenerateMutation.isError ? "서버 연결 오류. 잠시 후 다시 시도해주세요." : "재생성"}
                    >
                      {regenerateMutation.isPending && selectedTone === reply.tone ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : regenerateMutation.isError ? (
                        <AlertCircle className="h-3 w-3 text-red-500" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* 피드백 */}
            {!feedbackSubmitted && (
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3">도움이 되었나요?</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleSubmitFeedback(1)}
                    disabled={submitFeedbackMutation.isPending}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-4 text-sm"
                  >
                    {submitFeedbackMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Heart className="h-3 w-3 mr-1" />
                        도움됨
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleSubmitFeedback(-1)}
                    disabled={submitFeedbackMutation.isPending}
                    variant="outline"
                    className="flex-1 border-slate-300 text-slate-700 font-semibold py-4 text-sm hover:bg-slate-50"
                  >
                    {submitFeedbackMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Zap className="h-3 w-3 mr-1" />
                        개선필요
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 모바일 1컬럼 레이아웃 (<1024px) */}
        <div className="lg:hidden max-w-2xl mx-auto space-y-6">
          {conversation && (
            <div className="border border-slate-200 p-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{conversation.partnerName}</h1>
              <p className="text-sm text-slate-600">
                {conversation.relationshipType} · {JSON.parse(conversation.goals).join(", ")}
              </p>
            </div>
          )}

          {/* 상대 심리 분석 - 강조 */}
          <div className="border-2 border-orange-500 bg-orange-50 p-6">
            <div className="flex items-start gap-2 mb-3">
              <Zap className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-orange-600">상대방 심리</h2>
              {(analysisData as any).isGroupChat && (
                <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-700 text-xs">
                  단톡 ({(analysisData as any).participantCount}명)
                </Badge>
              )}
            </div>
            <p className="text-lg font-bold text-slate-900 leading-relaxed">{analysisData?.one_line_psychology}</p>
          </div>

          {/* 개인정보 마스킹 알림 */}
          {(analysisData as any).privacyMasking && (analysisData as any).privacyMasking.hasSensitiveInfo && (
            <PrivacyMaskingAlert detectedTypes={(analysisData as any).privacyMasking.detectedTypes} />
          )}

          {/* 맨락 부족 경고 */}
          {analysisData?.need_more_context && (
            <ErrorFeedback
              type="context_needed"
              contextQuestion={analysisData?.context_question}
              onAddContext={() => setContextDialogOpen(true)}
              onUploadNew={() => setLocation(`/conversation/${conversationId}`)}
            />
          )}

          {/* 심리 지표 시각화 */}
          <PsychologyMetricsCard
            metrics={{
              affection: 78,
              anger: 15,
              engagement: 82,
              distance: 25,
              misunderstanding: 12,
              flowScore: 78,
              flowDescription: "분위기 좋음. 다만 질문이 단답이면 흐름 꺾일 수 있음.",
              keywords: {
                affection: "ㅎㅎ/이모지 많음",
                anger: "부정어 적음",
                engagement: "질문 반복",
                distance: "존댓말 유지",
                misunderstanding: "명령형 없음",
              },
            }}
          />

          {/* 재생성된 답변 표시 */}
          {regeneratedReply && (
            <div className="border-2 border-orange-500 bg-orange-50 p-6">
              <h3 className="text-base font-bold text-slate-900 mb-4">
                ✨ 재생성 ({getToneLabel(regeneratedReply.reply.tone)})
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-slate-900 font-medium mb-2 text-sm">{regeneratedReply.reply.text}</p>
                  <p className="text-xs text-slate-600">💡 {regeneratedReply.reply.why}</p>
                  {regeneratedReply.reply.risk && (
                    <p className="text-xs text-orange-600 mt-2">⚠️ {regeneratedReply.reply.risk}</p>
                  )}
                </div>
                <Button
                  onClick={() => copyToClipboard(regeneratedReply.reply.text)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-5"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  복사하기
                </Button>
              </div>
            </div>
          )}

          {/* 답변 3종 */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">추천 답변</h2>
            {analysisData?.replies?.map((reply: any, index: number) => (
              <div 
                key={index} 
                className={`border-2 p-5 transition-all ${
                  reply.tone === "balanced" 
                    ? "border-orange-500 bg-orange-50" 
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                {/* 톤 헤더 */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${
                      reply.tone === "balanced" ? "bg-orange-100" : "bg-slate-100"
                    }`}>
                      <div className={reply.tone === "balanced" ? "text-orange-600" : "text-slate-600"}>
                        {getToneIcon(reply.tone)}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{getToneLabel(reply.tone)}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{getToneEffect(reply.tone)}</p>
                    </div>
                  </div>
                  {reply.tone === "balanced" && (
                    <Badge className="bg-orange-500 text-white text-xs">추천</Badge>
                  )}
                </div>

                {/* 답변 내용 */}
                <div className="space-y-3 mb-4">
                  <div className="bg-white p-3 rounded border border-slate-200">
                    <p className="text-slate-900 font-medium text-sm leading-relaxed">{reply.text}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-600">
                      <span className="font-semibold">💡</span> {reply.why}
                    </p>
                    {reply.risk && (
                      <p className="text-xs text-orange-600">
                        <span className="font-semibold">⚠️</span> {reply.risk}
                      </p>
                    )}
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => copyToClipboard(reply.text)}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 text-sm"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    복사
                  </Button>
                  <Button
                    onClick={() => handleRegenerateTone(reply.tone)}
                    variant="outline"
                    disabled={regenerateMutation.isPending || regenerateMutation.isError}
                    className={`border-slate-200 hover:border-orange-500 py-4 ${regenerateMutation.isError ? "opacity-50 cursor-not-allowed" : ""}`}
                    title={regenerateMutation.isError ? "서버 연결 오류" : "재생성"}
                  >
                    {regenerateMutation.isPending && selectedTone === reply.tone ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : regenerateMutation.isError ? (
                      <AlertCircle className="h-3 w-3 text-red-500" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* 피드백 */}
          {!feedbackSubmitted && (
            <div className="border-t border-slate-200 pt-6 pb-8">
              <h3 className="text-sm font-bold text-slate-900 mb-3">도움이 되었나요?</h3>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSubmitFeedback(1)}
                  disabled={submitFeedbackMutation.isPending}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-5 text-sm"
                >
                  {submitFeedbackMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Heart className="h-3 w-3 mr-1" />
                      도움됨
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleSubmitFeedback(-1)}
                  disabled={submitFeedbackMutation.isPending}
                  variant="outline"
                  className="flex-1 border-slate-300 text-slate-700 font-semibold py-5 text-sm hover:bg-slate-50"
                >
                  {submitFeedbackMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Zap className="h-3 w-3 mr-1" />
                      개선필요
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 맥락 추가 다이얼로그 */}
      <Dialog open={contextDialogOpen} onOpenChange={setContextDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>상황 추가하기</DialogTitle>
            <DialogDescription>
              추가 상황을 입력하면 더 정확한 답변을 제공해드립니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="contextHint">추가 상황</Label>
              <Input
                id="contextHint"
                placeholder="예: 내일 시험이 있어서 바쁜 상황"
                value={contextHint}
                onChange={(e) => setContextHint(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContextDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleAddContext}
              disabled={addContextMutation.isPending || addContextMutation.isError}
              className={`bg-orange-500 hover:bg-orange-600 ${addContextMutation.isError ? "opacity-50 cursor-not-allowed" : ""}`}
              title={addContextMutation.isError ? "서버 연결 오류. 잠시 후 다시 시도해주세요." : ""}
            >
              {addContextMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  재분석 중...
                </>
              ) : addContextMutation.isError ? (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  오류 발생
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  재분석
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
