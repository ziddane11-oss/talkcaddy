/**
 * 베타 테스터 이메일 발송 서비스
 * Sendgrid 또는 AWS SES 통합 (현재는 템플릿만 제공)
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * 베타 초대 이메일 템플릿
 */
export function generateBetaInvitationEmail(
  email: string,
  tempPassword: string,
  invitationLink: string
): EmailTemplate {
  const subject = "🎉 톡캐디 베타 테스트 초대";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #000 0%, #333 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 18px; color: #000; margin-top: 0; }
    .credentials { background: #fff; border: 1px solid #e0e0e0; border-radius: 4px; padding: 15px; margin: 15px 0; font-family: monospace; }
    .credentials-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .credentials-value { font-size: 16px; color: #000; font-weight: bold; margin: 5px 0; }
    .button { display: inline-block; background: #ff9500; color: white; padding: 12px 30px; border-radius: 4px; text-decoration: none; font-weight: bold; margin: 15px 0; }
    .footer { font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>톡캐디 베타 테스트</h1>
      <p>AI 대화 코치에 초대되었습니다!</p>
    </div>
    <div class="content">
      <div class="section">
        <h2>안녕하세요! 👋</h2>
        <p>톡캐디 베타 테스트에 초대해주셔서 감사합니다.</p>
        <p>아래 임시 비밀번호로 로그인한 후, 첫 로그인 시 비밀번호를 변경해주세요.</p>
      </div>

      <div class="section">
        <h3>로그인 정보</h3>
        <div class="credentials">
          <div class="credentials-label">이메일</div>
          <div class="credentials-value">${email}</div>
          <div class="credentials-label" style="margin-top: 10px;">임시 비밀번호</div>
          <div class="credentials-value">${tempPassword}</div>
        </div>
      </div>

      <div class="section" style="text-align: center;">
        <a href="${invitationLink}" class="button">베타 테스트 시작하기</a>
      </div>

      <div class="section">
        <h3>베타 테스트 안내</h3>
        <ul>
          <li><strong>테스트 기간:</strong> 2주 (예정)</li>
          <li><strong>피드백 방법:</strong> 앱 내 피드백 폼 사용</li>
          <li><strong>버그 리포트:</strong> 재현 단계와 함께 상세히 기록해주세요</li>
          <li><strong>기능 요청:</strong> 사용하면서 개선되면 좋을 점들을 자유롭게 제안해주세요</li>
        </ul>
      </div>

      <div class="section">
        <h3>자주 묻는 질문</h3>
        <p><strong>Q: 비밀번호를 잊어버렸어요</strong></p>
        <p>A: 로그인 페이지의 "비밀번호 재설정" 링크를 사용하거나, 이 이메일로 회신해주세요.</p>
        <p><strong>Q: 버그를 발견했어요</strong></p>
        <p>A: 앱 내 피드백 폼에서 "버그" 카테고리를 선택하고 상세히 기록해주세요. 재현 단계가 있으면 더 좋습니다!</p>
      </div>

      <div class="footer">
        <p>이 이메일은 톡캐디 베타 테스트 초대 메일입니다.</p>
        <p>문의사항이 있으시면 이 이메일로 회신해주세요.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
톡캐디 베타 테스트에 초대되었습니다!

로그인 정보:
- 이메일: ${email}
- 임시 비밀번호: ${tempPassword}

베타 테스트 시작: ${invitationLink}

베타 테스트 안내:
- 테스트 기간: 2주 (예정)
- 피드백 방법: 앱 내 피드백 폼 사용
- 버그 리포트: 재현 단계와 함께 상세히 기록해주세요
- 기능 요청: 사용하면서 개선되면 좋을 점들을 자유롭게 제안해주세요

문의사항이 있으시면 이 이메일로 회신해주세요.
  `;

  return { subject, html, text };
}

/**
 * 피드백 감사 이메일 템플릿
 */
export function generateFeedbackThankYouEmail(
  testerName: string
): EmailTemplate {
  const subject = "🙏 톡캐디 피드백 감사합니다";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #000 0%, #333 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .footer { font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>감사합니다! 🙏</h1>
    </div>
    <div class="content">
      <p>안녕하세요 ${testerName}님,</p>
      <p>톡캐디 베타 테스트에 참여해주셔서 정말 감사합니다!</p>
      <p>여러분의 소중한 피드백이 톡캐디를 더 좋은 서비스로 만드는 데 큰 도움이 되고 있습니다.</p>
      <p>계속해서 자유롭게 의견을 주셔도 좋습니다. 모든 피드백은 소중하게 검토하겠습니다.</p>
      <p>감사합니다!</p>
      <div class="footer">
        <p>톡캐디 팀</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
안녕하세요 ${testerName}님,

톡캐디 베타 테스트에 참여해주셔서 정말 감사합니다!
여러분의 소중한 피드백이 톡캐디를 더 좋은 서비스로 만드는 데 큰 도움이 되고 있습니다.

계속해서 자유롭게 의견을 주셔도 좋습니다. 모든 피드백은 소중하게 검토하겠습니다.

감사합니다!
톡캐디 팀
  `;

  return { subject, html, text };
}

/**
 * 이메일 발송 (실제 구현은 Sendgrid/AWS SES 사용)
 * 현재는 로그만 출력
 */
export async function sendEmail(
  to: string,
  template: EmailTemplate
): Promise<boolean> {
  try {
    // TODO: Sendgrid 또는 AWS SES 통합
    // const response = await sendgrid.send({
    //   to,
    //   from: process.env.SENDGRID_FROM_EMAIL || 'noreply@talkcaddy.com',
    //   subject: template.subject,
    //   html: template.html,
    //   text: template.text,
    // });

    console.log(`[Email] 발송 대기: ${to}`);
    console.log(`[Email] 제목: ${template.subject}`);
    console.log(`[Email] HTML 길이: ${template.html.length}자`);

    // 실제 발송 시뮬레이션 (성공)
    return true;
  } catch (error) {
    console.error("[Email] 발송 실패:", error);
    return false;
  }
}

/**
 * 베타 테스터 초대 이메일 발송
 */
export async function sendBetaInvitationEmail(
  email: string,
  tempPassword: string,
  invitationLink: string
): Promise<boolean> {
  const template = generateBetaInvitationEmail(email, tempPassword, invitationLink);
  return sendEmail(email, template);
}

/**
 * 피드백 감사 이메일 발송
 */
export async function sendFeedbackThankYouEmail(
  email: string,
  testerName: string
): Promise<boolean> {
  const template = generateFeedbackThankYouEmail(testerName);
  return sendEmail(email, template);
}
