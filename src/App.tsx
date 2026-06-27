import { useEffect, useState, useCallback } from "react";
import Home from "@/pages/Home";
import OBSDisplay from "@/pages/OBSDisplay";
import SongSelector from "@/pages/SongSelector";
import ConvertTool from "@/pages/ConvertTool";
import OBSTournament from "@/components/OBSTournament";
import TournamentControl from "@/components/TournamentControl";
import CheckInPage from "@/pages/CheckInPage";
import PlayerTerminal from "@/components/PlayerTerminal";
import CountdownDisplay from "@/pages/CountdownDisplay";
import RefereePage from "@/pages/RefereePage";
import BracketPage from "@/pages/BracketPage";
import UpcomingPage from "@/pages/UpcomingPage";
import { ToastProvider } from "@/components/Toast";

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
      {page === 'tournament' && <TournamentControl onSwitchPage={handleSwitchPage} />}
      {page === 'obs' && <OBSDisplay />}
      {page === 'obsTournament' && <OBSTournament />}
      {page === 'convert' && <ConvertTool />}
      {page === 'countdown' && <CountdownDisplay />}
      {page === 'checkin' && <CheckInPage />}
      {page === 'player' && <PlayerTerminal />}
      {page === 'referee' && <RefereePage />}
      {page === 'bracket' && <BracketPage />}
      {page === 'upcoming' && <UpcomingPage />}
    </ToastProvider>
  );
}
