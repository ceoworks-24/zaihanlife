import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";

const CATEGORIES = [
  { id: "all",     ko: "전체",      zh: "全部" },
  { id: "popular", ko: "🔥 인기글",  zh: "🔥 热门" },
  { id: "free",    ko: "자유게시판", zh: "自由版块" },
  { id: "visa",    ko: "비자정보",  zh: "签证攻略" },
  { id: "housing", ko: "방구하기",  zh: "租房找房" },
  { id: "job",     ko: "구인구직",  zh: "求职招聘" },
];

const TAGS = {
  free: [
    { ko: "잡담",      zh: "闲聊" },
    { ko: "질문",      zh: "提问" },
    { ko: "후기·정보", zh: "经验·信息" },
    { ko: "맛집",      zh: "美食" },
    { ko: "취미",      zh: "兴趣" },
    { ko: "여행",      zh: "旅行" },
    { ko: "생활팁",    zh: "生活技巧" },
    { ko: "소식",      zh: "新闻" },
    { ko: "기타",      zh: "其他" },
  ],
  visa: [
    { ko: "후기·정보", zh: "经验·信息" },
    { ko: "질문",      zh: "提问" },
    { ko: "변경·갱신", zh: "变更·续签" },
    { ko: "D-2", zh: "D-2" },
    { ko: "D-4", zh: "D-4" },
    { ko: "E-7", zh: "E-7" },
    { ko: "F-2", zh: "F-2" },
    { ko: "F-4", zh: "F-4" },
    { ko: "F-6", zh: "F-6" },
    { ko: "주의", zh: "注意" },
  ],
  housing: [
    { ko: "후기·정보", zh: "经验·信息" },
    { ko: "질문",      zh: "提问" },
    { ko: "원룸",      zh: "单间" },
    { ko: "오피스텔",  zh: "公寓" },
    { ko: "고시원",    zh: "考试院" },
    { ko: "룸메이트",  zh: "合租" },
    { ko: "사기주의",  zh: "防诈骗" },
    { ko: "급구",      zh: "急求" },
  ],
  job: [
    { ko: "구인",      zh: "招聘" },
    { ko: "구직",      zh: "求职" },
    { ko: "알바",      zh: "兼职" },
    { ko: "정규직",    zh: "正式工" },
    { ko: "인턴",      zh: "实习" },
    { ko: "재택",      zh: "远程" },
    { ko: "후기·정보", zh: "经验·信息" },
    { ko: "질문",      zh: "提问" },
  ],
};

const SHORTCUTS = [
  { id: "bookmark", emoji: "🔖", ko: "내 북마크",  zh: "我的收藏" },
  { id: "notice",   emoji: "📣", ko: "공지사항",  zh: "公告" },
  { id: "popular",  emoji: "🔥", ko: "인기글",    zh: "热门" },
  { id: "free",     emoji: "💬", ko: "자유게시판", zh: "自由版块" },
  { id: "visa",     emoji: "📋", ko: "비자정보",  zh: "签证攻略" },
  { id: "housing",  emoji: "🏠", ko: "방구하기",  zh: "租房找房" },
  { id: "job",      emoji: "💼", ko: "구인구직",  zh: "求职招聘" },
  { id: "suggest",  emoji: "📮", ko: "건의하기",  zh: "建议" },
];

const BANNERS = [1, 2, 3, 4, 5];

const getCategoryInfo = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[0];

const TAG_STYLE = { background: "#FEF0EF", color: "#C0392B", border: "1px solid #FCCBC8" };
const TAG_GRAY  = { background: "#F5F5F5", color: "#666",    border: "1px solid #ddd" };

