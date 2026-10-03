# Pocket JARVIS · Hermes + LiveKit + Gemini Live

مشروع جديد مستقل داخل `hermes-pocket-jarvis`. لا يعدّل `jarvis_livekit` ولا لوحة Hermes السابقة.

هذه النسخة لا تشغّل Whisper أو TTS أو نموذج LLM محلياً. تعمل المحادثة النصية والصوتية والكاميرا عبر **LiveKit Cloud** وعامل Python يستخدم **Gemini 3.8 Live** بمفتاح Google AI Studio محفوظ في الخادم. Hermes يبقى منفذ المهام والأدوات والموافقات.

```text
المتصفح (نص / ميكروفون / كاميرا)
             │ token قصير فقط
             ▼
FastAPI المحلي ─────► LiveKit Cloud ◄──── عامل Python / Gemini 3.8 Live
     │                                              │
     └──────── Hermes Runs API ◄── أداة run_hermes ─┘
```

لا يحصل JavaScript على `GOOGLE_API_KEY` أو `LIVEKIT_API_SECRET` أو `API_SERVER_KEY`.

## ما الذي تم بناؤه

- واجهة HUD متجاوبة للهاتف والكمبيوتر، مع لوحات قابلة للطي.
- اتصال WebRTC صوتي وكاميرا عبر `livekit-client`، ومحادثة نصية عبر الموضوع القياسي `lk.chat`.
- `POST /api/livekit/token`: ينشئ غرفة عشوائية وtoken لـ 15 دقيقة ويعمل dispatch صريح للوكيل عند إنشاء الغرفة.
- `agent/agent.py`: وكيل LiveKit مستقل، يعتمد `gemini-3.8-live` للصوت الطبيعي والنص والكاميرا، ويحوّل مهمة الأدوات إلى Hermes.
- Hermes هو مصدر قرار السماح/الرفض. لا يوافق العامل تلقائياً؛ حين تظهر موافقة ينشر حدثاً موثوقاً للواجهة لتعرض البطاقة.
- اختبارات لسلامة أسماء المشاركين، وعقد الواجهة، ومنع استخدام `SpeechRecognition` و`speechSynthesis` القديمين.

## المتطلبات السحابية

1. أنشئ مشروع LiveKit Cloud وخذ `LIVEKIT_URL` و`LIVEKIT_API_KEY` و`LIVEKIT_API_SECRET`.
2. أنشئ مفتاحاً من Google AI Studio وضعه في `GOOGLE_API_KEY`.
3. حدّد اسم الوكيل نفسه في `AGENT_NAME` في الإعدادات وعند تشغيل/نشر العامل. الافتراضي `hermes-jarvis`.
4. جهّز Hermes Gateway وRuns API. إذا كان Hermes يعمل على الجهاز نفسه استخدم `http://127.0.0.1:8642`.

