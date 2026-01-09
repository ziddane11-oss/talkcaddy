import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield } from "lucide-react";

interface PrivacyMaskingAlertProps {
  detectedTypes: string[];
}

export default function PrivacyMaskingAlert({ detectedTypes }: PrivacyMaskingAlertProps) {
  if (detectedTypes.length === 0) {
    return null;
  }

  return (
    <Alert className="border-blue-200 bg-blue-50 mb-4">
      <Shield className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-900">📌 민감정보가 자동으로 가려졌습니다</AlertTitle>
      <AlertDescription className="text-blue-800">
        AI 분석 전에 다음 정보가 마스킹 처리되었습니다: <strong>{detectedTypes.join(", ")}</strong>
      </AlertDescription>
    </Alert>
  );
}