const formatDate = (str) => {
  if (!str) return "";
  const d = new Date(str);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

// 공통 input 스타일 — fontSize 16px: iOS Safari 자동 줌 방지
const INPUT_STYLE = { width: "100%", border: "1px solid #ddd", borderRadius: 8, padding: "10px 12px", fontSize: 16, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };

export default function ZaihanLife() {
  const [lang, setLang] = useState("ko");
  const [view, setView] = useState("home");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPost, setSelectedPost] = useState(null);
  const [sortBy, setSortBy] = useState("latest");
  const [searchQuery, setSearchQuery] = useState("");
  const [bannerIdx, setBannerIdx] = useState(0);
  const timerRef = useRef(null);

  // Supabase data
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Write form
  const [writeCat, setWriteCat] = useState("");
  const [writeTag, setWriteTag] = useState("");
  const [writeTitle, setWriteTitle] = useState("");
  const [writeContent, setWriteContent] = useState("");
  const [writeAnon, setWriteAnon] = useState(false);
  const [writeLoading, setWriteLoading] = useState(false);
  const [writeError, setWriteError] = useState("");

  // Comment
  const [commentInput, setCommentInput] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // Auth modal
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authNickname, setAuthNickname] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const backdropPointerDownTarget = useRef(null); // [fix] onPointerDown으로 변경 (모바일 터치 호환)

  // [fix] fetchPosts 경쟁 조건 방지 — 가장 최근 요청 id만 상태 반영
  const fetchCountRef = useRef(0);
  // [fix] 검색 debounce 타이머
  const searchTimerRef = useRef(null);

  const t = (ko, zh) => lang === "ko" ? ko : zh;

  // ── 배너 타이머 ──
  useEffect(() => {
    timerRef.current = setInterval(() => setBannerIdx(p => (p + 1) % BANNERS.length), 5000);
    return () => clearInterval(timerRef.current);
  }, []);

  // ── Auth 상태 감지 ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── 카테고리/정렬 변경 시 즉시 로드 ──
  useEffect(() => {
    fetchPosts();
  }, [selectedCategory, sortBy]);

  // ── 검색어 변경 시 debounce 400ms ──
  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(fetchPosts, 400);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery]);

  // [fix] 경쟁 조건 방지: 요청 id가 현재 최신인 경우에만 상태 업데이트
  const fetchPosts = async () => {
    const id = ++fetchCountRef.current;
    setLoading(true);

    let query = supabase.from("posts").select("*");

    if (selectedCategory === "popular") {
      query = query.order("likes", { ascending: false });
    } else {
      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }
      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,title_zh.ilike.%${searchQuery}%`);
      }
      if (sortBy === "views")       query = query.order("views",      { ascending: false });
      else if (sortBy === "likes")  query = query.order("likes",      { ascending: false });
      else                          query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;
    if (id !== fetchCountRef.current) return; // 오래된 응답 무시
    if (!error) setPosts(data || []);
    setLoading(false);
  };

  // ── 게시글 열기 ──
  const openPost = async (post) => {
    window.scrollTo(0, 0); // [fix] 스크롤 초기화
    setSelectedPost(post);
    setView("detail");
    setReplies([]);

    await supabase.from("posts").update({ views: (post.views || 0) + 1 }).eq("id", post.id);
    setSelectedPost(prev => ({ ...prev, views: (prev?.views || 0) + 1 }));

    const { data } = await supabase
      .from("replies")
      .select("*")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    setReplies(data || []);
  };

  const goHome = () => {
    window.scrollTo(0, 0); // [fix] 스크롤 초기화
    setView("home");
    setSelectedPost(null);
    setReplies([]);
    fetchPosts();
  };

  const handleShortcut = (id) => {
    if (["free","visa","housing","job","popular"].includes(id)) {
      setSelectedCategory(id); setView("home");
    }
  };

  const moveBanner = (dir) => {
    clearInterval(timerRef.current);
    setBannerIdx(p => (p + dir + BANNERS.length) % BANNERS.length);
    timerRef.current = setInterval(() => setBannerIdx(p => (p + 1) % BANNERS.length), 5000);
  };

  // ── 로그인 / 회원가입 ──
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    if (authMode === "signup") {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
        options: { data: { nickname: authNickname } },
      });
      if (error) {
        setAuthError(t("회원가입에 실패했습니다. 다시 시도해주세요.", "注册失败，请重试。"));
      } else {
        setAuthError(t("인증 이메일을 확인해주세요!", "请查看验证邮件！"));
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) {
        setAuthError(t("이메일 또는 비밀번호가 틀렸습니다.", "邮箱或密码错误。"));
      } else {
        setShowAuth(false);
        setAuthEmail(""); setAuthPassword(""); setAuthNickname("");
      }
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ── 글 등록 ──
  const handleWriteSubmit = async () => {
    if (!user) { setShowAuth(true); return; }
    if (!writeCat || !writeTag || !writeTitle.trim() || !writeContent.trim()) return;
    setWriteLoading(true);
    setWriteError("");

    const nickname = writeAnon
      ? t("익명", "匿名")
      : (user.user_metadata?.nickname || user.email?.split("@")[0] || t("익명", "匿名"));

    const { error } = await supabase.from("posts").insert({
      category: writeCat,
      tag: writeTag,
      title: writeTitle,
      title_zh: writeTitle,
      content: writeContent,
      content_zh: writeContent,
      author_id: user.id,
      author_name: nickname,
      views: 0,
      likes: 0,
      comments_count: 0,
    });

    if (!error) {
      setWriteTitle(""); setWriteContent(""); setWriteCat(""); setWriteTag(""); setWriteAnon(false);
      goHome();
    } else {
      // [fix] 에러 피드백 추가
      setWriteError(t("등록에 실패했습니다. 다시 시도해주세요.", "发帖失败，请重试。"));
    }
    setWriteLoading(false);
  };

  // ── 댓글 등록 ──
  const handleCommentSubmit = async () => {
    if (!user) { setShowAuth(true); return; }
    if (!commentInput.trim() || !selectedPost) return;
    setCommentLoading(true);

    const nickname = user.user_metadata?.nickname || user.email?.split("@")[0] || t("익명", "匿名");

    const { data, error } = await supabase.from("replies").insert({
      post_id: selectedPost.id,
      author_id: user.id,
      author_name: nickname,
      content: commentInput,
      content_zh: commentInput,
      likes: 0,
      is_author: selectedPost.author_id === user.id,
    }).select().single();

    if (!error && data) {
      setReplies(prev => [...prev, data]);
      setCommentInput("");
      await supabase.from("posts")
        .update({ comments_count: (selectedPost.comments_count || 0) + 1 })
        .eq("id", selectedPost.id);
      setSelectedPost(prev => ({ ...prev, comments_count: (prev?.comments_count || 0) + 1 }));
    }
    setCommentLoading(false);
  };

  // ── 공통 뱃지 ──
  const CatBadge = ({ catId }) => {
    const cat = getCategoryInfo(catId);
    return <span style={{ ...TAG_STYLE, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, whiteSpace: "nowrap" }}>{lang === "ko" ? cat.ko : cat.zh}</span>;
  };

  const TagBadge = ({ tag }) => {
    if (!tag) return null;
    const allTags = Object.values(TAGS).flat();
    const found = allTags.find(t => t.ko === tag);
    const label = found ? (lang === "ko" ? found.ko : found.zh) : tag;
    return <span style={{ ...TAG_GRAY, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, whiteSpace: "nowrap" }}>[{label}]</span>;
  };

  // ── Auth 모달 ──
  const AuthModal = () => (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onPointerDown={e => { backdropPointerDownTarget.current = e.target; }} // [fix] onPointerDown: 모바일 터치 호환
      onClick={e => {
        if (e.target === e.currentTarget && backdropPointerDownTarget.current === e.currentTarget) {
          setShowAuth(false); setAuthError("");
        }
      }}
    >
      {/* [fix] maxHeight + overflowY: 키보드 올라올 때 모달 잘림 방지 */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360, maxHeight: "90dvh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a" }}>
            {authMode === "login" ? t("로그인", "登录") : t("회원가입", "注册")}
          </span>
          <button onClick={() => { setShowAuth(false); setAuthError(""); }} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999" }}>×</button>
        </div>

        <form onSubmit={handleAuth}>
          {authMode === "signup" && (
            <input
              value={authNickname} onChange={e => setAuthNickname(e.target.value)}
              placeholder={t("닉네임", "昵称")} required
              autoComplete="nickname" // [fix] autoComplete 추가
              style={{ ...INPUT_STYLE, marginBottom: 10 }}
            />
          )}
          <input
            type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)}
            placeholder={t("이메일", "邮箱")} required
            autoComplete="email" // [fix]
            style={{ ...INPUT_STYLE, marginBottom: 10 }}
          />
          <input
            type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)}
            placeholder={t("비밀번호 (6자 이상)", "密码（6位以上）")} required minLength={6}
            autoComplete={authMode === "login" ? "current-password" : "new-password"} // [fix]
            style={{ ...INPUT_STYLE, marginBottom: 14 }}
          />

          {authError && (
            <p style={{ fontSize: 12, color: authError.includes("인증") || authError.includes("查看") ? "#27ae60" : "#C0392B", marginBottom: 10, textAlign: "center" }}>
              {authError}
            </p>
          )}

          <button type="submit" disabled={authLoading}
            style={{ width: "100%", background: "#C0392B", color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: authLoading ? "not-allowed" : "pointer", opacity: authLoading ? 0.7 : 1 }}>
            {authLoading ? "..." : (authMode === "login" ? t("로그인", "登录") : t("회원가입", "注册"))}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 14 }}>
          <button onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthError(""); }}
            style={{ background: "none", border: "none", fontSize: 13, color: "#666", cursor: "pointer", textDecoration: "underline" }}>
            {authMode === "login" ? t("계정이 없으신가요? 회원가입", "没有账号？注册") : t("이미 계정이 있으신가요? 로그인", "已有账号？登录")}
          </button>
        </div>
      </div>
    </div>
  );

  // ── 헤더 ──
  const Header = () => (
    <header style={{ background: "#fff", position: "sticky", top: 0, zIndex: 100, padding: "0 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
        <button onClick={goHome} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#C0392B", letterSpacing: -1 }}>在韩生活</span>
          <span style={{ fontSize: 10, color: "#888", marginLeft: 6 }}>{t("재한생활", "在韩社区")}</span>
        </button>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setLang(lang === "ko" ? "zh" : "ko")}
            style={{ background: "#F5F5F5", border: "1px solid #ddd", borderRadius: 20, padding: "4px 11px", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#444" }}>
            {lang === "ko" ? "CN 中文" : "KR 한국어"}
          </button>
          {user ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#444", fontWeight: 600 }}>
                {user.user_metadata?.nickname || user.email?.split("@")[0]}
              </span>
              <button onClick={handleLogout}
                style={{ background: "#F5F5F5", color: "#666", border: "1px solid #ddd", borderRadius: 6, padding: "6px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                {t("로그아웃", "退出")}
              </button>
            </div>
          ) : (
            <button onClick={() => { setShowAuth(true); setAuthMode("login"); }}
              style={{ background: "#C0392B", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {t("로그인", "登录")}
            </button>
          )}
        </div>
      </div>
      <div style={{ borderBottom: "1px solid #eee" }}>
        <div style={{ display: "flex", overflowX: "auto", scrollbarWidth: "none", padding: "0 4px" }}>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => { setSelectedCategory(cat.id); setView("home"); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 11px 8px", fontSize: 12, fontWeight: selectedCategory === cat.id ? 700 : 400, color: selectedCategory === cat.id ? "#C0392B" : "#666", whiteSpace: "nowrap", position: "relative" }}>
              {lang === "ko" ? cat.ko : cat.zh}
              {selectedCategory === cat.id && (
                <span style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", width: "70%", height: 3, background: "#C0392B", borderRadius: 99, display: "block" }} />
              )}
            </button>
          ))}
        </div>
      </div>
    </header>
  );

  // ── 슬라이드 배너 ──
  const Banner = () => (
    <div style={{ padding: "12px 16px 0" }}>
      <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", background: "#D5D5D5", height: 130 }}>
        {BANNERS.map((_, i) => (
          <div key={i} style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, opacity: i === bannerIdx ? 1 : 0, transition: "opacity 0.4s ease" }}>
            <span style={{ fontSize: 13, color: "#888", fontWeight: 600 }}>배너 {i + 1}</span>
            <span style={{ fontSize: 11, color: "#aaa" }}>배너가 등록될 공간입니다</span>
          </div>
        ))}
        <button onClick={() => moveBanner(-1)} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.18)", border: "none", borderRadius: "50%", width: 26, height: 26, color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
        <button onClick={() => moveBanner(1)}  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.18)", border: "none", borderRadius: "50%", width: 26, height: 26, color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
        <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4 }}>
          {BANNERS.map((_, i) => (
            <button key={i} onClick={() => setBannerIdx(i)} style={{ width: bannerIdx === i ? 16 : 5, height: 5, borderRadius: 99, background: bannerIdx === i ? "#fff" : "rgba(255,255,255,0.5)", border: "none", padding: 0, cursor: "pointer", transition: "all 0.3s" }} />
          ))}
        </div>
      </div>
    </div>
  );

  // ── 바로가기 아이콘 ──
  const Shortcuts = () => (
    <div style={{ background: "#fff", padding: "16px 16px 12px", borderBottom: "8px solid #F5F5F5" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px 0" }}>
        {SHORTCUTS.map(s => (
          <button key={s.id} onClick={() => handleShortcut(s.id)}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "#FEF0EF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
              {s.emoji}
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#444" }}>{lang === "ko" ? s.ko : s.zh}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // ── 글쓰기 ──
  const WriteView = () => {
    const canSubmit = writeCat && writeTag && writeTitle.trim() && writeContent.trim();
    return (
      <div style={{ background: "#fff", minHeight: "100vh" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={goHome} style={{ background: "none", border: "none", cursor: "pointer", color: "#C0392B", fontSize: 13, fontWeight: 600, padding: 0 }}>← {t("취소", "取消")}</button>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>{t("글쓰기", "发帖")}</span>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#333", marginBottom: 8 }}>{t("게시판", "版块")} <span style={{ color: "#C0392B" }}>*</span></div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CATEGORIES.filter(c => !["all","popular"].includes(c.id)).map(cat => (
                <button key={cat.id} onClick={() => { setWriteCat(cat.id); setWriteTag(""); }}
                  style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid", background: writeCat === cat.id ? "#C0392B" : "#fff", color: writeCat === cat.id ? "#fff" : "#666", borderColor: writeCat === cat.id ? "#C0392B" : "#ddd" }}>
                  {lang === "ko" ? cat.ko : cat.zh}
                </button>
              ))}
            </div>
          </div>

          {writeCat && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#333", marginBottom: 8 }}>{t("말머리", "标签")} <span style={{ color: "#C0392B" }}>*</span></div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {TAGS[writeCat].map(tag => (
                  <button key={tag.ko} onClick={() => setWriteTag(tag.ko)}
                    style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid", background: writeTag === tag.ko ? "#FEF0EF" : "#fff", color: writeTag === tag.ko ? "#C0392B" : "#666", borderColor: writeTag === tag.ko ? "#FFCDD2" : "#ddd" }}>
                    [{lang === "ko" ? tag.ko : tag.zh}]
                  </button>
                ))}
              </div>
            </div>
          )}

          <input
            value={writeTitle} onChange={e => setWriteTitle(e.target.value)}
            placeholder={t("제목을 입력하세요", "请输入标题")}
            style={{ ...INPUT_STYLE, marginBottom: 10 }}
          />
          <textarea
            value={writeContent} onChange={e => setWriteContent(e.target.value)}
            placeholder={t("내용을 입력하세요", "请输入内容")}
            style={{ ...INPUT_STYLE, resize: "none", height: 180, marginBottom: 10 }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
            <input type="checkbox" id="anon" checked={writeAnon} onChange={e => setWriteAnon(e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
            <label htmlFor="anon" style={{ fontSize: 13, color: "#666", cursor: "pointer" }}>{t("익명으로 작성", "匿名发帖")}</label>
          </div>

          {writeError && (
            <p style={{ fontSize: 12, color: "#C0392B", textAlign: "center", marginBottom: 8 }}>{writeError}</p>
          )}

          <button
            onClick={handleWriteSubmit}
            disabled={writeLoading || !canSubmit}
            style={{ width: "100%", background: canSubmit ? "#C0392B" : "#ddd", color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: writeLoading || !canSubmit ? "not-allowed" : "pointer", opacity: writeLoading ? 0.7 : 1 }} // [fix] disabled cursor
          >
            {writeLoading ? "..." : t("등록하기", "提交")}
          </button>
          {(!writeCat || !writeTag) && (
            <p style={{ textAlign: "center", fontSize: 11, color: "#C0392B", marginTop: 6 }}>{t("게시판과 말머리를 선택해주세요", "请选择版块和标签")}</p>
          )}
        </div>
      </div>
    );
  };

  // ── 글 상세 ──
  const DetailView = () => {
    const post = selectedPost;
    return (
      <div style={{ background: "#fff", minHeight: "100vh" }}>
        <div style={{ padding: "16px 16px 0" }}>
          <button onClick={goHome} style={{ background: "none", border: "none", cursor: "pointer", color: "#C0392B", fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 12 }}>
            ← {t("목록으로", "返回列表")}
          </button>
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            <CatBadge catId={post.category} />
            <TagBadge tag={post.tag} />
          </div>
          <h1 style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.5, color: "#1a1a1a", margin: "0 0 12px" }}>
            {lang === "ko" ? post.title : (post.title_zh || post.title)}
          </h1>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: "1px solid #eee" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#C0392B", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                {(post.author_name || "?")[0]}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>{post.author_name}</div>
                <div style={{ fontSize: 11, color: "#999" }}>{formatDate(post.created_at)}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#999" }}>
              <span>👁 {(post.views || 0).toLocaleString()}</span>
              <span>👍 {post.likes || 0}</span>
              <span>💬 {post.comments_count || 0}</span>
            </div>
          </div>
        </div>

        <div style={{ padding: "16px", fontSize: 14, lineHeight: 1.9, color: "#333", borderBottom: "8px solid #F5F5F5" }}>
          {(lang === "ko" ? post.content : (post.content_zh || post.content)).split('\n').map((line, i) =>
            <p key={i} style={{ margin: "0 0 8px" }}>{line}</p>
          )}
        </div>

        <div style={{ padding: "14px 16px", display: "flex", gap: 8, borderBottom: "8px solid #F5F5F5" }}>
          <button style={{ flex: 1, background: "#FEF0EF", border: "1px solid #FCCBC8", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700, color: "#C0392B", cursor: "pointer" }}>
            👍 {t("추천", "推荐")} {post.likes || 0}
          </button>
          <button style={{ flex: 1, background: "#F5F5F5", border: "1px solid #ddd", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700, color: "#666", cursor: "pointer" }}>
            🔖 {t("북마크", "收藏")}
          </button>
          <button style={{ background: "#F5F5F5", border: "1px solid #ddd", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#999", cursor: "pointer" }}>🚩</button>
        </div>

        <div style={{ padding: "16px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#333", marginBottom: 12 }}>
            💬 {t("댓글", "评论")} {replies.length}
          </div>
          {replies.map(reply => (
            <div key={reply.id} style={{ padding: "12px", background: reply.is_author ? "#FFF8F8" : "#FAFAFA", borderRadius: 8, marginBottom: 8, border: reply.is_author ? "1px solid #FFCDD2" : "1px solid #eee" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: reply.is_author ? "#C0392B" : "#333" }}>
                  {reply.author_name}
                  {reply.is_author && <span style={{ fontSize: 10, background: "#C0392B", color: "#fff", padding: "1px 5px", borderRadius: 3, marginLeft: 4 }}>{t("작성자", "作者")}</span>}
                </span>
                <span style={{ fontSize: 11, color: "#999" }}>{formatDate(reply.created_at)}</span>
              </div>
              <p style={{ fontSize: 13, color: "#444", margin: 0, lineHeight: 1.6 }}>
                {lang === "ko" ? reply.content : (reply.content_zh || reply.content)}
              </p>
              <div style={{ marginTop: 6, fontSize: 11, color: "#999", display: "flex", gap: 10 }}>
                <span style={{ cursor: "pointer" }}>👍 {reply.likes || 0}</span>
                <span style={{ cursor: "pointer" }}>↩ {t("답글", "回复")}</span>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 12, background: "#F5F5F5", borderRadius: 8, padding: 12 }}>
            <textarea
              value={commentInput} onChange={e => setCommentInput(e.target.value)}
              placeholder={user ? t("댓글을 입력하세요", "请输入评论") : t("댓글을 입력하세요 (로그인 필요)", "请输入评论（需要登录）")}
              style={{ ...INPUT_STYLE, resize: "none", height: 72, background: "#fff" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
              <button onClick={handleCommentSubmit} disabled={commentLoading}
                style={{ background: "#C0392B", color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: commentLoading ? "not-allowed" : "pointer", opacity: commentLoading ? 0.7 : 1 }}>
                {commentLoading ? "..." : t("등록", "提交")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: "'Noto Sans KR','Noto Sans SC','Apple SD Gothic Neo',sans-serif", background: "#F5F5F5", minHeight: "100vh", maxWidth: 480, margin: "0 auto" }}>
      {Header()}

      {showAuth && AuthModal()}
      {view === "write"  && WriteView()}
      {view === "detail" && selectedPost && DetailView()}
      {view === "home"   && (
        <div>
          {/* 검색바 */}
          <div style={{ padding: "10px 16px", background: "#fff", borderBottom: "1px solid #eee" }}>
            <div style={{ position: "relative" }}>
              <input
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder={t("검색어를 입력하세요", "请输入搜索内容")}
                style={{ ...INPUT_STYLE, padding: "8px 36px 8px 12px", background: "#F8F8F8" }}
              />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15 }}>🔍</span>
            </div>
          </div>

          {(selectedCategory === "all" || selectedCategory === "popular") && (
            <>
              {Banner()}
              {Shortcuts()}
            </>
          )}

          {/* 정렬 바 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 16px", background: "#fff", borderBottom: "1px solid #eee" }}>
            <span style={{ fontSize: 12, color: "#666", fontWeight: 600 }}>
              {selectedCategory === "popular" ? t("👍 추천 많은 순", "👍 推荐最多") : t("최신글", "最新帖子")}
            </span>
            {selectedCategory !== "popular" && (
              <div style={{ display: "flex", gap: 5 }}>
                {[{ id: "latest", ko: "최신순", zh: "最新" }, { id: "views", ko: "조회순", zh: "浏览" }, { id: "likes", ko: "추천순", zh: "推荐" }].map(s => (
                  <button key={s.id} onClick={() => setSortBy(s.id)}
                    style={{ background: sortBy === s.id ? "#C0392B" : "#F5F5F5", color: sortBy === s.id ? "#fff" : "#666", border: "none", borderRadius: 5, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    {lang === "ko" ? s.ko : s.zh}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 게시글 목록 */}
          <div style={{ paddingBottom: 80 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 13 }}>
                {t("불러오는 중...", "加载中...")}
              </div>
            ) : posts.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center", color: "#aaa", fontSize: 13 }}>
                {t("아직 게시글이 없어요. 첫 글을 작성해보세요!", "还没有帖子，来发第一帖吧！")}
              </div>
            ) : (
              posts.map(post => (
                <div key={post.id} onClick={() => openPost(post)}
                  style={{ background: "#fff", padding: "14px 16px", borderBottom: "1px solid #eee", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#FFFAF9"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                  <div style={{ display: "flex", gap: 5, marginBottom: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <CatBadge catId={post.category} />
                    <TagBadge tag={post.tag} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.5, marginBottom: 6 }}>
                    {lang === "ko" ? post.title : (post.title_zh || post.title)}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#999" }}>{post.author_name} · {formatDate(post.created_at)}</span>
                    <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#999" }}>
                      <span>👁 {(post.views || 0).toLocaleString()}</span>
                      <span>👍 {post.likes || 0}</span>
                      <span>💬 {post.comments_count || 0}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* [fix] FAB 위치: max()로 모바일에서 음수 방지 */}
          <button
            onClick={() => { if (user) { window.scrollTo(0, 0); setView("write"); } else setShowAuth(true); }}
            style={{ position: "fixed", bottom: 24, right: "max(16px, calc(50% - 224px))", background: "#C0392B", color: "#fff", border: "none", borderRadius: 28, padding: "13px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(192,57,43,0.45)", display: "flex", alignItems: "center", gap: 6, zIndex: 200 }}>
            ✏️ {t("글쓰기", "发帖")}
          </button>
        </div>
      )}
    </div>
  );
}
