import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, AlertCircle, Loader } from "lucide-react";

/**
 * 베타 테스터 초대 링크 수락 페이지
 * 토큰 검증 → 임시 비밀번호 입력 → 회원가입/로그인
 */

export default function BetaAccept() {
  const [, params] = useRoute("/beta/accept/:token");
  const [, setLocation] = useLocation();
  
  const token = params?.token as string | undefined;
  const [step, setStep] = useState<"validating" | "accept" | "success" | "error">("validating");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // 토큰 검증 및 수락
  const getInvitationMutation = trpc.beta.getInvitationByToken.useQuery({ token: token || "" }, { enabled: !!token });

  useEffect(() => {
    if (!token) {
      setStep("error");
      setErrorMessage("유효하지 않은 초대 링크입니다");
      return;
    }

    // 토큰 검증
    if (getInvitationMutation.data) {
      setEmail(getInvitationMutation.data.email);
      setStep("accept");
    } else if (getInvitationMutation.error) {
      setStep("error");
      setErrorMessage(
        getInvitationMutation.error instanceof Error
          ? getInvitationMutation.error.message
          : "초대 링크가 유효하지 않거나 만료되었습니다"
      );
    } else if (getInvitationMutation.isLoading) {
      setStep("validating");
    }
  }, [getInvitationMutation.data, getInvitationMutation.error, getInvitationMutation.isLoading]);

  // 초대 수락 mutation
  const acceptMutation = trpc.beta.acceptInvitation.useMutation();

  const handleAccept = async () => {
    // 검증
    if (!tempPassword.trim()) {
      setErrorMessage("임시 비밀번호를 입력하세요");
      return;
    }

    if (!newPassword.trim()) {
      setErrorMessage("새 비밀번호를 입력하세요");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("비밀번호는 최소 8자 이상이어야 합니다");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("비밀번호가 일치하지 않습니다");
      return;
    }

    try {
      // 서버에 초대 수락 요청
      await acceptMutation.mutateAsync({ token: token || "" });
      
      // 성공 상태로 변경
      setStep("success");
      
      // 3초 후 홈으로 리다이렉트
      setTimeout(() => {
        setLocation("/");
      }, 3000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "초대 수락 중 오류가 발생했습니다"
      );
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 검증 중 */}
        {step === "validating" && (
          <Card>
            <CardContent className="pt-8 flex flex-col items-center justify-center">
              <Loader className="w-12 h-12 text-orange-500 animate-spin mb-4" />
              <p className="text-gray-600">초대 링크를 확인 중입니다...</p>
            </CardContent>
          </Card>
        )}

        {/* 수락 폼 */}
        {step === "accept" && (
          <Card>
            <CardHeader>
              <CardTitle>톡캐디 베타 테스트 초대</CardTitle>
              <CardDescription>
                베타 테스트에 참여해주셔서 감사합니다!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 이메일 (읽기 전용) */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  이메일
                </label>
                <div className="bg-gray-100 border border-gray-300 rounded px-3 py-2 text-gray-600">
                  {email}
                </div>
              </div>

              {/* 임시 비밀번호 */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  임시 비밀번호
                </label>
                <Input
                  type="password"
                  placeholder="초대 메시지에서 받은 임시 비밀번호"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                />
              </div>

              {/* 새 비밀번호 */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  새 비밀번호 (8자 이상)
                </label>
                <Input
                  type="password"
                  placeholder="새 비밀번호 입력"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              {/* 비밀번호 확인 */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  비밀번호 확인
                </label>
                <Input
                  type="password"
                  placeholder="비밀번호 재입력"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {/* 에러 메시지 */}
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded p-3 flex gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
              )}

              {/* 버튼 */}
              <Button
                onClick={handleAccept}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                베타 테스트 시작
              </Button>

              {/* 안내 */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-700">
                💡 <strong>팁:</strong> 임시 비밀번호는 초대 메시지에서 확인하세요
              </div>
            </CardContent>
          </Card>
        )}

        {/* 성공 */}
        {step === "success" && (
          <Card>
            <CardContent className="pt-8 flex flex-col items-center justify-center text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">베타 테스트 시작!</h2>
              <p className="text-gray-600 mb-6">
                초대를 수락했습니다. 곧 홈 화면으로 이동합니다.
              </p>
              <Button
                onClick={() => setLocation("/")}
                className="bg-orange-500 hover:bg-orange-600"
              >
                지금 시작하기
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 에러 */}
        {step === "error" && (
          <Card>
            <CardContent className="pt-8 flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">초대 링크 오류</h2>
              <p className="text-gray-600 mb-6">{errorMessage}</p>
              <Button
                onClick={() => setLocation("/")}
                variant="outline"
              >
                홈으로 돌아가기
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
