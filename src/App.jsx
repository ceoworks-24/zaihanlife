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
  const [userProfile, setUserProfile] = useState(null);
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

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Navigation
  const [prevView, setPrevView] = useState("home");

  // Likes
  const [likedPostIds, setLikedPostIds] = useState(new Set());

  // Bookmark
  const [bookmarkedPostIds, setBookmarkedPostIds] = useState(new Set());
  const [bookmarkPosts, setBookmarkPosts] = useState([]);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  // Notice
  const [noticePosts, setNoticePosts] = useState([]);
  const [noticeLoading, setNoticeLoading] = useState(false);

  // Suggest
  const [suggestPosts, setSuggestPosts] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestWriteMode, setSuggestWriteMode] = useState(false);
  const [suggestTitle, setSuggestTitle] = useState("");
  const [suggestContent, setSuggestContent] = useState("");
  const [suggestSubmitLoading, setSuggestSubmitLoading] = useState(false);

  // Auth modal
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authNickname, setAuthNickname] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const backdropPointerDownTarget = useRef(null); // [fix] onPointerDown으로 변경 (모바일 터치 호환)

  // 검색 debounce 타이머
  const searchTimerRef = useRef(null);
  const toastTimerRef = useRef(null);

  // Toast
  const [toastMsg, setToastMsg] = useState("");

  // Report
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  // Suggest password
  const [suggestPassword, setSuggestPassword] = useState("");
  const [showSuggestPwModal, setShowSuggestPwModal] = useState(false);
  const [suggestPwInput, setSuggestPwInput] = useState("");
  const [suggestPwError, setSuggestPwError] = useState("");
  const [pendingSuggestPost, setPendingSuggestPost] = useState(null);

  const t = (ko, zh) => lang === "ko" ? ko : zh;

  // 작성자명: user_id 없으면 "익명"/"匿名", 있으면 닉네임 (없으면 "?")
  const getAuthor = (row) =>
    row.user_id
      ? (row.profiles?.nickname || "?")
      : t("익명", "匿名");

  const ADMIN_EMAIL = "problemcompany1@naver.com";
  const canDelete = (post) =>
    user && (user.email === ADMIN_EMAIL || (post.user_id && post.user_id === user.id));

  const handleDeletePost = async () => {
    if (!selectedPost) return;
    setDeleteLoading(true);
    const { error, count } = await supabase
      .from("posts")
      .delete({ count: "exact" })
      .eq("id", selectedPost.id);
    setDeleteLoading(false);
    if (error || count === 0) {
      console.error("[delete post]", error || "0 rows deleted – RLS policy may be blocking admin delete");
      alert(t("삭제에 실패했습니다.", "删除失败。"));
    } else {
      setShowDeleteConfirm(false);
      goHome();
    }
  };

  // ── 추천(좋아요) 함수 ──
  const fetchLikedPostIds = async () => {
    if (!user) { setLikedPostIds(new Set()); return; }
    const { data } = await supabase.from("post_likes").select("post_id").eq("user_id", user.id);
    setLikedPostIds(new Set(data?.map(l => l.post_id) || []));
  };

  const toggleLike = async (postId) => {
    if (!user) { setShowAuth(true); return; }
    const isLiked = likedPostIds.has(postId);
    const currentCount = selectedPost?.like_count || 0;
    const newCount = Math.max(0, currentCount + (isLiked ? -1 : 1));

    // Optimistic update
    setLikedPostIds(prev => {
      const s = new Set(prev);
      isLiked ? s.delete(postId) : s.add(postId);
      return s;
    });
    setSelectedPost(prev => prev ? { ...prev, like_count: newCount } : prev);

    let error;
    if (isLiked) {
      ({ error } = await supabase.from("post_likes").delete().eq("user_id", user.id).eq("post_id", postId));
    } else {
      ({ error } = await supabase.from("post_likes").insert({ user_id: user.id, post_id: postId }));
    }

    if (error) {
      console.error("[toggleLike]", error);
      // Revert
      setLikedPostIds(prev => {
        const s = new Set(prev);
        isLiked ? s.add(postId) : s.delete(postId);
        return s;
      });
      setSelectedPost(prev => prev ? { ...prev, like_count: currentCount } : prev);
      return;
    }

    await supabase.from("posts").update({ like_count: newCount }).eq("id", postId);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, like_count: newCount } : p));
  };

  // ── 북마크 함수 ──
  const fetchBookmarkedPostIds = async () => {
    if (!user) { setBookmarkedPostIds(new Set()); return; }
    const { data } = await supabase.from("bookmarks").select("post_id").eq("user_id", user.id);
    setBookmarkedPostIds(new Set(data?.map(b => b.post_id) || []));
  };

  const fetchBookmarkPosts = async () => {
    if (!user) return;
    setBookmarkLoading(true);

    // Step 1: 북마크된 post_id 목록 (생성순 유지)
    const { data: bData, error: bError } = await supabase
      .from("bookmarks")
      .select("post_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (bError) {
      console.error("[fetchBookmarkPosts]", bError);
      setBookmarkPosts([]);
      setBookmarkLoading(false);
      return;
    }

    const postIds = (bData || []).map(b => b.post_id);
    if (postIds.length === 0) {
      setBookmarkPosts([]);
      setBookmarkLoading(false);
      return;
    }

    // Step 2: posts 조회
    const { data: postsData, error: postsError } = await supabase
      .from("posts")
      .select("*, profiles!posts_user_id_fkey(nickname)")
      .in("id", postIds);

    if (postsError) {
      console.error("[fetchBookmarkPosts posts]", postsError);
      setBookmarkPosts([]);
    } else {
      const postMap = Object.fromEntries((postsData || []).map(p => [p.id, p]));
      setBookmarkPosts(postIds.map(id => postMap[id]).filter(Boolean));
    }
    setBookmarkLoading(false);
  };

  const toggleBookmark = async (postId) => {
    if (!user) { setShowAuth(true); return; }
    if (bookmarkedPostIds.has(postId)) {
      await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("post_id", postId);
      setBookmarkedPostIds(prev => { const s = new Set(prev); s.delete(postId); return s; });
    } else {
      await supabase.from("bookmarks").insert({ user_id: user.id, post_id: postId });
      setBookmarkedPostIds(prev => new Set([...prev, postId]));
    }
  };

  // ── 공지 함수 ──
  const fetchNoticePosts = async () => {
    setNoticeLoading(true);
    const { data } = await supabase
      .from("posts")
      .select("*, profiles!posts_user_id_fkey(nickname)")
      .eq("category", "notice")
      .order("created_at", { ascending: false });
    setNoticePosts(data || []);
    setNoticeLoading(false);
  };

  // ── 건의 함수 ──
  const fetchSuggestPosts = async () => {
    if (!user) return;
    setSuggestLoading(true);
    let q = supabase
      .from("posts")
      .select("*, profiles!posts_user_id_fkey(nickname)")
      .eq("category", "suggest")
      .order("created_at", { ascending: false });
    if (user.email !== ADMIN_EMAIL) q = q.eq("user_id", user.id);
    const { data } = await q;
    setSuggestPosts(data || []);
    setSuggestLoading(false);
  };

  const handleSuggestSubmit = async () => {
    if (!user || !suggestTitle.trim() || !suggestContent.trim()) return;
    setSuggestSubmitLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setUser(null); setShowAuth(true); setSuggestSubmitLoading(false); return; }
    const { error } = await supabase.from("posts").insert({
      category: "suggest", tag: "건의",
      title: suggestTitle, content: suggestContent,
      user_id: session.user.id, view_count: 0, like_count: 0, comment_count: 0,
      password: suggestPassword.trim() || null,
    });
    if (!error) {
      setSuggestTitle(""); setSuggestContent(""); setSuggestWriteMode(false);
      setSuggestPassword("");
      fetchSuggestPosts();
    }
    setSuggestSubmitLoading(false);
  };

  // ── 토스트 ──
  const showToast = (msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(""), 2500);
  };

  // ── 공유하기 ──
  const handleShare = async (postId) => {
    const url = `${window.location.origin}${window.location.pathname}?p=${postId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // 구형 브라우저 폴백
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    showToast(t("링크가 복사됐습니다", "链接已复制"));
  };

  // ── 신고 ──
  const handleReport = async () => {
    if (!user) { setShowAuth(true); setShowReportModal(false); return; }
    if (!reportReason.trim()) return;
    setReportLoading(true);

    const { error } = await supabase.from("reports").insert({
      post_id: selectedPost.id,
      reporter_id: user.id,
      reason: reportReason,
    });

    if (error) {
      console.error("[report insert]", error);
      setReportLoading(false);
      return;
    }

    setShowReportModal(false);
    setReportReason("");
    setReportLoading(false);
    showToast(t("신고가 접수됐습니다.", "已举报。"));
  };

  // ── 배너 타이머 ──
  useEffect(() => {
    timerRef.current = setInterval(() => setBannerIdx(p => (p + 1) % BANNERS.length), 5000);
    return () => clearInterval(timerRef.current);
  }, []);

  // ── profiles 조회 + 없으면 자동 생성 ──
  const ensureUserProfile = async (userId, fallbackNickname) => {
    if (!userId) { setUserProfile(null); return; }
    const { data, error } = await supabase
      .from("profiles").select("nickname").eq("id", userId).single();
    if (data) {
      setUserProfile(data);
    } else {
      const nickname = fallbackNickname || userId.slice(0, 8);
      const { error: upsertError } = await supabase
        .from("profiles").upsert({ id: userId, nickname });
      if (upsertError) console.error("[profiles upsert]", upsertError.message);
      else setUserProfile({ nickname });
    }
  };

  // ── Auth 상태 감지 ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      ensureUserProfile(
        session?.user?.id ?? null,
        session?.user?.user_metadata?.nickname ?? null
      );
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      ensureUserProfile(
        session?.user?.id ?? null,
        session?.user?.user_metadata?.nickname ?? null
      );
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── 딥링크: ?p=<postId> 로 공유된 링크 처리 ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get("p");
    if (!postId) return;
    supabase
      .from("posts")
      .select("*, profiles!posts_user_id_fkey(nickname)")
      .eq("id", postId)
      .single()
      .then(({ data }) => { if (data) openPost(data); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── fetchPosts: 카테고리/정렬 변경 시 즉시, 검색어 변경 시 400ms 디바운스 ──
  const fetchPosts = async (cat, sort, query) => {
    setLoading(true);
    let q = supabase.from("posts").select("*, profiles!posts_user_id_fkey(nickname)").neq("category", "suggest");
    if (cat === "popular") {
      q = q.order("like_count", { ascending: false });
    } else {
      if (cat !== "all") q = q.eq("category", cat);
      if (query.trim()) q = q.ilike("title", `%${query}%`);
      if (sort === "views")      q = q.order("view_count",  { ascending: false });
      else if (sort === "likes") q = q.order("like_count",  { ascending: false });
      else                       q = q.order("created_at",  { ascending: false });
    }
    const { data, error } = await q;
    if (error) console.error("[fetchPosts error]", error);
    setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    if (searchQuery.trim()) {
      // 검색어 입력: 400ms 디바운스
      searchTimerRef.current = setTimeout(
        () => fetchPosts(selectedCategory, sortBy, searchQuery),
        400
      );
      return () => clearTimeout(searchTimerRef.current);
    }
    // 카테고리/정렬 변경 or 검색어 지움: 즉시 로드
    fetchPosts(selectedCategory, sortBy, searchQuery);
  }, [selectedCategory, sortBy, searchQuery]);

  // ── 북마크/추천 ID 동기화 ──
  useEffect(() => {
    if (user) {
      fetchBookmarkedPostIds();
      fetchLikedPostIds();
    } else {
      setBookmarkedPostIds(new Set());
      setLikedPostIds(new Set());
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 뷰 전환 시 데이터 로드 ──
  useEffect(() => {
    if (view === "bookmark" && user) fetchBookmarkPosts();
    if (view === "notice") fetchNoticePosts();
    if (view === "suggest" && user) fetchSuggestPosts();
  }, [view, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 게시글 열기 ──
  const openPost = async (post, fromView = "home") => {
    setPrevView(fromView);
    window.scrollTo(0, 0);
    setSelectedPost(post);
    setView("detail");
    setReplies([]);

    await supabase.from("posts").update({ view_count: (post.view_count || 0) + 1 }).eq("id", post.id);
    setSelectedPost(prev => ({ ...prev, view_count: (prev?.view_count || 0) + 1 }));

    const { data: commentsData, error: commentsError } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    if (commentsError) {
      console.error("[fetch comments]", commentsError);
      setReplies([]);
    } else if (commentsData?.length > 0) {
      const userIds = [...new Set(commentsData.filter(c => c.user_id).map(c => c.user_id))];
      const { data: profilesData } = userIds.length > 0
        ? await supabase.from("profiles").select("id, nickname").in("id", userIds)
        : { data: [] };
      const profileMap = Object.fromEntries((profilesData || []).map(p => [p.id, p]));
      setReplies(commentsData.map(c => ({ ...c, is_author: c.user_id != null && c.user_id === post.user_id, profiles: profileMap[c.user_id] || null })));
    } else {
      setReplies([]);
    }
  };

  const goHome = () => {
    window.scrollTo(0, 0);
    setView("home");
    setSelectedPost(null);
    setReplies([]);
    setSuggestWriteMode(false);
    fetchPosts(selectedCategory, sortBy, searchQuery);
  };

  const goBackFromDetail = () => {
    window.scrollTo(0, 0);
    setSelectedPost(null);
    setReplies([]);
    if (prevView === "home") {
      setView("home");
      fetchPosts(selectedCategory, sortBy, searchQuery);
    } else {
      setView(prevView);
    }
  };

  const handleShortcut = (id) => {
    window.scrollTo(0, 0);
    if (["free","visa","housing","job","popular"].includes(id)) {
      setSelectedCategory(id); setView("home");
    } else if (id === "bookmark") {
      if (!user) { setShowAuth(true); return; }
      setView("bookmark");
    } else if (id === "notice") {
      setView("notice");
    } else if (id === "suggest") {
      if (!user) { setShowAuth(true); return; }
      setSuggestWriteMode(false);
      setView("suggest");
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
    setAuthError("");

    // 클라이언트 사전 검증 — 422 방지
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(authEmail)) {
      setAuthError(t("올바른 이메일 형식이 아닙니다.", "邮箱格式不正确。"));
      return;
    }
    if (authPassword.length < 6) {
      setAuthError(t("비밀번호는 6자 이상이어야 합니다.", "密码至少需要6位。"));
      return;
    }

    setAuthLoading(true);

    if (authMode === "signup") {
      const params = { email: authEmail.trim(), password: authPassword, options: { data: { nickname: authNickname.trim() } } };
      console.log("[signUp params]", { email: params.email, passwordLength: params.password.length, nickname: params.options.data.nickname });

      const { data, error } = await supabase.auth.signUp(params);
      console.log("[signUp result]", { data, error });

      if (error) {
        setAuthError(`${error.message} (${error.status ?? error.code ?? ""})`);
      } else if (data.session) {
        // ensureUserProfile이 onAuthStateChange에서 자동 호출됨
        setShowAuth(false);
        setAuthEmail(""); setAuthPassword(""); setAuthNickname("");
      } else {
        setAuthError(t("인증 이메일을 확인해주세요!", "请查看验证邮件！"));
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      });
      if (error) {
        setAuthError(`${error.message} (${error.status ?? error.code ?? ""})`);
      } else {
        // ensureUserProfile이 onAuthStateChange에서 자동 호출됨
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
    if (writeCat === "notice" && user.email !== ADMIN_EMAIL) {
      setWriteError(t("운영자만 공지를 작성할 수 있습니다.", "只有管理员可以发公告。"));
      return;
    }
    const tagRequired = !["notice"].includes(writeCat);
    if (!writeCat || (tagRequired && !writeTag) || !writeTitle.trim() || !writeContent.trim()) return;
    setWriteLoading(true);
    setWriteError("");

    // 세션이 실제로 살아있는지 재확인
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setUser(null);
      setShowAuth(true);
      setWriteLoading(false);
      return;
    }

    const { error } = await supabase.from("posts").insert({
      category: writeCat,
      tag: writeTag,
      title: writeTitle,
      content: writeContent,
      user_id: session.user.id,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
    });

    if (!error) {
      setWriteTitle(""); setWriteContent(""); setWriteTag(""); setWriteAnon(false);
      const cat = writeCat;
      setWriteCat("");
      if (cat === "notice") { setView("notice"); fetchNoticePosts(); }
      else goHome();
    } else {
      console.error("[글쓰기 오류]", error);
      setWriteError(`오류: ${error.message}`);
    }
    setWriteLoading(false);
  };

  // ── 댓글 등록 ──
  const handleCommentSubmit = async () => {
    if (!user) { setShowAuth(true); return; }
    if (!commentInput.trim() || !selectedPost) return;
    setCommentLoading(true);

    const { data, error } = await supabase.from("comments").insert({
      post_id: selectedPost.id,
      user_id: user.id,
      content: commentInput,
    }).select("*").single();

    if (error) {
      console.error("[comment insert]", error);
      showToast(t("댓글 등록에 실패했습니다.", "评论提交失败。"));
    } else if (data) {
      const replyWithProfile = {
        ...data,
        is_author: selectedPost.user_id != null && selectedPost.user_id === user.id,
        profiles: { nickname: userProfile?.nickname || user.user_metadata?.nickname || "?" },
      };
      setReplies(prev => [...prev, replyWithProfile]);
      setCommentInput("");
      await supabase.from("posts")
        .update({ comment_count: (selectedPost.comment_count || 0) + 1 })
        .eq("id", selectedPost.id);
      setSelectedPost(prev => ({ ...prev, comment_count: (prev?.comment_count || 0) + 1 }));
    }
    setCommentLoading(false);
  };

  // ── 건의 비밀번호 ──
  const handleSuggestPostClick = (post) => {
    if (!post.password || user?.email === ADMIN_EMAIL || post.user_id === user?.id) {
      openPost(post, "suggest");
    } else {
      setPendingSuggestPost(post);
      setSuggestPwInput("");
      setSuggestPwError("");
      setShowSuggestPwModal(true);
    }
  };

  const handleSuggestPwSubmit = () => {
    if (!pendingSuggestPost) return;
    if (suggestPwInput === pendingSuggestPost.password) {
      setShowSuggestPwModal(false);
      setSuggestPwInput("");
      setSuggestPwError("");
      openPost(pendingSuggestPost, "suggest");
      setPendingSuggestPost(null);
    } else {
      setSuggestPwError(t("비밀번호가 틀렸습니다.", "密码错误。"));
    }
  };

  // ── 공통 뱃지 ──
  const CatBadge = ({ catId }) => {
    if (catId === "notice") return <span style={{ background: "#EBF5FB", color: "#1A5276", border: "1px solid #AED6F1", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, whiteSpace: "nowrap" }}>📣 {t("공지", "公告")}</span>;
    if (catId === "suggest") return <span style={{ background: "#E9F7EF", color: "#1E8449", border: "1px solid #A9DFBF", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, whiteSpace: "nowrap" }}>📮 {t("건의", "建议")}</span>;
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
                {userProfile?.nickname || user.user_metadata?.nickname || user.email?.split("@")[0]}
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
    const isNotice = writeCat === "notice";
    const tagRequired = !isNotice;
    const canSubmit = writeCat && (!tagRequired || writeTag) && writeTitle.trim() && writeContent.trim();
    const handleCancel = () => { if (isNotice) setView("notice"); else goHome(); };
    return (
      <div style={{ background: "#fff", minHeight: "100vh" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={handleCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "#C0392B", fontSize: 13, fontWeight: 600, padding: 0 }}>← {t("취소", "取消")}</button>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>
            {isNotice ? `📣 ${t("공지 작성", "发公告")}` : t("글쓰기", "发帖")}
          </span>
        </div>
        <div style={{ padding: 16 }}>
          {!isNotice && (
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
          )}

          {!isNotice && writeCat && TAGS[writeCat] && (
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
          {!isNotice && (!writeCat || !writeTag) && (
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
        {/* ── 신고 모달 ── */}
        {showReportModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 340 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 6 }}>🚩 {t("신고하기", "举报")}</div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 14 }}>{t("신고 사유를 입력해주세요.", "请输入举报原因。")}</div>
              <textarea
                value={reportReason}
                onChange={e => setReportReason(e.target.value)}
                placeholder={t("예: 욕설·비방, 스팸, 허위정보 등", "例：侮辱·诽谤、垃圾信息等")}
                style={{ ...INPUT_STYLE, resize: "none", height: 100, marginBottom: 14, fontSize: 14 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => { setShowReportModal(false); setReportReason(""); }}
                  disabled={reportLoading}
                  style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid #ddd", background: "#F5F5F5", fontSize: 14, fontWeight: 600, color: "#666", cursor: "pointer" }}>
                  {t("취소", "取消")}
                </button>
                <button
                  onClick={handleReport}
                  disabled={reportLoading || !reportReason.trim()}
                  style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: reportReason.trim() ? "#C0392B" : "#ddd", fontSize: 14, fontWeight: 700, color: "#fff", cursor: reportLoading ? "not-allowed" : "pointer", opacity: reportLoading ? 0.7 : 1 }}>
                  {reportLoading ? "..." : t("신고", "举报")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 삭제 확인 팝업 ── */}
        {showDeleteConfirm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 320, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🗑️</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>
                {t("게시글을 삭제할까요?", "确定要删除这篇帖子吗？")}
              </div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 24 }}>
                {t("삭제된 글은 복구할 수 없습니다.", "删除后无法恢复。")}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteLoading}
                  style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid #ddd", background: "#F5F5F5", fontSize: 14, fontWeight: 600, color: "#666", cursor: "pointer" }}>
                  {t("취소", "取消")}
                </button>
                <button
                  onClick={handleDeletePost}
                  disabled={deleteLoading}
                  style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: "#C0392B", fontSize: 14, fontWeight: 700, color: "#fff", cursor: deleteLoading ? "not-allowed" : "pointer", opacity: deleteLoading ? 0.7 : 1 }}>
                  {deleteLoading ? "..." : t("삭제", "删除")}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: "16px 16px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <button onClick={goBackFromDetail} style={{ background: "none", border: "none", cursor: "pointer", color: "#C0392B", fontSize: 13, fontWeight: 600, padding: 0 }}>
              ← {t("목록으로", "返回列表")}
            </button>
            {canDelete(post) && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{ background: "none", border: "1px solid #ddd", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: "#999", cursor: "pointer" }}>
                {t("삭제", "删除")}
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            <CatBadge catId={post.category} />
            <TagBadge tag={post.tag} />
          </div>
          <h1 style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.5, color: "#1a1a1a", margin: "0 0 12px" }}>
            {post.title}
          </h1>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: "1px solid #eee" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#C0392B", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                {getAuthor(post)[0]}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>{getAuthor(post)}</div>
                <div style={{ fontSize: 11, color: "#999" }}>{formatDate(post.created_at)}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#999" }}>
              <span>👁 {(post.view_count || 0).toLocaleString()}</span>
              <span>👍 {post.like_count || 0}</span>
              <span>💬 {post.comment_count || 0}</span>
            </div>
          </div>
        </div>

        <div style={{ padding: "16px", fontSize: 14, lineHeight: 1.9, color: "#333", borderBottom: "8px solid #F5F5F5" }}>
          {(post.content || "").split('\n').map((line, i) =>
            <p key={i} style={{ margin: "0 0 8px" }}>{line}</p>
          )}
        </div>

        <div style={{ padding: "14px 16px", display: "flex", gap: 8, borderBottom: "8px solid #F5F5F5" }}>
          <button
            onClick={() => toggleLike(post.id)}
            style={{
              flex: 1, borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              background: likedPostIds.has(post.id) ? "#C0392B" : "#FEF0EF",
              border: `1px solid ${likedPostIds.has(post.id) ? "#C0392B" : "#FCCBC8"}`,
              color: likedPostIds.has(post.id) ? "#fff" : "#C0392B",
            }}>
            👍 {t(likedPostIds.has(post.id) ? "추천함" : "추천", likedPostIds.has(post.id) ? "已推荐" : "推荐")} {post.like_count || 0}
          </button>
          <button
            onClick={() => toggleBookmark(post.id)}
            style={{ flex: 1, background: bookmarkedPostIds.has(post.id) ? "#FFF9E6" : "#F5F5F5", border: `1px solid ${bookmarkedPostIds.has(post.id) ? "#F9CA24" : "#ddd"}`, borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700, color: bookmarkedPostIds.has(post.id) ? "#B7950B" : "#666", cursor: "pointer" }}>
            🔖 {t(bookmarkedPostIds.has(post.id) ? "저장됨" : "북마크", bookmarkedPostIds.has(post.id) ? "已收藏" : "收藏")}
          </button>
          <button
            onClick={() => handleShare(post.id)}
            style={{ background: "#F5F5F5", border: "1px solid #ddd", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#666", cursor: "pointer" }}>
            📤 {t("공유", "分享")}
          </button>
        </div>

        <div style={{ padding: "16px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#333", marginBottom: 12 }}>
            💬 {t("댓글", "评论")} {replies.length}
          </div>
          {replies.map(reply => (
            <div key={reply.id} style={{ padding: "12px", background: reply.is_author ? "#FFF8F8" : "#FAFAFA", borderRadius: 8, marginBottom: 8, border: reply.is_author ? "1px solid #FFCDD2" : "1px solid #eee" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: reply.is_author ? "#C0392B" : "#333" }}>
                  {getAuthor(reply)}
                  {reply.is_author && <span style={{ fontSize: 10, background: "#C0392B", color: "#fff", padding: "1px 5px", borderRadius: 3, marginLeft: 4 }}>{t("작성자", "作者")}</span>}
                </span>
                <span style={{ fontSize: 11, color: "#999" }}>{formatDate(reply.created_at)}</span>
              </div>
              <p style={{ fontSize: 13, color: "#444", margin: 0, lineHeight: 1.6 }}>
                {reply.content}
              </p>
              <div style={{ marginTop: 6, fontSize: 11, color: "#999", display: "flex", gap: 10 }}>
                <span style={{ cursor: "pointer" }}>👍 {reply.like_count || 0}</span>
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

          <div style={{ textAlign: "center", marginTop: 20, paddingBottom: 8 }}>
            <button
              onClick={() => { if (!user) { setShowAuth(true); return; } setShowReportModal(true); }}
              style={{ background: "none", border: "none", color: "#bbb", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>
              🚩 {t("이 게시글 신고하기", "举报此帖子")}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── 내 북마크 뷰 ──
  const BookmarkView = () => (
    <div style={{ background: "#F5F5F5", minHeight: "100vh" }}>
      <div style={{ background: "#fff", padding: "14px 16px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={goHome} style={{ background: "none", border: "none", cursor: "pointer", color: "#C0392B", fontSize: 13, fontWeight: 600, padding: 0 }}>← {t("홈으로", "返回首页")}</button>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>🔖 {t("내 북마크", "我的收藏")}</span>
      </div>
      <div style={{ paddingBottom: 80 }}>
        {bookmarkLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 13 }}>{t("불러오는 중...", "加载中...")}</div>
        ) : bookmarkPosts.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "#aaa", fontSize: 13 }}>
            {t("북마크한 게시글이 없어요.", "暂无收藏的帖子。")}
          </div>
        ) : bookmarkPosts.map(post => (
          <div key={post.id} onClick={() => openPost(post, "bookmark")}
            style={{ background: "#fff", padding: "14px 16px", borderBottom: "1px solid #eee", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "#FFFAF9"}
            onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
            <div style={{ display: "flex", gap: 5, marginBottom: 6, alignItems: "center", flexWrap: "wrap" }}>
              <CatBadge catId={post.category} />
              <TagBadge tag={post.tag} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.5, marginBottom: 6 }}>{post.title}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#999" }}>{getAuthor(post)} · {formatDate(post.created_at)}</span>
              <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#999" }}>
                <span>👁 {(post.view_count || 0).toLocaleString()}</span>
                <span>👍 {post.like_count || 0}</span>
                <span>💬 {post.comment_count || 0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── 공지사항 뷰 ──
  const NoticeView = () => {
    const isAdmin = user?.email === ADMIN_EMAIL;
    return (
      <div style={{ background: "#F5F5F5", minHeight: "100vh" }}>
        <div style={{ background: "#fff", padding: "14px 16px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={goHome} style={{ background: "none", border: "none", cursor: "pointer", color: "#C0392B", fontSize: 13, fontWeight: 600, padding: 0 }}>← {t("홈으로", "返回首页")}</button>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>📣 {t("공지사항", "公告")}</span>
          </div>
          {isAdmin && (
            <button
              onClick={() => { setWriteCat("notice"); setWriteTag("공지"); setWriteTitle(""); setWriteContent(""); setView("write"); }}
              style={{ background: "#C0392B", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {t("공지 작성", "发公告")}
            </button>
          )}
        </div>
        <div style={{ paddingBottom: 80 }}>
          {noticeLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 13 }}>{t("불러오는 중...", "加载中...")}</div>
          ) : noticePosts.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "#aaa", fontSize: 13 }}>
              {t("등록된 공지사항이 없어요.", "暂无公告。")}
            </div>
          ) : noticePosts.map(post => (
            <div key={post.id} onClick={() => openPost(post, "notice")}
              style={{ background: "#fff", padding: "14px 16px", borderBottom: "1px solid #eee", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "#F0F6FF"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", lineHeight: 1.5, marginBottom: 6 }}>
                📣 {post.title}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#999" }}>{formatDate(post.created_at)}</span>
                <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#999" }}>
                  <span>👁 {(post.view_count || 0).toLocaleString()}</span>
                  <span>💬 {post.comment_count || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── 건의하기 뷰 ──
  const SuggestView = () => {
    const isAdmin = user?.email === ADMIN_EMAIL;
    return (
      <div style={{ background: "#F5F5F5", minHeight: "100vh" }}>
        <div style={{ background: "#fff", padding: "14px 16px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={goHome} style={{ background: "none", border: "none", cursor: "pointer", color: "#C0392B", fontSize: 13, fontWeight: 600, padding: 0 }}>← {t("홈으로", "返回首页")}</button>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>📮 {t("건의하기", "建议")}</span>
          </div>
          {!suggestWriteMode && (
            <button onClick={() => setSuggestWriteMode(true)}
              style={{ background: "#C0392B", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {t("건의 작성", "提建议")}
            </button>
          )}
        </div>

        {suggestWriteMode && (
          <div style={{ background: "#fff", padding: 16, borderBottom: "8px solid #F5F5F5" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#333", marginBottom: 10 }}>{t("새 건의 작성", "提新建议")}</div>
            <input
              value={suggestTitle} onChange={e => setSuggestTitle(e.target.value)}
              placeholder={t("제목을 입력하세요", "请输入标题")}
              style={{ ...INPUT_STYLE, marginBottom: 10 }}
            />
            <textarea
              value={suggestContent} onChange={e => setSuggestContent(e.target.value)}
              placeholder={t("건의 내용을 입력하세요", "请输入建议内容")}
              style={{ ...INPUT_STYLE, resize: "none", height: 120, marginBottom: 10 }}
            />
            <input
              type="password"
              value={suggestPassword} onChange={e => setSuggestPassword(e.target.value)}
              placeholder={t("비밀번호 설정 (선택, 미설정 시 공개)", "设置密码（可选）")}
              style={{ ...INPUT_STYLE, marginBottom: 10 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { setSuggestWriteMode(false); setSuggestTitle(""); setSuggestContent(""); }}
                style={{ flex: 1, background: "#F5F5F5", border: "1px solid #ddd", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600, color: "#666", cursor: "pointer" }}>
                {t("취소", "取消")}
              </button>
              <button
                onClick={handleSuggestSubmit}
                disabled={suggestSubmitLoading || !suggestTitle.trim() || !suggestContent.trim()}
                style={{ flex: 2, background: suggestTitle.trim() && suggestContent.trim() ? "#C0392B" : "#ddd", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700, cursor: suggestSubmitLoading ? "not-allowed" : "pointer", opacity: suggestSubmitLoading ? 0.7 : 1 }}>
                {suggestSubmitLoading ? "..." : t("제출하기", "提交")}
              </button>
            </div>
          </div>
        )}

        <div style={{ paddingBottom: 80 }}>
          {suggestLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 13 }}>{t("불러오는 중...", "加载中...")}</div>
          ) : suggestPosts.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "#aaa", fontSize: 13 }}>
              {t("작성한 건의사항이 없어요.", "暂无建议。")}
            </div>
          ) : suggestPosts.map(post => (
            <div key={post.id} onClick={() => handleSuggestPostClick(post)}
              style={{ background: "#fff", padding: "14px 16px", borderBottom: "1px solid #eee", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "#F9FFF9"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              {isAdmin && post.user_id !== user?.id && (
                <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>
                  {t("작성자", "作者")}: {getAuthor(post)}
                </div>
              )}
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.5, marginBottom: 6 }}>
                {post.password ? "🔒 " : ""}{post.title}
              </div>
              <div style={{ fontSize: 11, color: "#999" }}>{formatDate(post.created_at)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: "'Noto Sans KR','Noto Sans SC','Apple SD Gothic Neo',sans-serif", background: "#F5F5F5", minHeight: "100vh", maxWidth: 480, margin: "0 auto" }}>
      {Header()}

      {/* ── 토스트 ── */}
      {toastMsg && (
        <div style={{ position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.76)", color: "#fff", padding: "10px 20px", borderRadius: 20, fontSize: 13, fontWeight: 600, zIndex: 999, pointerEvents: "none", whiteSpace: "nowrap" }}>
          {toastMsg}
        </div>
      )}

      {showAuth && AuthModal()}

      {/* ── 건의 비밀번호 모달 ── */}
      {showSuggestPwModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 340 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 6 }}>🔒 {t("비밀번호 확인", "请输入密码")}</div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 14 }}>{t("이 건의글은 비밀번호로 보호되어 있습니다.", "此建议已设置密码保护。")}</div>
            <input
              type="password"
              value={suggestPwInput}
              onChange={e => { setSuggestPwInput(e.target.value); setSuggestPwError(""); }}
              onKeyDown={e => e.key === "Enter" && handleSuggestPwSubmit()}
              placeholder={t("비밀번호 입력", "请输入密码")}
              style={{ ...INPUT_STYLE, marginBottom: suggestPwError ? 6 : 14 }}
            />
            {suggestPwError && <p style={{ fontSize: 12, color: "#C0392B", marginBottom: 10 }}>{suggestPwError}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { setShowSuggestPwModal(false); setSuggestPwInput(""); setSuggestPwError(""); setPendingSuggestPost(null); }}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid #ddd", background: "#F5F5F5", fontSize: 14, fontWeight: 600, color: "#666", cursor: "pointer" }}>
                {t("취소", "取消")}
              </button>
              <button
                onClick={handleSuggestPwSubmit}
                disabled={!suggestPwInput.trim()}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: suggestPwInput.trim() ? "#C0392B" : "#ddd", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
                {t("확인", "确认")}
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "write"    && WriteView()}
      {view === "detail"   && selectedPost && DetailView()}
      {view === "bookmark" && BookmarkView()}
      {view === "notice"   && NoticeView()}
      {view === "suggest"  && SuggestView()}
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
                    {post.title}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#999" }}>{getAuthor(post)} · {formatDate(post.created_at)}</span>
                    <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#999" }}>
                      <span>👁 {(post.view_count || 0).toLocaleString()}</span>
                      <span>👍 {post.like_count || 0}</span>
                      <span>💬 {post.comment_count || 0}</span>
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