`gemini-3.8-live` يدعم النص والصوت والصور والفيديو ويخرج نصاً وصوتاً. راجع وثائق [Gemini 3.8 Live](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live) وخطط [Gemini API وأسعارها](https://ai.google.dev/gemini-api/docs/pricing) قبل الاعتماد على الحصة المجانية؛ الحصص والسياسات قد تتغير.

## الإعداد المحلي: Windows / macOS / Linux / WSL

```sh
cd hermes-pocket-jarvis
./scripts/setup.sh
# إذا لم ينشئ setup الملف تلقائياً:
cp .env.example .env
```

في Windows PowerShell:

```powershell
cd C:\jarvis-demo\hermes-pocket-jarvis
.\scripts\setup.ps1
```

عدّل `.env` وضع القيم الحقيقية. لا تضع الأسرار في أي ملف `NEXT_PUBLIC_*` أو في المتصفح.

لربط Hermes محلياً على POSIX:

```sh
./scripts/register-hermes.sh
hermes gateway restart
```

ابدأ الخادم والعامل في نافذتين منفصلتين:

```sh
./scripts/start.sh
./scripts/agent.sh
```

أو على Windows:

```powershell
.\scripts\start.ps1
.\scripts\agent.ps1
```

ثم لتشغيل واجهة المستخدم الجديدة، افتح مجلد `frontend` وقم بتشغيل `npm run dev` ثم افتح `http://localhost:3001/dashboard`.

## Termux / Android

المشروع نفسه لا يحتاج LiveKit Server محلياً ولا Docker، لذلك يمكن تشغيل الخادم والعامل من Termux مبدئياً:

```sh
pkg update
pkg install git python nodejs tmux
git clone <رابط-مستودعك> hermes-pocket-jarvis
cd hermes-pocket-jarvis
chmod +x scripts/*.sh
./scripts/setup.sh
# عدّل .env بمفاتيح LiveKit Cloud وGoogle وHermes
tmux new -s jarvis-web './scripts/start.sh'
tmux new -s jarvis-agent './scripts/agent.sh'
```

افتح العنوان المحلي من متصفح الهاتف. استثنِ Termux من تحسين البطارية واستخدم `termux-wake-lock` أثناء الاستخدام. Android قد يوقف العمليات الخلفية؛ لذلك لا تعتمد على الهاتف كعامل متاح دائماً. للنظام المتاح دائماً انشر **العامل فقط** في LiveKit Cloud أو خادم Linux، واترك الواجهة محلية على الهاتف.

لا تحاول تشغيل `livekit-server --dev` داخل Termux لهذه البنية؛ المسار المعتمد هنا هو LiveKit Cloud. وثائق LiveKit تصف العامل كبرنامج Python/Node يعمل مشاركاً في الغرف، وتدعم النشر المُدار في السحابة. [وثائق Agents](https://docs.livekit.io/agents/) و[Agent dispatch](https://docs.livekit.io/agents/server/agent-dispatch/) هي المرجع للتشغيل والنشر.

## نشر العامل في LiveKit Cloud

`Dockerfile` مخصص للعامل، ولا يحتوي الواجهة المحلية أو `.env`.

1. ارفع المشروع إلى Git.
2. أنشئ/انشر LiveKit Agent باسم `AGENT_NAME` نفسه.
3. أضف في أسرار النشر: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `GOOGLE_API_KEY`, `HERMES_API_BASE`, `API_SERVER_KEY`.
4. إذا كان Hermes لا يعمل في السحابة نفسها، لا تستخدم `127.0.0.1`: ستحتاج endpoint خاصاً وآمناً أو نشر Hermes في الشبكة/الخادم نفسه. لا تكشف Hermes مباشرة إلى الإنترنت.

الـ token يضم `RoomAgentDispatch`؛ لهذا يجب أن يكون العامل المنشور جاهزاً بالاسم نفسه قبل بدء جلسة المتصفح. وفق [توثيق LiveKit](https://docs.livekit.io/agents/server/agent-dispatch/)، الـ dispatch داخل token لا ينفذ إلا عندما تُنشأ الغرفة أول مرة، ولذلك يولّد الجسر اسم غرفة فريد لكل جلسة.

## المتغيرات

| المتغير | الغرض |
|---|---|
| `LIVEKIT_URL` / `LIVEKIT_PUBLIC_URL` | عنوان مشروع LiveKit Cloud (`wss://...`). |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | للخادم فقط لإنشاء token وdispatch. |
| `AGENT_NAME` | يجب أن يطابق اسم الوكيل المنشور. |
| `GOOGLE_API_KEY` | مفتاح Google AI Studio للعامل فقط. |
| `GEMINI_LIVE_MODEL` | الافتراضي `gemini-3.8-live`. |
| `HERMES_API_BASE` / `API_SERVER_KEY` | اتصال العامل والجسر إلى Hermes. |
| `JARVIS_BIND_HOST` / `JARVIS_PORT` | يبقى `127.0.0.1:8081` افتراضياً. |

## نقاط النهاية

- `GET /` — الواجهة.
- `GET /api/status` — حالة Hermes وإعداد LiveKit/Gemini بدون كشف أسرار.
- `POST /api/livekit/token` — token متصفح قصير + dispatch العامل.
- `POST /api/run`, `GET /api/runs/{run_id}`, `GET /api/runs/{run_id}/events`, `POST /api/approval` — جسر Hermes المباشر.

## الاختبارات والتحقق

```sh
uv run python -m py_compile server.py agent/agent.py agent/hermes.py agent/settings.py
uv run pytest
./scripts/start.sh
```

اختبر من المتصفح بعد ضبط المفاتيح: بدء جلسة، رسالة نصية، الميكروفون، ثم الكاميرا. لا يمكن تحقق اتصال Gemini/LiveKit فعلياً من دون مفاتيحك وحساباتك.

## استكشاف الأعطال

- **LiveKit: يلزم الإعداد:** أكمل قيم LiveKit في `.env` وأعد تشغيل الخادم.
- **الغرفة تتصل بلا صوت:** شغّل `./scripts/agent.sh` محلياً، أو انشر العامل بالاسم المطابق لـ `AGENT_NAME` في LiveKit Cloud. راجع أن الحصة/المفتاح صالحان في Google AI Studio.
- **لا تصل Hermes:** شغّل gateway، راجع `HERMES_API_BASE` و`API_SERVER_KEY`، ثم نفّذ `hermes gateway restart` بعد التسجيل.
- **تعمل الواجهة في الهاتف ولا يعمل العامل بعد إغلاق Termux:** هذه قيود Android الخلفية؛ انشر العامل في السحابة.
- **لا توجد محادثة نصية مرئية:** Gemini Live صوتي بطبيعته؛ الواجهة تستقبل أحداث transcription عندما ينشرها العامل/المزوّد، بينما تسجل الرسالة المكتوبة فوراً.

## ملاحظة عن المشروع المرجعي

المرجع `jarvis_livekit/jarvis` استُخدم لتحليل بنية LiveKit فقط ولم يُعدّل. كان يستخدم `gemini-3.1-flash-live-preview`، وهو نموذج Legacy؛ النسخة الجديدة تستخدم الاسم المستقر `gemini-3.8-live` وفق [دليل الترحيل الرسمي](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live).
