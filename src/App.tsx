import React, { useState, useEffect, useMemo } from 'react';
import { DANISH_YOUTUBERS, DEFAULT_FAVORITE_IDS } from './data/youtubers';
import { YouTuber, TabType } from './types';
import { BottomNav } from './components/BottomNav';
import { SearchScreen } from './components/SearchScreen';
import { FavoritesScreen } from './components/FavoritesScreen';
import { FavoritesDailyChartsScreen } from './components/FavoritesDailyChartsScreen';
import { StatsOverviewScreen } from './components/StatsOverviewScreen';
import { YouTuberDetailScreen } from './components/YouTuberDetailScreen';
import { Toast } from './components/Toast';
import { PlaySquare, Radio } from 'lucide-react';

const FAVORITES_STORAGE_KEY = 'dk_youtube_tracker_favorites';
const CUSTOM_YOUTUBERS_STORAGE_KEY = 'dk_youtube_tracker_custom_channels';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('search');
  const [selectedYouTuber, setSelectedYouTuber] = useState<YouTuber | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Persistent custom/searched YouTubers
  const [customChannels, setCustomChannels] = useState<Record<string, YouTuber>>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_YOUTUBERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Kunne ikke indlæse gemte kanaler:', e);
    }
    return {};
  });

  // Persistent favorites in localStorage
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_FAVORITE_IDS;
  });

  // Save favorites whenever changed
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
    } catch (e) {
      console.error('Kunne ikke gemme favoritter til localStorage', e);
    }
  }, [favoriteIds]);

  // Save custom channels whenever added
  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_YOUTUBERS_STORAGE_KEY, JSON.stringify(customChannels));
    } catch (e) {
      console.error('Kunne ikke gemme kanaler til localStorage', e);
    }
  }, [customChannels]);

  // Combine seeded list with any dynamically added YouTubers
  const allYouTubers = useMemo(() => {
    const map = new Map<string, YouTuber>();
    // 1. Initial curated list
    for (const yt of DANISH_YOUTUBERS) {
      map.set(yt.id, yt);
    }
    // 2. Custom or live searched channels
    for (const [id, yt] of Object.entries(customChannels)) {
      map.set(id, yt);
    }
    return Array.from(map.values());
  }, [customChannels]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  };

  const handleToggleFavorite = (target: YouTuber | string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    let targetYt: YouTuber | undefined;
    let id: string;

    if (typeof target === 'string') {
      id = target;
      targetYt = allYouTubers.find((y) => y.id === id);
    } else {
      id = target.id;
      targetYt = target;
      // If this is a newly searched channel from YouTube, save it into our customChannels registry
      setCustomChannels((prev) => ({
        ...prev,
        [id]: target,
      }));
    }

    const name = targetYt ? targetYt.channelName : 'Kanal';

    setFavoriteIds((prev) => {
      if (prev.includes(id)) {
        showToast(`${name} fjernet fra favoritter`);
        return prev.filter((item) => item !== id);
      } else {
        showToast(`${name} tilføjet til favoritter!`);
        return [...prev, id];
      }
    });
  };

  const handleRemoveFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const youtuber = allYouTubers.find((y) => y.id === id);
    const name = youtuber ? youtuber.channelName : 'Kanal';
    setFavoriteIds((prev) => prev.filter((item) => item !== id));
    showToast(`${name} fjernet fra favoritter`);
  };

  const handleAddDefaultFavorites = () => {
    setFavoriteIds(DEFAULT_FAVORITE_IDS);
    showToast('Standard favoritkanaler indlæst!');
  };

  const handleSelectYouTuber = (yt: YouTuber) => {
    // If it's a new channel, save it
    if (!DANISH_YOUTUBERS.some((d) => d.id === yt.id)) {
      setCustomChannels((prev) => ({
        ...prev,
        [yt.id]: yt,
      }));
    }
    setSelectedYouTuber(yt);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabChange = (tab: TabType) => {
    setSelectedYouTuber(null);
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center selection:bg-rose-600 selection:text-white">
      {/* Mobile-centric container with maximum responsive width */}
      <div className="w-full max-w-lg min-h-screen flex flex-col bg-slate-950 border-x border-slate-900 shadow-2xl relative">
        {/* App Top Branding Bar */}
        <header
          id="app-top-header"
          className="px-4 py-3 bg-slate-950/95 border-b border-slate-900 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md"
        >
          <div
            onClick={() => handleTabChange('search')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 flex items-center justify-center shadow-md shadow-rose-600/30 group-hover:scale-105 transition-transform">
              <PlaySquare className="w-4 h-4 text-white fill-white" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                <span>Dansk YouTube Tracker</span>
              </span>
              <span className="text-[10px] text-slate-400 block -mt-0.5">
                Statistik & Rangering • YouTube Data API
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>LIVE API</span>
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 px-4 pt-3 pb-6">
          {selectedYouTuber ? (
            <YouTuberDetailScreen
              youtuber={selectedYouTuber}
              isFavorite={favoriteIds.includes(selectedYouTuber.id)}
              onToggleFavorite={handleToggleFavorite}
              onBack={() => setSelectedYouTuber(null)}
            />
          ) : (
            <>
              {currentTab === 'search' && (
                <SearchScreen
                  youtubers={allYouTubers}
                  favoriteIds={favoriteIds}
                  onToggleFavorite={handleToggleFavorite}
                  onSelectYouTuber={handleSelectYouTuber}
                />
              )}

              {currentTab === 'favorites' && (
                <FavoritesScreen
                  youtubers={allYouTubers}
                  favoriteIds={favoriteIds}
                  onRemoveFavorite={handleRemoveFavorite}
                  onSelectYouTuber={handleSelectYouTuber}
                  onSwitchTab={handleTabChange}
                />
              )}

              {currentTab === 'graphs' && (
                <FavoritesDailyChartsScreen
                  youtubers={allYouTubers}
                  favoriteIds={favoriteIds}
                  onRemoveFavorite={handleRemoveFavorite}
                  onSelectYouTuber={handleSelectYouTuber}
                  onSwitchTab={handleTabChange}
                  onAddDefaultFavorites={handleAddDefaultFavorites}
                />
              )}

              {currentTab === 'stats' && (
                <StatsOverviewScreen
                  youtubers={allYouTubers}
                  favoriteIds={favoriteIds}
                  onSelectYouTuber={handleSelectYouTuber}
                  onSwitchToSearch={() => handleTabChange('search')}
                />
              )}
            </>
          )}
        </main>

        {/* Persistent Mobile Bottom Navigation Bar (3 buttons) */}
        <BottomNav
          currentTab={currentTab}
          favoritesCount={favoriteIds.length}
          onTabChange={handleTabChange}
        />

        {/* Toast notification overlay */}
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      </div>
    </div>
  );
}
