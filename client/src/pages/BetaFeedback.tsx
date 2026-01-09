import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * 베타 테스트 피드백 페이지
 */
export function BetaFeedback() {
  const [feedbackType, setFeedbackType] = useState<"feature" | "bug" | "usability">("feature");
  const [rating, setRating] = useState<number>(5);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deviceInfo, setDeviceInfo] = useState("");
  const [reproducible, setReproducible] = useState(false);
  const [reproductionSteps, setReproductionSteps] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 피드백 제출
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 유효성 검사
      if (!title.trim()) {
        setError("제목을 입력해주세요");
        setLoading(false);
        return;
      }

      if (!description.trim()) {
        setError("상세 내용을 입력해주세요");
        setLoading(false);
        return;
      }

      // TODO: 서버에 피드백 전송
      // const formData = new FormData();
      // formData.append("feedbackType", feedbackType);
      // formData.append("rating", rating.toString());
      // formData.append("title", title);
      // formData.append("description", description);
      // formData.append("deviceInfo", deviceInfo);
      // formData.append("reproducible", reproducible.toString());
      // formData.append("reproductionSteps", reproductionSteps);
      // if (screenshot) {
      //   formData.append("screenshot", screenshot);
      // }

      // await trpc.beta.submitFeedback.useMutation(formData);

      setSubmitted(true);
      setTimeout(() => {
        // 폼 초기화
        setTitle("");
        setDescription("");
        setDeviceInfo("");
        setReproducible(false);
        setReproductionSteps("");
        setScreenshot(null);
        setRating(5);
        setSubmitted(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "피드백 제출 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 헤더 */}
        <div>
          <h1 className="text-3xl font-bold">베타 테스트 피드백</h1>
          <p className="text-muted-foreground mt-2">
            톡캐디를 더 좋은 앱으로 만드는 데 도움을 주세요
          </p>
        </div>

        {/* 성공 메시지 */}
        {submitted && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              피드백이 성공적으로 제출되었습니다. 감사합니다! 🙏
            </AlertDescription>
          </Alert>
        )}

        {/* 에러 메시지 */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 피드백 폼 */}
        <Card>
          <CardHeader>
            <CardTitle>피드백 작성</CardTitle>
            <CardDescription>
              버그, 기능 제안, 사용성 개선 등 모든 피드백을 환영합니다
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 피드백 유형 */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">피드백 유형</Label>
                <RadioGroup value={feedbackType} onValueChange={(value: any) => setFeedbackType(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="feature" id="feature" />
                    <Label htmlFor="feature" className="font-normal cursor-pointer">
                      기능 피드백 (좋았던 점, 개선 아이디어)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bug" id="bug" />
                    <Label htmlFor="bug" className="font-normal cursor-pointer">
                      버그 리포트 (앱이 정상 작동하지 않음)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="usability" id="usability" />
                    <Label htmlFor="usability" className="font-normal cursor-pointer">
                      사용성 피드백 (UI/UX 개선)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* 평점 (기능/사용성 피드백만) */}
              {(feedbackType === "feature" || feedbackType === "usability") && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">평점</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`text-3xl transition-transform ${
                          star <= rating ? "text-yellow-400 scale-110" : "text-gray-300"
                        }`}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {rating === 5 && "매우 만족합니다"}
                    {rating === 4 && "만족합니다"}
                    {rating === 3 && "보통입니다"}
                    {rating === 2 && "불만족합니다"}
                    {rating === 1 && "매우 불만족합니다"}
                  </p>
                </div>
              )}

              {/* 제목 */}
              <div className="space-y-2">
                <Label htmlFor="title">제목 *</Label>
                <Input
                  id="title"
                  placeholder={
                    feedbackType === "bug"
                      ? "예: 스크린샷 업로드 시 에러 발생"
                      : "예: 어두운 모드 추가 요청"
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* 상세 내용 */}
              <div className="space-y-2">
                <Label htmlFor="description">상세 내용 *</Label>
                <Textarea
                  id="description"
                  placeholder={
                    feedbackType === "bug"
                      ? "버그가 어떻게 발생했는지 자세히 설명해주세요"
                      : "피드백의 구체적인 내용을 작성해주세요"
                  }
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* 버그 리포트 추가 정보 */}
              {feedbackType === "bug" && (
                <>
                  {/* 기기 정보 */}
                  <div className="space-y-2">
                    <Label htmlFor="device">기기 정보</Label>
                    <Input
                      id="device"
                      placeholder="예: iPhone 15 Pro, iOS 17.2"
                      value={deviceInfo}
                      onChange={(e) => setDeviceInfo(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  {/* 재현 가능 여부 */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="reproducible"
                      checked={reproducible}
                      onCheckedChange={(checked) => setReproducible(checked as boolean)}
                      disabled={loading}
                    />
                    <Label htmlFor="reproducible" className="font-normal cursor-pointer">
                      버그를 다시 재현할 수 있습니다
                    </Label>
                  </div>

                  {/* 재현 단계 */}
                  {reproducible && (
                    <div className="space-y-2">
                      <Label htmlFor="steps">재현 단계</Label>
                      <Textarea
                        id="steps"
                        placeholder={`1. 앱을 실행합니다\n2. 스크린샷을 선택합니다\n3. 업로드 버튼을 클릭합니다\n4. 에러가 발생합니다`}
                        rows={4}
                        value={reproductionSteps}
                        onChange={(e) => setReproductionSteps(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  )}

                  {/* 스크린샷 업로드 */}
                  <div className="space-y-2">
                    <Label htmlFor="screenshot">스크린샷 (선택사항)</Label>
                    <Input
                      id="screenshot"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                      disabled={loading}
                    />
                    <p className="text-sm text-muted-foreground">
                      최대 5MB, PNG/JPG 형식
                    </p>
                  </div>
                </>
              )}

              {/* 제출 버튼 */}
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "제출 중..." : "피드백 제출"}
                </Button>
              </div>

              {/* 안내 메시지 */}
              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                💡 <strong>팁:</strong> 구체적이고 상세한 피드백일수록 더 빠르게 개선될 수 있습니다
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 추가 정보 */}
        <Card className="bg-muted">
          <CardHeader>
            <CardTitle className="text-base">다른 방법으로 피드백 보내기</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>이메일:</strong> <code className="bg-background px-2 py-1 rounded">beta@talkcaddy.com</code>
            </p>
            <p>
              <strong>카톡:</strong> 베타 테스트 전용 채팅방에서 실시간 피드백
            </p>
            <p>
              <strong>긴급 버그:</strong> <code className="bg-background px-2 py-1 rounded">urgent@talkcaddy.com</code>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
