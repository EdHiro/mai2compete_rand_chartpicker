import { useEffect, useState, useCallback } from "react";
import Home from "@/pages/Home";
import OBSDisplay from "@/pages/OBSDisplay";
import SongSelector from "@/pages/SongSelector";
import ConvertTool from "@/pages/ConvertTool";

function getPageFromPath(): 'home' | 'obs' | 'selector' | 'convert' {
  const path = window.location.pathname;
  if (path === "/obs" || window.location.search.includes("obs=1")) {
    return 'obs';
  } else if (path === "/selector") {
    return 'selector';
  } else if (path === '/convert') {
    return 'convert';
  }
  return 'home';
}

export default function App() {
  const [page, setPage] = useState<'home' | 'obs' | 'selector' | 'convert'>(getPageFromPath);

  useEffect(() => {
    const handlePopState = () => {
      setPage(getPageFromPath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSwitchPage = useCallback((target: 'home' | 'selector' | 'convert') => {
    const path = target === 'selector' ? '/selector' : target === 'convert' ? '/convert' : '/';
    window.history.pushState({}, '', path);
    setPage(target as any);
  }, []);

  return (
    <>
      <div style={{ display: page === 'home' ? 'block' : 'none' }}>
        <Home onSwitchPage={handleSwitchPage} />
      </div>
      <div style={{ display: page === 'selector' ? 'block' : 'none' }}>
        <SongSelector onSwitchPage={handleSwitchPage} />
      </div>
      {page === 'obs' && <OBSDisplay />}
      {page === 'convert' && <ConvertTool />}
    </>
  );
}
