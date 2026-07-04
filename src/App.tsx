import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import Home from "@/pages/Home";
import SongSelector from "@/pages/SongSelector";
import { ToastProvider, useToast } from "@/components/Toast";

// 非首屏页面懒加载，减小主 bundle 体积
const OBSDisplay = lazy(() => import("@/pages/OBSDisplay"));
const ConvertTool = lazy(() => import("@/pages/ConvertTool"));
const OBSTournament = lazy(() => import("@/components/OBSTournament"));
const TournamentControl = lazy(() => import("@/components/TournamentControl"));
const CheckInPage = lazy(() => import("@/pages/CheckInPage"));
const PlayerTerminal = lazy(() => import("@/components/PlayerTerminal"));
const CountdownDisplay = lazy(() => import("@/pages/CountdownDisplay"));
const RefereePage = lazy(() => import("@/pages/RefereePage"));
const BracketPage = lazy(() => import("@/pages/BracketPage"));
const UpcomingPage = lazy(() => import("@/pages/UpcomingPage"));

function getPageFromPath(): 'home' | 'obs' | 'selector' | 'convert' | 'tournament' | 'obsTournament' | 'checkin' | 'player' | 'countdown' | 'referee' | 'bracket' | 'upcoming' {
  const path = window.location.pathname;
  if (path === "/obs" || window.location.search.includes("obs=1")) {
    return 'obs';
  } else if (path === "/obs-tournament" || window.location.search.includes("obs-tournament=1")) {
    return 'obsTournament';
  } else if (path === "/selector" || window.location.search.includes("selector=1")) {
    return 'selector';
  } else if (path === '/convert') {
    return 'convert';
  } else if (path === '/tournament') {
    return 'tournament';
  } else if (path === '/countdown' || window.location.search.includes("countdown=1")) {
    return 'countdown';
  } else if (path === '/referee' || window.location.search.includes("referee=1")) {
    return 'referee';
  } else if (path === '/bracket' || window.location.search.includes("bracket=1")) {
    return 'bracket';
  } else if (path === '/upcoming' || window.location.search.includes("upcoming=1")) {
    return 'upcoming';
  } else if (window.location.search.includes("checkin=1")) {
    return 'checkin';
  } else if (window.location.search.includes("player=1") || window.location.search.includes("player=")) {
    return 'player';
  }
  return 'home';
}

// 解析 URL 中的辅助参数（用于扫码联动）
function getInitialSelectorState(): { multiMode: boolean; playerName: string | null } {
  const params = new URLSearchParams(window.location.search);
  const multiplayer = params.get('multiplayer');
  const playerName = params.get('player_name');
  return {
    multiMode: multiplayer === '1' || !!playerName,
    playerName: playerName,
  };
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-white/20 border-t-violet-400 rounded-full animate-spin" />
    </div>
  );
}

function OfflineDetector() {
  const { showToast } = useToast();

  useEffect(() => {
    const onOffline = () => showToast('网络已断开，部分功能不可用', 'error');
    const onOnline = () => showToast('网络已恢复', 'success');
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [showToast]);

  return null;
}

export default function App() {
  const [page, setPage] = useState<'home' | 'obs' | 'selector' | 'convert' | 'tournament' | 'obsTournament' | 'checkin' | 'player' | 'countdown' | 'referee' | 'bracket' | 'upcoming'>(getPageFromPath);
  const initialSelectorState = getInitialSelectorState();

  useEffect(() => {
    const handlePopState = () => {
      setPage(getPageFromPath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSwitchPage = useCallback((target: 'home' | 'selector' | 'convert' | 'tournament') => {
    const path = target === 'selector' ? '/selector' : target === 'convert' ? '/convert' : target === 'tournament' ? '/tournament' : '/';
    window.history.pushState({}, '', path);
    setPage(target);
  }, []);

  return (
    <ToastProvider>
      <OfflineDetector />
      <div style={{ display: page === 'home' ? 'block' : 'none' }}>
        <Home onSwitchPage={handleSwitchPage} />
      </div>
      <div style={{ display: page === 'selector' ? 'block' : 'none' }}>
        <SongSelector
          onSwitchPage={handleSwitchPage}
          initialMultiMode={initialSelectorState.multiMode}
          initialPlayerName={initialSelectorState.playerName}
        />
      </div>
      <Suspense fallback={<PageLoader />}>
        {page === 'tournament' && <TournamentControl />}
        {page === 'obs' && <OBSDisplay />}
        {page === 'obsTournament' && <OBSTournament />}
        {page === 'convert' && <ConvertTool />}
        {page === 'countdown' && <CountdownDisplay />}
        {page === 'checkin' && <CheckInPage />}
        {page === 'player' && <PlayerTerminal />}
        {page === 'referee' && <RefereePage />}
        {page === 'bracket' && <BracketPage />}
        {page === 'upcoming' && <UpcomingPage />}
      </Suspense>
    </ToastProvider>
  );
}
