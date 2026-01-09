import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);

  // 대화방 목록 조회
  const { data: conversations, isLoading: conversationsLoading, refetch } = trpc.conversations.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // 대화방 생성 폼 상태
  const [partnerName, setPartnerName] = useState("");
  const [relationshipType, setRelationshipType] = useState<"썸" | "연애" | "재회" | "직장" | "거래" | "기타">("썸");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>([]);

  const goalOptions = ["약속 잡기", "분위기 유지", "사과", "선 긋기", "감정 확인"];
  const restrictionOptions = ["장문", "들이대기", "감정 과다"];

  // 대화방 생성 뮤테이션
  const createConversation = trpc.conversations.create.useMutation({
    onSuccess: (data) => {
      toast.success("대화방이 생성되었습니다!");
      setDialogOpen(false);
      refetch();
      setLocation(`/conversation/${data.id}`);
    },
    onError: (error) => {
      toast.error("대화방 생성 실패: " + error.message);
    },
  });

  const handleCreateConversation = () => {
    if (!partnerName.trim()) {
      toast.error("상대방 이름을 입력해주세요.");
      return;
    }
    if (selectedGoals.length === 0) {
      toast.error("최소 1개의 목표를 선택해주세요.");
      return;
    }

    createConversation.mutate({
      partnerName,
      relationshipType,
      goals: selectedGoals,
      restrictions: selectedRestrictions,
    });
  };

  const handleQuickStart = () => {
    if (!partnerName.trim()) {
      toast.error("상대방 이름을 입력해주세요.");
      return;
    }

    createConversation.mutate({
      partnerName,
      relationshipType: "썸",
      goals: ["분위기 유지"],
      restrictions: [],
    });
  };

  const toggleGoal = (goal: string) => {
    setSelectedGoals(prev =>
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  const toggleRestriction = (restriction: string) => {
    setSelectedRestrictions(prev =>
      prev.includes(restriction) ? prev.filter(r => r !== restriction) : [...prev, restriction]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <div className="max-w-lg w-full space-y-12">
          <div className="space-y-4">
            <h1 className="text-6xl font-bold text-slate-900">톡캐디</h1>
            <p className="text-xl text-slate-600">카톡 대화, 스크린샷 한 장이면 답장 끝</p>
          </div>
          
          <div className="border border-slate-200 p-8 space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">AI 대화 코치</h2>
            <p className="text-slate-600 leading-relaxed">
              상대방의 심리를 분석하고, 상황에 맞는 적절한 답변을 제시해드립니다.
            </p>
            
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex gap-3">
                <span className="text-orange-500 font-semibold">01</span>
                <span>카톡 스크린샷 업로드 또는 텍스트 입력</span>
              </div>
              <div className="flex gap-3">
                <span className="text-orange-500 font-semibold">02</span>
                <span>AI가 상대 심리 분석 및 답변 3종 제시</span>
              </div>
              <div className="flex gap-3">
                <span className="text-orange-500 font-semibold">03</span>
                <span>톤별 답변 선택 및 복사</span>
              </div>
            </div>
            
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
              onClick={() => window.location.href = getLoginUrl()}
            >
              시작하기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto py-8 px-4">
        {/* 헤더 - 미니멀 */}
        <div className="flex items-center justify-between mb-12 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">톡캐디</h1>
            <p className="text-slate-600 mt-1">{user?.name}님</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                <Plus className="h-4 w-4 mr-2" />
                새 대화방
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>새 대화방 만들기</DialogTitle>
                <DialogDescription>
                  상대방과의 관계 정보를 입력하면 더 정확한 답변을 제공해드립니다.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="partnerName">상대방 이름 또는 별칭</Label>
                  <Input
                    id="partnerName"
                    placeholder="예: 민수, 회사 선배"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="relationshipType">관계 유형</Label>
                  <Select value={relationshipType} onValueChange={(value: any) => setRelationshipType(value)}>
                    <SelectTrigger id="relationshipType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="썸">썸</SelectItem>
                      <SelectItem value="연애">연애</SelectItem>
                      <SelectItem value="재회">재회</SelectItem>
                      <SelectItem value="직장">직장</SelectItem>
                      <SelectItem value="거래">거래</SelectItem>
                      <SelectItem value="기타">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>목표 (복수 선택 가능)</Label>
                  <div className="space-y-2">
                    {goalOptions.map((goal) => (
                      <div key={goal} className="flex items-center space-x-2">
                        <Checkbox
                          id={`goal-${goal}`}
                          checked={selectedGoals.includes(goal)}
                          onCheckedChange={() => toggleGoal(goal)}
                        />
                        <label
                          htmlFor={`goal-${goal}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {goal}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>금지 옵션 (선택 사항)</Label>
                  <div className="space-y-2">
                    {restrictionOptions.map((restriction) => (
                      <div key={restriction} className="flex items-center space-x-2">
                        <Checkbox
                          id={`restriction-${restriction}`}
                          checked={selectedRestrictions.includes(restriction)}
                          onCheckedChange={() => toggleRestriction(restriction)}
                        />
                        <label
                          htmlFor={`restriction-${restriction}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {restriction}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleQuickStart}
                  disabled={createConversation.isPending || !partnerName.trim()}
                  className="flex-1"
                >
                  {createConversation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      빠른 시작
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateConversation}
                  disabled={createConversation.isPending}
                  className="bg-orange-500 hover:bg-orange-600 flex-1"
                >
                  {createConversation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    "상세 설정하고 시작"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* 대화방 목록 - 얇은 보더, 텍스트 중심 */}
        {conversationsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : conversations && conversations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="border border-slate-200 p-6 cursor-pointer hover:border-orange-500 transition-colors"
                onClick={() => setLocation(`/conversation/${conv.id}`)}
              >
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-slate-900">{conv.partnerName}</h3>
                  <p className="text-sm text-slate-600">
                    {(() => {
                      const goals = JSON.parse(conv.goals);
                      return `${conv.relationshipType} · ${goals.slice(0, 2).join(", ")}${goals.length > 2 ? ` 외 ${goals.length - 2}개` : ""}`;
                    })()}
                  </p>
                  {conv.contextSummary && (
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{conv.contextSummary}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-slate-300 p-12 text-center">
            <p className="text-slate-600 mb-6">아직 대화방이 없습니다.</p>
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              첫 대화방 만들기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
