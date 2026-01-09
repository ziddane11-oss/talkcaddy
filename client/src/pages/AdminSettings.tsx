import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, Mail, Slack } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
interface AuthUser {
  id: number;
  email: string;
  role: "admin" | "user";
  name?: string;
}

/**
 * AdminSettings 페이지
 * 관리자 알림 채널 설정 UI
 */
export function AdminSettings() {
  // tRPC를 통해 현재 사용자 정보 조회
  const { data: user } = trpc.auth.me.useQuery();
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 설정 로드
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // TODO: 서버에서 설정 로드 API 호출
        // const settings = await trpc.admin.getNotificationSettings.useQuery();
        // setEmailEnabled(settings.emailEnabled);
        // setSlackEnabled(settings.slackEnabled);
        // setAdminEmail(settings.adminEmail);
        // setSlackWebhookUrl(settings.slackWebhookUrl);
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };

    loadSettings();
  }, []);

  /**
   * 설정 저장
   */
  const handleSaveSettings = async () => {
    setLoading(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // 유효성 검사
      if (emailEnabled && !adminEmail) {
        setError("이메일을 입력해주세요");
        setLoading(false);
        return;
      }

      if (slackEnabled && !slackWebhookUrl) {
        setError("Slack 웹훅 URL을 입력해주세요");
        setLoading(false);
        return;
      }

      // TODO: 서버에 설정 저장 API 호출
      // await trpc.admin.saveNotificationSettings.useMutation({
      //   emailEnabled,
      //   slackEnabled,
      //   adminEmail,
      //   slackWebhookUrl,
      // });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "설정 저장 실패");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 테스트 알림 전송
   */
  const handleTestNotification = async (channel: "email" | "slack") => {
    setLoading(true);
    setError(null);
    setTestSuccess(false);

    try {
      // TODO: 서버에 테스트 알림 전송 API 호출
      // await trpc.admin.sendTestNotification.useMutation({ channel });

      setTestSuccess(true);
      setTimeout(() => setTestSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "테스트 알림 전송 실패");
    } finally {
      setLoading(false);
    }
  };

  // 로딩 상태
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  // 관리자 권한 확인
  if (user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>관리자만 접근할 수 있습니다</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 헤더 */}
        <div>
          <h1 className="text-3xl font-bold">관리자 설정</h1>
          <p className="text-muted-foreground mt-2">에러 알림 채널을 설정하세요</p>
        </div>

        {/* 성공 메시지 */}
        {saveSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">설정이 저장되었습니다</AlertDescription>
          </Alert>
        )}

        {testSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">테스트 알림이 전송되었습니다</AlertDescription>
          </Alert>
        )}

        {/* 에러 메시지 */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 탭 */}
        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              이메일
            </TabsTrigger>
            <TabsTrigger value="slack" className="flex items-center gap-2">
              <Slack className="h-4 w-4" />
              Slack
            </TabsTrigger>
          </TabsList>

          {/* 이메일 탭 */}
          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>이메일 알림</CardTitle>
                <CardDescription>에러 발생 시 이메일로 알림을 받습니다</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 이메일 활성화 토글 */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-toggle" className="text-base">
                    이메일 알림 활성화
                  </Label>
                  <Switch
                    id="email-toggle"
                    checked={emailEnabled}
                    onCheckedChange={setEmailEnabled}
                  />
                </div>

                {/* 이메일 입력 */}
                {emailEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">관리자 이메일</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@example.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      disabled={loading}
                    />
                    <p className="text-sm text-muted-foreground">
                      에러 알림을 받을 이메일 주소를 입력하세요
                    </p>
                  </div>
                )}

                {/* 버튼 */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSaveSettings}
                    disabled={loading || !emailEnabled}
                    className="flex-1"
                  >
                    {loading ? "저장 중..." : "저장"}
                  </Button>
                  {emailEnabled && (
                    <Button
                      variant="outline"
                      onClick={() => handleTestNotification("email")}
                      disabled={loading || !adminEmail}
                    >
                      테스트 전송
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Slack 탭 */}
          <TabsContent value="slack" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Slack 알림</CardTitle>
                <CardDescription>에러 발생 시 Slack 채널로 알림을 받습니다</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Slack 활성화 토글 */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="slack-toggle" className="text-base">
                    Slack 알림 활성화
                  </Label>
                  <Switch
                    id="slack-toggle"
                    checked={slackEnabled}
                    onCheckedChange={setSlackEnabled}
                  />
                </div>

                {/* Slack 웹훅 URL 입력 */}
                {slackEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="slack-webhook">Slack 웹훅 URL</Label>
                    <Input
                      id="slack-webhook"
                      type="password"
                      placeholder="https://hooks.slack.com/services/..."
                      value={slackWebhookUrl}
                      onChange={(e) => setSlackWebhookUrl(e.target.value)}
                      disabled={loading}
                    />
                    <p className="text-sm text-muted-foreground">
                      Slack 앱에서 Incoming Webhook을 생성하고 URL을 입력하세요
                    </p>
                    <a
                      href="https://api.slack.com/messaging/webhooks"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Slack Webhook 설정 가이드 →
                    </a>
                  </div>
                )}

                {/* 버튼 */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSaveSettings}
                    disabled={loading || !slackEnabled}
                    className="flex-1"
                  >
                    {loading ? "저장 중..." : "저장"}
                  </Button>
                  {slackEnabled && (
                    <Button
                      variant="outline"
                      onClick={() => handleTestNotification("slack")}
                      disabled={loading || !slackWebhookUrl}
                    >
                      테스트 전송
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 설정 가이드 */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">💡 설정 팁</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• 이메일과 Slack 알림을 동시에 활성화할 수 있습니다</p>
            <p>• 테스트 전송으로 설정이 올바른지 확인하세요</p>
            <p>• 심각도가 높은 에러(critical, error)만 알림을 받습니다</p>
            <p>• 알림 재시도는 최대 5회까지 자동으로 진행됩니다</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
