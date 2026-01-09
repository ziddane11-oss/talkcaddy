import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Camera, ChevronDown, ChevronUp, Edit, FileText, Loader2, Trash2, Eye } from "lucide-react";
import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * ChatGPT 검토사항: 대화방 히스토리 페이지
 * - 업로드 타임라인 표시
 * - OCR 텍스트 접기/펼치기
 * - 프로필 수정 버튼
 */
export default function ConversationHistory() {
  const [, params] = useRoute("/conversation/:id/history");
  const conversationId = params?.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const [expandedUploads, setExpandedUploads] = useState<Set<number>>(new Set());
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // 대화방 정보 조회
  const { data: conversation, isLoading: conversationLoading, refetch: refetchConversation } = trpc.conversations.get.useQuery(
    { id: conversationId },
    { enabled: conversationId > 0 }
  );

  // 업로드 히스토리 조회
  const { data: uploads, isLoading: uploadsLoading } = trpc.pipeline.getUploadStatus.useQuery(
    { uploadId: conversationId }, // TODO: getUploadsByConversationId API 필요
    { enabled: false } // 임시로 비활성화
  );

  // 메시지 히스토리 조회 (기존 방식)
  const { data: history } = trpc.conversations.getHistory.useQuery(
    { conversationId },
    { enabled: conversationId > 0 }
  );

  // 프로필 수정 상태
  const [editForm, setEditForm] = useState({
    partnerName: "",
    relationshipType: "썸" as "썸" | "연애" | "재회" | "직장" | "거래" | "기타",
    goals: [] as string[],
    restrictions: [] as string[],
    noLongMessage: false,
    noEmotional: false,
    forcePolite: false,
  });

  // 프로필 수정 뮤테이션
  const updateProfile = trpc.conversations.update.useMutation({
    onSuccess: () => {
      toast.success("프로필이 업데이트되었습니다!");
      setIsEditDialogOpen(false);
      refetchConversation();
    },
    onError: (error) => {
      toast.error("프로필 업데이트 실패: " + error.message);
    },
  });

  // 접기/펼치기 토글
  const toggleExpand = (uploadId: number) => {
    const newExpanded = new Set(expandedUploads);
    if (newExpanded.has(uploadId)) {
      newExpanded.delete(uploadId);
    } else {
      newExpanded.add(uploadId);
    }
    setExpandedUploads(newExpanded);
  };

  // 프로필 수정 다이얼로그 열기
  const openEditDialog = () => {
    if (conversation) {
      const goals = JSON.parse(conversation.goals);
      const restrictions = conversation.restrictions ? JSON.parse(conversation.restrictions) : [];
      setEditForm({
        partnerName: conversation.partnerName,
        relationshipType: conversation.relationshipType as any,
        goals,
        restrictions,
        noLongMessage: (conversation as any).noLongMessage ?? false,
        noEmotional: (conversation as any).noEmotional ?? false,
        forcePolite: (conversation as any).forcePolite ?? false,
      });
      setIsEditDialogOpen(true);
    }
  };

  // 프로필 수정 제출
  const handleUpdateProfile = () => {
    updateProfile.mutate({
      id: conversationId,
      partnerName: editForm.partnerName,
      relationshipType: editForm.relationshipType,
      goals: editForm.goals,
      restrictions: editForm.restrictions,
      noLongMessage: editForm.noLongMessage,
      noEmotional: editForm.noEmotional,
      forcePolite: editForm.forcePolite,
    } as any);
  };

  // 메모리 초기화 핸들러
  const handleClearMemory = () => {
    if (confirm("대화 메모리를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      // TODO: API 연결 필요
      toast.info("메모리 초기화 기능은 곧 추가됩니다.");
    }
  };

  if (conversationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="border border-slate-200 p-8 text-center">
          <p className="text-slate-600 mb-4">대화방을 찾을 수 없습니다.</p>
          <Button onClick={() => setLocation("/")} className="bg-orange-500 hover:bg-orange-600">
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const goals = JSON.parse(conversation.goals);
  const restrictions = conversation.restrictions ? JSON.parse(conversation.restrictions) : [];

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
          <Button
            variant="ghost"
            onClick={() => setLocation(`/conversation/${conversationId}`)}
            className="text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            대화방으로 돌아가기
          </Button>
          <Button
            variant="outline"
            onClick={handleClearMemory}
            className="border-slate-200 hover:border-orange-500"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            메모리 초기화
          </Button>
        </div>

        {/* 프로필 */}
        <div className="border border-slate-200 p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{conversation.partnerName}</h1>
              <p className="text-sm text-slate-600">
                {conversation.relationshipType} · 목표: {goals.join(", ")}
                {restrictions.length > 0 && ` · 금지: ${restrictions.join(", ")}`}
              </p>
            </div>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={openEditDialog} className="border-slate-200 hover:border-orange-500">
                  <Edit className="h-4 w-4 mr-2" />
                  프로필 수정
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>프로필 수정</DialogTitle>
                  <DialogDescription>
                    대화방 프로필을 수정합니다. 변경사항은 다음 분석부터 반영됩니다.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>상대방 이름</Label>
                    <Input
                      value={editForm.partnerName}
                      onChange={(e) => setEditForm({ ...editForm, partnerName: e.target.value })}
                      placeholder="예: 민지"
                    />
                  </div>
                  <div>
                    <Label>관계 유형</Label>
                    <Select
                      value={editForm.relationshipType}
                      onValueChange={(value: any) => setEditForm({ ...editForm, relationshipType: value })}
                    >
                      <SelectTrigger>
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
                  <div>
                    <Label>목표 (쉼표로 구분)</Label>
                    <Input
                      value={editForm.goals.join(", ")}
                      onChange={(e) => setEditForm({ ...editForm, goals: e.target.value.split(",").map(g => g.trim()).filter(Boolean) })}
                      placeholder="예: 관계 유지, 감정 소모 최소"
                    />
                  </div>
                  <div>
                    <Label>금지 옵션 (쉴표로 구분, 선택사항)</Label>
                    <Input
                      value={editForm.restrictions.join(", ")}
                      onChange={(e) => setEditForm({ ...editForm, restrictions: e.target.value.split(",").map(r => r.trim()).filter(Boolean) })}
                      placeholder="예: 장문, 들이대기"
                    />
                  </div>
                  
                  {/* 스타일 제약 설정 */}
                  <div className="border-t pt-4 mt-4">
                    <Label className="text-sm font-semibold mb-3 block">답변 스타일 제약</Label>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="noLongMessage"
                          checked={editForm.noLongMessage}
                          onCheckedChange={(checked) => setEditForm({ ...editForm, noLongMessage: !!checked })}
                        />
                        <label htmlFor="noLongMessage" className="text-sm text-slate-600 cursor-pointer">
                          장문 금지 (최대 80자)
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="noEmotional"
                          checked={editForm.noEmotional}
                          onCheckedChange={(checked) => setEditForm({ ...editForm, noEmotional: !!checked })}
                        />
                        <label htmlFor="noEmotional" className="text-sm text-slate-600 cursor-pointer">
                          감정 과다 금지 (이모지, 감탄사 제거)
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="forcePolite"
                          checked={editForm.forcePolite}
                          onCheckedChange={(checked) => setEditForm({ ...editForm, forcePolite: !!checked })}
                        />
                        <label htmlFor="forcePolite" className="text-sm text-slate-600 cursor-pointer">
                          존댓말 강제 (반말 → 존댓말)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    취소
                  </Button>
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={updateProfile.isPending}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    {updateProfile.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      "저장"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* 업로드 히스토리 */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">업로드 히스토리</h2>
          
          {history && history.length > 0 ? (
            <div className="space-y-4">
              {history.map((item: any, index: number) => (
                <div key={index} className="border border-slate-200 p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {item.type === "screenshot" ? (
                        <Camera className="h-5 w-5 text-slate-400" />
                      ) : (
                        <FileText className="h-5 w-5 text-slate-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {item.type === "screenshot" ? "스크린샷 업로드" : "텍스트 입력"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(item.createdAt).toLocaleString("ko-KR")}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="text-slate-400 hover:text-slate-900"
                    >
                      {expandedUploads.has(item.id) ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {expandedUploads.has(item.id) && item.ocrText && (
                    <div className="mt-4 p-4 bg-slate-50 border border-slate-200">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {item.ocrText}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-slate-300 p-12 text-center">
              <p className="text-slate-600">아직 업로드 기록이 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
