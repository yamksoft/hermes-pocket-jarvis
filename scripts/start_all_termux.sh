#!/usr/bin/env sh
# هذا السكربت مخصص لتشغيل جميع الخدمات دفعة واحدة في نظام Termux (اندرويد) 
# عن طريق فتح 4 نوافذ مصغرة داخل الشاشة باستخدام أداة tmux

cd "$(dirname "$0")/.."
PROJECT_DIR="$(pwd)"

# التأكد من توفر أداة tmux
if ! command -v tmux >/dev/null 2>&1; then
    echo "tmux is required but not installed. Please run pkg install tmux"
    exit 1
fi

# التأكد من عدم وجود جلسة تعمل بالفعل
if tmux has-session -t jarvis 2>/dev/null; then
    echo "جارفس يعمل مسبقاً! جاري استعادة الجلسة..."
    tmux attach-session -t jarvis
    exit 0
fi

echo "جاري تشغيل منظومة جارفس في Termux..."

# النافذة 1: LiveKit (يسار أعلى)
tmux new-session -d -s jarvis "cd '$PROJECT_DIR' && echo 'Starting LiveKit...' && ./scripts/start_livekit.sh; echo 'LiveKit stopped.'; read"

# النافذة 2: الباك اند (يمين أعلى)
tmux split-window -h -t jarvis "cd '$PROJECT_DIR' && echo 'Starting Backend...' && ./scripts/start.sh; echo 'Backend stopped.'; read"

# النافذة 3: وكيل الذكاء الاصطناعي (يسار أسفل)
tmux split-window -v -t jarvis:0.0 "cd '$PROJECT_DIR' && echo 'Starting Agent...' && ./scripts/agent.sh; echo 'Agent stopped.'; read"

# النافذة 4: الفرونت اند (يمين أسفل)
tmux split-window -v -t jarvis:0.2 "cd '$PROJECT_DIR/frontend' && echo 'Starting Frontend...' && npm run dev; echo 'Frontend stopped.'; read"

# ترتيب النوافذ لتكون متساوية على الشاشة
tmux select-layout -t jarvis tiled

# الدخول إلى الجلسة لرؤية كل الخدمات تعمل معاً
tmux attach-session -t jarvis
