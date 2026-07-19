# 20260502
<prompt>
nodebb cloud(custom plugin 설치 안됨) $20/mo vs NodeBB self-hosted vs WordPress $15–25/mo(self-host 말하는건지? wordpress.com 말하는건지?) vs Discourse self-host

마케팅+커뮤니티 cs 운영용, blog forum 플랫폼 조사 [무료, 유료]
플랫폼 native기능이 존재 하거나, 잘 작동하는 외부 플러그인 기능이 존재하면 된다

- blog forum 플랫폼에 작성된 콘텐츠 자체가, [SEO GEO(Generative Engine Optimization, 생성형 AI 검색 최적화), AEO (Answer Engine Opt.)] 최적화가 되어있어야 됨
```
-- 서비스 규모와 예산은 어느 정도인가요? (예: 월 트래픽, 예산 범위)
=> 월 $50 미만

-- 블로그+포럼을 하나의 통합 플랫폼으로 운영하길 원하시나요, 아니면 블로그(예: WordPress)와 커뮤니티(예: Discourse)를 별도로 운영하고 연동하는 방식도 괜찮으신가요?
=> 블로그+포럼 통합 1개로 운영

self-hosting vs. 관리형 클라우드(Managed Cloud) 중 어느 쪽을 더 선호하시나요?
=> 둘다 상관 없는데, $50 이하이면 관리형 클라우드 사용 예정
```


- blog[text, image, etc]upload 자동화를 위한 sdk 또는 API 등 programmable 방법을 제공하고
- 그냥 translate 콘텐츠 기능이 아닌, [SEO GEO(Generative Engine Optimization, 생성형 AI 검색 최적화), AEO (Answer Engine Opt.)]에 노출되는 content-localization-and(-automatic)-translations 방법을 제공 하는가?
- 유저들이 forum에 가입해서 질문하고 서로 답변하고 하는 커뮤니티 운영이 가능해야 함
- 
- 특정 게시판(q&a 등)에 업로드된 질문 발견시, aibot이 rag llm 기반 답변이 가능한 기능이 존재 하는지(또는 관련 플러그인 존재 하는지)
- [scam, spam, 18+등 문제 발생 예상되는] 게시글 이미지(+scam spam 업로드 지속시 해당유저 차단등 회원탈퇴 등이 알아서 되는)가 알아서 삭제 filtering 되는지
- db backup + 콘텐츠(upload media 포함) 백업이 (주기적)으로 되는 기능 + 백업된 콘텐츠가 import가 100% 완벽하게 복원 되어야 함



### discourse
self-hosting경험도 있고, cloud plan존재도 알고 있음
https://meta.discourse.org/t/content-localization-and-automatic-translations-for-your-community/370000/24
- https://www.discourse.org/pricing

### nodebb
self-hosting경험도 있고, cloud plan존재도 알고 있음

### wordpress
self-hosting경험도 있고, cloud plan존재도 알고 있음

### etc


</prompt>
<answer>
←  ☐ Topic  ☐ Recipients  ☐ Brand  ✔ Submit  →

What's the topic/purpose of this first real email blast?

  1. kvid.ai launch announcement
     Marketing email announcing kvid.ai (AI video generation) — value prop, beta access CTA, link to     KVIDAI_SELF_URL
  2. affy.ink launch announcement
     Marketing email announcing affy.ink (affiliate marketing) — value prop, signup CTA
❯ 3. Internal pipeline smoke test
     Minimal test email — "hello from marketing-studio" — purely to verify SES delivers. No real marketing     content.

Who should receive this first send?

❯ 1. Admin inbox only
     Sends to KVIDAI_ADMIN_EMAIL (epicmobile182@gmail.com per env). Safe end-to-end validation.
  2. Admin + a small test list
     Admin plus 2-3 additional addresses you'll provide. Still small but tests multi-recipient path
  3. epicmobile182@gmail.com + wu19u.test@inbox.testmail.app(.env.production ENV 확인)
</answer>