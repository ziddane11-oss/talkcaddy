import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Onboarding() {
  const [, setLocation] = useLocation();

  const handleStart = () => {
    localStorage.setItem("onboarding_completed", "true");
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        {/* 헤더 - 큰 타이포그래피 */}
        <div className="mb-16">
          <h1 className="text-6xl md:text-7xl font-bold text-slate-900 mb-4 tracking-tight">
            톡캐디
          </h1>
          <p className="text-xl md:text-2xl text-slate-600">
            카톡 대화, <span className="text-orange-500 font-semibold">스샷 한 장</span>이면 답장 끝
          </p>
        </div>

        {/* 기능 소개 - 비대칭 레이아웃, 텍스트 중심 */}
        <div className="grid md:grid-cols-3 gap-8 md:gap-12 mb-16">
          <div className="space-y-3">
            <div className="text-sm font-medium uppercase tracking-wider text-slate-400">01</div>
            <h3 className="text-2xl font-bold text-slate-900">간편한 업로드</h3>
            <p className="text-slate-600 leading-relaxed">
              카톡 스크린샷 한 장만 올리면 AI가 자동으로 대화를 분석합니다
            </p>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium uppercase tracking-wider text-orange-500">02</div>
            <h3 className="text-2xl font-bold text-slate-900">AI 심리 분석</h3>
            <p className="text-slate-600 leading-relaxed">
              상대방의 심리 상태를 상황에 맞게 분석하고 적절한 답변을 제시합니다
            </p>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium uppercase tracking-wider text-slate-400">03</div>
            <h3 className="text-2xl font-bold text-slate-900">톤별 답변 3종</h3>
            <p className="text-slate-600 leading-relaxed">
              부드럽게/균형/유머 3가지 톤의 답변 중 상황에 맞게 선택하세요
            </p>
          </div>
        </div>

        {/* 사용 방법 - 얇은 보더, 최소한의 스타일 */}
        <div className="border border-slate-200 p-8 md:p-12 mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">사용 방법</h2>
          <div className="space-y-6">
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-10 h-10 border border-slate-900 flex items-center justify-center font-bold text-slate-900">
                1
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">대화방 생성</h4>
                <p className="text-slate-600">상대방 이름과 관계 유형(썸/연애/재회/직장 등)을 설정합니다</p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-10 h-10 border border-slate-900 flex items-center justify-center font-bold text-slate-900">
                2
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">프로필 설정 (30초)</h4>
                <p className="text-slate-600">목표(약속 잡기, 분위기 유지 등)와 금지 옵션(집착 금지 등)을 선택합니다</p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-10 h-10 border border-orange-500 flex items-center justify-center font-bold text-orange-500">
                3
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">스크린샷 업로드</h4>
                <p className="text-slate-600">카톡 대화 스크린샷을 업로드하면 AI가 자동으로 분석합니다</p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-10 h-10 border border-slate-900 flex items-center justify-center font-bold text-slate-900">
                4
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">답변 선택 및 전송</h4>
                <p className="text-slate-600">3가지 톤의 답변 중 마음에 드는 것을 선택하여 사용하세요</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA 버튼 - 오렌지 강조 */}
        <div className="text-center">
          <Button
            onClick={handleStart}
            size="lg"
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-12 py-6 text-lg"
          >
            지금 시작하기
          </Button>
        </div>
      </div>
    </div>
  );
}
