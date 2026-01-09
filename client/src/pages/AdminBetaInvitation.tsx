import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle, AlertCircle, QrCode } from "lucide-react";

/**
 * 관리자용 베타 테스터 초대 링크 생성 페이지
 * 이메일 입력 → 임시 비밀번호 + 초대 링크 자동 생성
 * 카톡/인스타 DM용 메시지 템플릿 제공
 */

interface GeneratedInvitation {
  email: string;
  tempPassword: string;
  invitationLink: string;
  token: string;
}

export default function AdminBetaInvitation() {
  const [email, setEmail] = useState("");
  const [generated, setGenerated] = useState<GeneratedInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const inviteMutation = trpc.beta.inviteTester.useMutation();

  const handleGenerateLink = async () => {
    if (!email.trim()) {
      alert("이메일을 입력하세요");
      return;
    }

    setIsLoading(true);
    try {
      console.log('[AdminBetaInvitation] inviteMutation 시작', { email });
      const result = await inviteMutation.mutateAsync({ email });
      console.log('[AdminBetaInvitation] inviteMutation 성공', { result });
      
      // 서버에서 반환한 정보 사용
      setGenerated({
        email: result.email,
        tempPassword: result.tempPassword,
        invitationLink: result.invitationLink,
        token: result.token,
      });

      // 성공 메시지 제거 (mutation 응답 처리로 충분)
    } catch (error) {
      console.error('[AdminBetaInvitation] inviteMutation 실패', { error });
      alert(`오류 발생: ${error instanceof Error ? error.message : "초대 링크 생성 실패"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} 복사됨`);
  };

  // 메시지 템플릿
  const getKakaoTemplate = () => {
    if (!generated) return "";
    return `톡캐디 베타 테스트 초대

이메일: ${generated.email}
임시 비밀번호: ${generated.tempPassword}

아래 링크에서 베타 테스트를 시작하세요:
${generated.invitationLink}

첫 로그인 후 비밀번호를 변경해주세요!`;
  };

  const getInstagramTemplate = () => {
    if (!generated) return "";
    return `🎉 톡캐디 베타 테스트 초대

이메일: ${generated.email}
임시 비밀번호: ${generated.tempPassword}

링크: ${generated.invitationLink}

첫 로그인 후 비밀번호 변경 필수!`;
  };

  const getAllInfoTemplate = () => {
    if (!generated) return "";
    return `이메일: ${generated.email}
임시 비밀번호: ${generated.tempPassword}
초대 링크: ${generated.invitationLink}`;
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">베타 테스터 초대</h1>
          <p className="text-gray-600">지인에게 초대 링크를 생성하고 공유하세요</p>
        </div>

        {/* 초대 링크 생성 폼 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>1단계: 초대 링크 생성</CardTitle>
            <CardDescription>베타 테스터의 이메일을 입력하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleGenerateLink()}
                disabled={isLoading}
              />
              <Button
                onClick={handleGenerateLink}
                disabled={isLoading || !email.trim()}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isLoading ? "생성 중..." : "링크 생성"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 생성된 정보 표시 */}
        {generated && (
          <>
            <Card className="mb-8 border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-orange-500" />
                  2단계: 생성된 정보
                </CardTitle>
                <CardDescription>아래 정보를 복사하여 공유하세요</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 이메일 */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">이메일</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 font-mono text-sm">
                      {generated.email}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generated.email, "이메일")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* 임시 비밀번호 */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">임시 비밀번호</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 font-mono text-sm">
                      {generated.tempPassword}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generated.tempPassword, "임시 비밀번호")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* 초대 링크 */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">초대 링크</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 font-mono text-sm break-all">
                      {generated.invitationLink}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generated.invitationLink, "초대 링크")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* 전체 정보 한 번에 복사 */}
                <div className="pt-4 border-t">
                  <Button
                    onClick={() => copyToClipboard(getAllInfoTemplate(), "전체 정보")}
                    className="w-full bg-orange-500 hover:bg-orange-600"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    전체 정보 한 번에 복사
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 메시지 템플릿 */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  3단계: 메시지 템플릿 선택
                </CardTitle>
                <CardDescription>아래 템플릿을 복사하여 카톡/인스타 DM으로 전달하세요</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 카톡 템플릿 */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">📱 카톡 DM 템플릿</h3>
                    <Badge variant="outline">추천</Badge>
                  </div>
                  <div className="bg-white border border-gray-300 rounded p-3 mb-3 text-sm whitespace-pre-wrap font-mono">
                    {getKakaoTemplate()}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => copyToClipboard(getKakaoTemplate(), "카톡 템플릿")}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    카톡 템플릿 복사
                  </Button>
                </div>

                {/* 인스타 템플릿 */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">📸 인스타 DM 템플릿</h3>
                  </div>
                  <div className="bg-white border border-gray-300 rounded p-3 mb-3 text-sm whitespace-pre-wrap font-mono">
                    {getInstagramTemplate()}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => copyToClipboard(getInstagramTemplate(), "인스타 템플릿")}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    인스타 템플릿 복사
                  </Button>
                </div>

                {/* QR 코드 (선택) */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">
                      <QrCode className="w-4 h-4 inline mr-2" />
                      QR 코드 (선택)
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    QR 코드로도 공유할 수 있습니다. 아래 버튼을 클릭하면 QR 코드가 생성됩니다.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    QR 코드 생성 (준비 중)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 안내 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">📌 공유 시 주의사항</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>✓ 임시 비밀번호는 첫 로그인 후 반드시 변경해야 합니다</p>
                <p>✓ 초대 링크는 7일 동안 유효합니다</p>
                <p>✓ 카톡/인스타 DM으로 직접 전달하세요</p>
                <p>✓ 초대 링크를 공개적으로 공유하지 마세요</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
