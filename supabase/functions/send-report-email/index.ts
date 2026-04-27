import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const ADMIN_EMAIL = "problemcompany1@naver.com";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { postTitle, reportReason, reporterEmail, postId } = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not set");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "report@zaihanlife.com",   // Resend에서 인증된 발송 도메인으로 교체
        to: ADMIN_EMAIL,
        subject: `[신고] ${postTitle}`,
        html: `
          <h2>새 신고가 접수됐습니다</h2>
          <table cellpadding="8" style="border-collapse:collapse">
            <tr><td><strong>게시글 제목</strong></td><td>${postTitle}</td></tr>
            <tr><td><strong>신고 사유</strong></td><td>${reportReason}</td></tr>
            <tr><td><strong>신고자</strong></td><td>${reporterEmail}</td></tr>
            <tr><td><strong>게시글 ID</strong></td><td>${postId}</td></tr>
          </table>
        `,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Resend error: ${errText}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-report-email]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
