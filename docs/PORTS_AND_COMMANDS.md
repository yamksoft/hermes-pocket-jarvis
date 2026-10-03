# دليل منافذ وأوامر تشغيل مشروع Jarvis Neural Nexus

هذا الدليل يوضح الهيكلة الجديدة للمنافذ (Ports) وطريقة تشغيل المشروع وإعداده بعد دمج الفرونت اند الحديث (Next.js) وتنظيف النظام.

---

## 1. خريطة المنافذ (Ports Map)

لضمان عدم وجود أي تعارض ولتعمل جميع الخدمات بسلاسة، تم توزيع المنافذ كالتالي:

| الخدمة (Service) | المنفذ (Port) | الوصف |
| :--- | :---: | :--- |
| **الفرونت اند (Next.js)** | `3001` | واجهة المستخدم التفاعلية والداشبورد الخاصة بجارفس. تعمل حصرياً على هذا المنفذ. الرابط: `http://localhost:3001` |
| **الباك اند (FastAPI/Python)** | `8082` | سيرفر الواجهة الخلفية المسؤول عن إصدار توكن LiveKit وإرسال الموافقات. الرابط: `http://localhost:8082` |
| **وكيل هرمس (Hermes API)** | `8642` | واجهة الربط المباشرة مع نظام هرمس الأساسي. |
| **سيرفر LiveKit (المحلي)** | `7880` | في حال استخدام LiveKit محلياً (Offline mode)، سيعمل السيرفر على هذا المنفذ. |

---

## 2. أوامر الإعداد لأول مرة (Setup Commands)

عند استنساخ المشروع لأول مرة أو الرغبة في إعادة تهيئة البيئة (تأكد من الدخول لمسار المشروع أولاً):

**في بيئة Linux / macOS / Termux:**
```bash
# مثال للمسار إذا كنت تستخدم WSL Ubuntu
cd ~/Projects/hermes-pocket-jarvis && ./scripts/setup.sh
```

**في بيئة Windows (PowerShell):**
```powershell
.\scripts\setup.ps1
```
*ملاحظة: السكربت سيقوم بتثبيت الحزم اللازمة للبايثون ويهيئ ملفات `.env` بشكل تلقائي.*

---

## 3. أوامر التشغيل اليومية (Run Commands)

للتشغيل المتكامل للمنظومة، يجب تشغيل 3 أجزاء في نوافذ تيرمينال منفصلة:

### أولاً: تشغيل الباك اند (FastAPI Server)
يعمل على المنفذ `8082`:
```bash
# Windows
.\scripts\start.ps1

# Linux / Mac
./scripts/start.sh
```

### ثانياً: تشغيل وكيل الذكاء الاصطناعي (AI Agent)
يتصل بسيرفر LiveKit وهرمس:
```bash
# Windows
.\scripts\agent.ps1

# Linux / Mac
./scripts/agent.sh
```

### ثالثاً: تشغيل الفرونت اند (Next.js Dashboard)
يعمل على المنفذ `3001`. توجه إلى مجلد الواجهة ثم قم بتشغيله:
```bash
cd frontend
npm install  # (لأول مرة فقط لتثبيت الحزم)
npm run dev
```

---

## 4. إعدادات LiveKit المحلي (اختياري)

إذا كنت لا تريد استخدام سحابة LiveKit Cloud وترغب في التشغيل المحلي (Offline):

1. قم بتثبيت السيرفر المحلي:
   ```bash
   ./scripts/setup_livekit.sh
   ```
2. قم بتشغيل السيرفر المحلي (سيعمل على بورت `7880`):
   ```bash
   ./scripts/start_livekit.sh
   ```

*ملاحظة: إعدادات الاتصال بالسيرفر المحلي مضبوطة مسبقاً في ملف `.env.local`.*

---

## 5. دليل الإعداد والتشغيل الشامل داخل بيئة WSL (Ubuntu)

إذا قمت بنسخ المشروع إلى مسار `~/Projects/hermes-pocket-jarvis` داخل أوبونتو (WSL)، فإليك الترتيب الصحيح للأوامر بالمسار الكامل:

### الخطوة الأولى: الإعداد الأولي وتثبيت الحزم (Setup)
افتح التيرمينال الخاص بـ Ubuntu ونفذ الأوامر التالية بالترتيب (لأول مرة فقط):

```bash
# 1. الدخول إلى مسار المشروع وتشغيل سكربت الإعداد (سيقوم بتثبيت الحزم الأساسية وإعداد بيئة بايثون)
cd ~/Projects/hermes-pocket-jarvis && ./scripts/setup.sh

# 2. الدخول إلى مجلد الفرونت اند لتثبيت حزم واجهة المستخدم
cd ~/Projects/hermes-pocket-jarvis/frontend && npm install
```

### الخطوة الثانية: إعداد وتعديل ملفات متغيرات البيئة (.env)
يحتوي المشروع على 5 ملفات مهمة لمتغيرات البيئة يجب التأكد من صحة بياناتها (خصوصاً مفتاح Gemini وروابط LiveKit). يمكنك تعديلها من داخل Ubuntu باستخدام محرر `nano` أو عبر VSCode:

**الملفات الخاصة بالباك اند (في المجلد الرئيسي):**
```bash
nano ~/Projects/hermes-pocket-jarvis/.env
nano ~/Projects/hermes-pocket-jarvis/.env.local
nano ~/Projects/hermes-pocket-jarvis/.env.cloud
```

**الملفات الخاصة بالفرونت اند (في مجلد frontend):**
```bash
nano ~/Projects/hermes-pocket-jarvis/frontend/.env.local
nano ~/Projects/hermes-pocket-jarvis/frontend/.env.cloud
```
*(ملاحظة: اضغط `Ctrl+O` ثم `Enter` للحفظ في nano، ثم `Ctrl+X` للخروج).*

### الخطوة الثالثة: تسجيل الوكيل مع هرمس (Register Hermes)
قبل تشغيل المنظومة، تأكد من تسجيل وكيلك مع هرمس (إذا لم تقم بذلك مسبقاً) عبر الأمر:
```bash
cd ~/Projects/hermes-pocket-jarvis && ./scripts/register-hermes.sh
```

### الخطوة الرابعة: أوامر التشغيل اليومية (Run Commands)
بعد إتمام الإعداد والتسجيل، ستحتاج إلى فتح 4 نوافذ تيرمينال (إذا كنت تستخدم LiveKit محلي) أو 3 نوافذ لتشغيل المنظومة كاملة:



**النافذة الأولى (لتشغيل الباك اند - بورت 8082):**
```bash
cd ~/Projects/hermes-pocket-jarvis && ./scripts/start.sh
```

**النافذة الثانية (لتشغيل سيرفر LiveKit محلي - بورت 7880):**
```bash
cd ~/Projects/hermes-pocket-jarvis && ./scripts/start_livekit.sh
```

**النافذة الثالثة (لتشغيل وكيل الذكاء الاصطناعي):**
```bash
cd ~/Projects/hermes-pocket-jarvis && ./scripts/agent.sh
```

**النافذة الثالثة (لتشغيل الفرونت اند والداشبورد - بورت 3001):**
```bash
cd ~/Projects/hermes-pocket-jarvis/frontend && npm run dev
```

بمجرد تشغيل الأوامر الثلاثة بنجاح، يمكنك فتح متصفحك في الويندوز والانتقال إلى الرابط:
`http://localhost:3001`
