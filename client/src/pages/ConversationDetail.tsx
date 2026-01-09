import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Camera, FileText, History, Loader2, Send, Upload, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import AnalysisProgress from "@/components/AnalysisProgress";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

export default function ConversationDetail() {
  const [, params] = useRoute("/conversation/:id");
  const conversationId = params?.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();

  const [textInput, setTextInput] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAreaRef = useRef<HTMLDivElement>(null);
  const [analysisStep, setAnalysisStep] = useState<"ocr" | "parsing" | "analysis" | "complete" | "error" | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [uploadId, setUploadId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzingMultiple, setIsAnalyzingMultiple] = useState(false);

  // 대화방 정보 조회
  const { data: conversation, isLoading: conversationLoading } = trpc.conversations.get.useQuery(
    { id: conversationId },
    { enabled: conversationId > 0 }
  );

  // 메시지 히스토리 조회
  const { data: history } = trpc.conversations.getHistory.useQuery(
    { conversationId },
    { enabled: conversationId > 0 }
  );

  // 파이프라인 API 뮤테이션
  const createUpload = trpc.pipeline.createUpload.useMutation();
  const runOcr = trpc.pipeline.runOcr.useMutation();
  const ingestOcr = trpc.pipeline.ingestOcr.useMutation();
  const generateReplies = trpc.pipeline.generateReplies.useMutation();

  // 텍스트 분석 뮤테이션 (기존 방식 유지)
  const analyzeText = trpc.analysis.analyzeText.useMutation({
    onSuccess: (data) => {
      setAnalysisStep("complete");
      setTimeout(() => {
        toast.success("분석이 완료되었습니다!");
        setLocation(`/analysis/${conversationId}`);
      }, 500);
    },
    onError: (error) => {
      setAnalysisStep("error");
      setAnalysisError(error.message || "분석 중 오류가 발생했습니다.");
    },
  });

  const processImageFile = (file: File, isMultiple: boolean = false) => {
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (isMultiple) {
        setSelectedImages(prev => [...prev, base64]);
        toast.success(`이미지 ${selectedImages.length + 1}개 선택됨`);
      } else {
        setSelectedImages([base64]);
        setCurrentImageIndex(0);
        toast.success("이미지가 선택되었습니다.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    // 다중 선택 지원
    for (let i = 0; i < files.length; i++) {
      processImageFile(files[i], i > 0);
    }
  };

  // 클립보드 붙여넣기
  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file" && items[i].type.startsWith("image/")) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          processImageFile(file, selectedImages.length > 0);
        }
      }
    }
  };

  // 드래그 앤 드롭
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (!files) return;

    let imageCount = 0;
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith("image/")) {
        processImageFile(files[i], imageCount > 0);
        imageCount++;
      }
    }
    
    if (imageCount === 0) {
      toast.error("이미지 파일을 드롭해주세요.");
    }
  };

  const handleAnalyzeScreenshot = async () => {
    if (selectedImages.length === 0) {
      toast.error("이미지를 선택해주세요.");
      return;
    }

    try {
      setIsAnalyzingMultiple(selectedImages.length > 1);
      
      // 모든 이미지를 순차적으로 분석
      for (let i = 0; i < selectedImages.length; i++) {
        setCurrentImageIndex(i);
        setAnalysisStep("ocr");

        // Step 1: createUpload
        const uploadResult = await createUpload.mutateAsync({
          conversationId,
        });
        setUploadId(uploadResult.uploadId);

        // Step 2: runOcr
        setAnalysisStep("parsing");
        
        // base64 데이터 추출 (안전 검사)
        const base64Parts = selectedImages[i].split(',');
        const imageBase64 = base64Parts.length > 1 ? base64Parts[1] : selectedImages[i];
        
        if (!imageBase64 || imageBase64.length === 0) {
          throw new Error(`이미지 ${i + 1}: 데이터를 처리할 수 없습니다.`);
        }
        
        await runOcr.mutateAsync({ 
          uploadId: uploadResult.uploadId,
          imageBase64
        });

        // Step 3: ingestOcr
        await ingestOcr.mutateAsync({ uploadId: uploadResult.uploadId });

        // Step 4: generateReplies (마지막 이미지만)
        if (i === selectedImages.length - 1) {
          setAnalysisStep("analysis");
          await generateReplies.mutateAsync({ conversationId });
        }
      }

      setAnalysisStep("complete");
      setTimeout(() => {
        toast.success(`${selectedImages.length}개 이미지 분석이 완료되었습니다!`);
        setLocation(`/analysis/${conversationId}`);
      }, 500);
    } catch (error: any) {
      setAnalysisStep("error");
      setAnalysisError(error.message || "분석 중 오류가 발생했습니다.");
    }
  };

  const handleAnalyzeText = () => {
    const trimmedText = textInput.trim();
    
    if (!trimmedText) {
      toast.error("텍스트를 입력해주세요.");
      return;
    }
    
    if (trimmedText.length < 10) {
      toast.error("더 길게 입력해주세요. (최소 10자)");
      return;
    }

    analyzeText.mutate({
      conversationId,
      text: trimmedText,
    });
  };

  // 분석 진행 중 또는 에러 화면
  if (analysisStep && analysisStep !== "complete") {
    return (
      <AnalysisProgress 
        currentStep={analysisStep}
        errorMessage={analysisError}
        onRetry={() => {
          if (retryCount < 3) {
            setAnalysisStep(null);
            setAnalysisError(null);
            setRetryCount(retryCount + 1);
          } else {
            toast.error("재시도 횟수를 초과했습니다. 다른 스크린샷을 올려주세요.");
          }
        }}
        onUploadNew={() => {
          setAnalysisStep(null);
          setAnalysisError(null);
          setSelectedImages([]);
          setCurrentImageIndex(0);
          setRetryCount(0);
        }}
      />
    );
  }

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
      {/* 헤더 - 모든 화면에서 표시 */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            대화방 목록
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/conversation/${conversationId}/history`)}
            className="border-slate-200 hover:border-orange-500"
          >
            <History className="h-4 w-4 mr-2" />
            히스토리
          </Button>
        </div>
      </div>

      {/* 메인 콘텐츠 - 반응형 레이아웃 */}
      <div className="container mx-auto px-4 py-8">
        {/* 데스크탑 2컬럼 레이아웃 (>=1024px) */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-8">
          {/* 좌측: 입력 영역 */}
          <div className="space-y-6">
            {/* 프로필 */}
            <div className="border border-slate-200 p-6">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{conversation.partnerName}</h1>
              <p className="text-sm text-slate-600">
                {conversation.relationshipType} · 목표: {goals.slice(0, 2).join(", ")}{goals.length > 2 && ` 외 ${goals.length - 2}개`}
                {restrictions.length > 0 && ` · 금지: ${restrictions.slice(0, 2).join(", ")}${restrictions.length > 2 ? ` 외 ${restrictions.length - 2}개` : ""}`}
              </p>
              {conversation.contextSummary && (
                <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                  <span className="font-semibold text-slate-700">최근 상황:</span> {conversation.contextSummary}
                </p>
              )}
            </div>

            {/* 탭 - 입력 */}
            <Tabs defaultValue="screenshot" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1">
                <TabsTrigger value="screenshot" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  <Camera className="h-4 w-4 mr-2" />
                  스크린샷
                </TabsTrigger>
                <TabsTrigger value="text" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  <FileText className="h-4 w-4 mr-2" />
                  텍스트
                </TabsTrigger>
              </TabsList>

              <TabsContent value="screenshot" className="space-y-4 mt-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">스크린샷 업로드</h3>
                  <p className="text-sm text-slate-600">
                    카톡 대화를 캡처하여 업로드하세요.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <div
                  ref={uploadAreaRef}
                  onPaste={handlePaste}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  tabIndex={0}
                  className={`w-full h-32 border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    isDragging
                      ? "border-orange-500 bg-orange-50"
                      : "border-slate-300 hover:border-orange-500 bg-white"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className={`h-8 w-8 ${
                    isDragging ? "text-orange-500" : "text-slate-400"
                  }`} />
                  <div className="text-center">
                    <p className="text-xs font-medium text-slate-900">
                      {selectedImages.length > 0 ? `${selectedImages.length}개 선택됨` : "클릭 또는 드래그"}
                    </p>
                    <p className="text-xs text-slate-500">Ctrl+V 붙여넣기</p>
                  </div>
                </div>

                {selectedImages.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{currentImageIndex + 1} / {selectedImages.length}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedImages(selectedImages.filter((_, i) => i !== currentImageIndex));
                          setCurrentImageIndex(Math.max(0, currentImageIndex - 1));
                        }}
                        className="text-red-500 hover:text-red-600 h-6 px-2"
                      >
                        제거
                      </Button>
                    </div>
                    <div className="border border-slate-200 p-1 max-h-40 overflow-hidden">
                      <img
                        src={selectedImages[currentImageIndex]}
                        alt={`Screenshot ${currentImageIndex + 1}`}
                        className="w-full h-auto"
                      />
                    </div>
                    {selectedImages.length > 1 && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                          disabled={currentImageIndex === 0}
                          className="flex-1 h-8"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentImageIndex(Math.min(selectedImages.length - 1, currentImageIndex + 1))}
                          disabled={currentImageIndex === selectedImages.length - 1}
                          className="flex-1 h-8"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  onClick={handleAnalyzeScreenshot}
                  disabled={selectedImages.length === 0 || createUpload.isPending || runOcr.isPending || ingestOcr.isPending || generateReplies.isPending}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-5"
                >
                  {createUpload.isPending || runOcr.isPending || ingestOcr.isPending || generateReplies.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      분석 중...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      분석 시작
                    </>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="text" className="space-y-4 mt-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">텍스트 입력</h3>
                  <p className="text-sm text-slate-600">
                    대화 내용을 직접 입력하세요.
                  </p>
                </div>

                <Textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="대화 내용을 입력하세요..."
                  className="min-h-[120px] border-slate-200 focus:border-orange-500 text-sm"
                />
                <Button
                  onClick={handleAnalyzeText}
                  disabled={!textInput.trim() || analyzeText.isPending}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-5"
                >
                  {analyzeText.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      분석 중...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      분석 시작
                    </>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </div>

          {/* 우측: 결과 미리보기 영역 (선택사항) */}
          <div className="border border-slate-200 p-6 bg-slate-50 rounded-lg">
            <div className="text-center text-slate-600">
              <p className="text-sm">분석 결과가 여기에 표시됩니다</p>
              <p className="text-xs text-slate-500 mt-2">좌측에서 입력 후 분석을 시작하세요</p>
            </div>
          </div>
        </div>

        {/* 모바일 1컬럼 레이아웃 (<1024px) */}
        <div className="lg:hidden max-w-2xl mx-auto space-y-6">
          {/* 프로필 */}
          <div className="border border-slate-200 p-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{conversation.partnerName}</h1>
            <p className="text-sm text-slate-600">
              {conversation.relationshipType} · 목표: {goals.slice(0, 2).join(", ")}{goals.length > 2 && ` 외 ${goals.length - 2}개`}
            </p>
            {conversation.contextSummary && (
              <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                <span className="font-semibold text-slate-700">최근:</span> {conversation.contextSummary}
              </p>
            )}
          </div>

          {/* 탭 - 입력 */}
          <Tabs defaultValue="screenshot" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1">
              <TabsTrigger value="screenshot" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-sm">
                <Camera className="h-4 w-4 mr-1" />
                스크린샷
              </TabsTrigger>
              <TabsTrigger value="text" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-sm">
                <FileText className="h-4 w-4 mr-1" />
                텍스트
              </TabsTrigger>
            </TabsList>

            <TabsContent value="screenshot" className="space-y-4 mt-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">스크린샷 업로드</h3>
                <p className="text-sm text-slate-600">
                  카톡 대화를 캡처하여 업로드하세요.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <div
                ref={uploadAreaRef}
                onPaste={handlePaste}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                tabIndex={0}
                className={`w-full h-32 border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  isDragging
                    ? "border-orange-500 bg-orange-50"
                    : "border-slate-300 hover:border-orange-500 bg-white"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className={`h-8 w-8 ${
                  isDragging ? "text-orange-500" : "text-slate-400"
                }`} />
                <div className="text-center">
                  <p className="text-xs font-medium text-slate-900">
                    {selectedImages.length > 0 ? `${selectedImages.length}개 선택됨` : "클릭 또는 드래그"}
                  </p>
                  <p className="text-xs text-slate-500">Ctrl+V 붙여넣기</p>
                </div>
              </div>

              {selectedImages.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{currentImageIndex + 1} / {selectedImages.length}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedImages(selectedImages.filter((_, i) => i !== currentImageIndex));
                        setCurrentImageIndex(Math.max(0, currentImageIndex - 1));
                      }}
                      className="text-red-500 hover:text-red-600 h-6 px-2"
                    >
                      제거
                    </Button>
                  </div>
                  <div className="border border-slate-200 p-1">
                    <img
                      src={selectedImages[currentImageIndex]}
                      alt={`Screenshot ${currentImageIndex + 1}`}
                      className="w-full h-auto"
                    />
                  </div>
                  {selectedImages.length > 1 && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                        disabled={currentImageIndex === 0}
                        className="flex-1 h-8"
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentImageIndex(Math.min(selectedImages.length - 1, currentImageIndex + 1))}
                        disabled={currentImageIndex === selectedImages.length - 1}
                        className="flex-1 h-8"
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={handleAnalyzeScreenshot}
                disabled={selectedImages.length === 0 || createUpload.isPending || runOcr.isPending || ingestOcr.isPending || generateReplies.isPending}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-5"
              >
                {createUpload.isPending || runOcr.isPending || ingestOcr.isPending || generateReplies.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    분석 중...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    분석 시작
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="text" className="space-y-4 mt-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">텍스트 입력</h3>
                <p className="text-sm text-slate-600">
                  대화 내용을 직접 입력하세요.
                </p>
              </div>

              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="대화 내용을 입력하세요..."
                className="min-h-[120px] border-slate-200 focus:border-orange-500 text-sm"
              />
              <Button
                onClick={handleAnalyzeText}
                disabled={!textInput.trim() || analyzeText.isPending}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-5"
              >
                {analyzeText.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    분석 중...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    분석 시작
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 모바일 고정 바 (하단) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
        <p className="text-xs text-slate-500 text-center">
          분석 결과는 다음 화면에서 확인하세요
        </p>
      </div>

      {/* 모바일에서 고정 바 공간 확보 */}
      <div className="lg:hidden h-16" />
    </div>
  );
}
