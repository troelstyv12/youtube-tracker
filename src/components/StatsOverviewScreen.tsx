import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Trophy,
  TrendingUp,
  Flame,
  Award,
  Clock,
  Sparkles,
  ChevronRight,
  RotateCw,
  Play,
  ThumbsUp,
  MessageSquare,
  BarChart2,
  Video,
  Smartphone,
  ExternalLink,
  Layers,
  Heart,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Eye,
  Calendar,
} from 'lucide-react';
import { YouTuber, RankedRecentVideo, TopRecentVideosResponse } from '../types';
import { formatCompact, formatNumberDK, formatPercent, calculateAggregateStats } from '../utils/formatters';
import { fetchTopRecentVideos } from '../services/youtubeApi';

interface StatsOverviewScreenProps {
  youtubers: YouTuber[];
  favoriteIds: string[];
  onSelectYouTuber: (youtuber: YouTuber) => void;
  onSwitchToSearch: () => void;
}

// 3 Required primary tabs plus benchmark
type VideoTabType = 'shorts' | 'long' | 'all' | 'channels';

export const StatsOverviewScreen: React.FC<StatsOverviewScreenProps> = ({
  youtubers,
  favoriteIds,
  onSelectYouTuber,
  onSwitchToSearch,
}) => {
  // Main view tab: 'shorts', 'long', or 'all' (defaulting to 'shorts' or 'all')
  const [activeTab, setActiveTab] = useState<VideoTabType>('shorts');

  // Scope: 'favorites' (default as requested) or 'all'
  const [scope, setScope] = useState<'favorites' | 'all'>(
    favoriteIds.length > 0 ? 'favorites' : 'all'
  );

  // Video API state
  const [videoData, setVideoData] = useState<TopRecentVideosResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sorting mode: 'views' (flest visninger / mest populær) or 'newest' (seneste uploads)
  const [sortBy, setSortBy] = useState<'views' | 'newest'>('views');

  // Channel benchmark sorting metric (for the secondary channel tab)
  const [benchmarkMetric, setBenchmarkMetric] = useState<'monthlyViews' | 'subscribers' | 'growth'>('monthlyViews');

  // Fetch top recent videos from YouTube Data API
  const loadRecentVideos = useCallback(
    async (forceRefresh = false) => {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        // Collect channel IDs based on scope
        const targetIds =
          scope === 'favorites' && favoriteIds.length > 0
            ? favoriteIds
            : youtubers.map((y) => y.id);

        const data = await fetchTopRecentVideos(targetIds, scope, forceRefresh);
        
        setVideoData(data);
      } catch (err: any) {
        console.error('Fejl ved indlæsning af top videoer:', err);
        setError(err.message || 'Kunne ikke hente de seneste videoer fra YouTube.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [favoriteIds, youtubers, scope]
  );

  useEffect(() => {
    loadRecentVideos(false);
  }, [loadRecentVideos]);

  // Current active list of 10 videos (guaranteed 10 for both most popular and newest)
  const currentVideoList: RankedRecentVideo[] = useMemo(() => {
    if (!videoData) return [];
    let list: RankedRecentVideo[] = [];

    if (activeTab === 'shorts') {
      list = sortBy === 'newest'
        ? (videoData.newestShorts && videoData.newestShorts.length > 0 ? videoData.newestShorts : videoData.topShorts || [])
        : (videoData.topShorts || []);
    } else if (activeTab === 'long') {
      list = sortBy === 'newest'
        ? (videoData.newestLongVideos && videoData.newestLongVideos.length > 0 ? videoData.newestLongVideos : videoData.topLongVideos || [])
        : (videoData.topLongVideos || []);
    } else if (activeTab === 'all') {
      list = sortBy === 'newest'
        ? (videoData.newestAllVideos && videoData.newestAllVideos.length > 0 ? videoData.newestAllVideos : videoData.topAllVideos || [])
        : (videoData.topAllVideos || []);
    }

    const validVideos = (list || []).filter((v) => v && v.id);

    return [...validVideos]
      .sort((a, b) => {
        if (sortBy === 'newest') {
          const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return dateB - dateA;
        }
        return b.views - a.views;
      })
      .slice(0, 10)
      .map((v, i) => ({ ...v, rank: i + 1 }));
  }, [videoData, activeTab, sortBy]);

  // Max views in current list for relative progress bar
  const maxViewsInList = useMemo(() => {
    if (currentVideoList.length === 0) return 1;
    return Math.max(...currentVideoList.map((v) => v.views), 1);
  }, [currentVideoList]);

  // Summary stats for current video tab
  const videoSummary = useMemo(() => {
    if (currentVideoList.length === 0) return null;
    const totalViews = currentVideoList.reduce((acc, v) => acc + v.views, 0);
    const totalLikes = currentVideoList.reduce((acc, v) => acc + v.likes, 0);
    const totalComments = currentVideoList.reduce((acc, v) => acc + v.comments, 0);
    const avgViews = Math.round(totalViews / currentVideoList.length);
    const topPerformer = currentVideoList[0];

    return {
      totalViews,
      totalLikes,
      totalComments,
      avgViews,
      topPerformer,
    };
  }, [currentVideoList]);

  // Fallback / Channel benchmark data
  const activeChannelList = useMemo(() => {
    if (scope === 'favorites' && favoriteIds.length > 0) {
      return youtubers.filter((y) => favoriteIds.includes(y.id));
    }
    return youtubers;
  }, [youtubers, favoriteIds, scope]);

  const rankedBenchmarkList = useMemo(() => {
    return [...activeChannelList].sort((a, b) => {
      if (benchmarkMetric === 'subscribers') return b.subscribers - a.subscribers;
      if (benchmarkMetric === 'growth') return b.monthlyGrowthPct - a.monthlyGrowthPct;
      return b.monthlyViews - a.monthlyViews;
    });
  }, [activeChannelList, benchmarkMetric]);

  const maxBenchmarkValue = useMemo(() => {
    if (rankedBenchmarkList.length === 0) return 1;
    if (benchmarkMetric === 'subscribers') return rankedBenchmarkList[0].subscribers;
    if (benchmarkMetric === 'growth') return Math.max(...rankedBenchmarkList.map((y) => y.monthlyGrowthPct));
    return rankedBenchmarkList[0].monthlyViews;
  }, [rankedBenchmarkList, benchmarkMetric]);

  // Helper to find a YouTuber object from a video's channelId
  const handleOpenChannelFromVideo = (video: RankedRecentVideo) => {
    const matched = youtubers.find(
      (y) => y.id === video.channelId || y.channelName.toLowerCase() === video.channelName.toLowerCase()
    );
    if (matched) {
      onSelectYouTuber(matched);
    }
  };

  return (
    <div id="stats-overview-container" className="space-y-4 pb-24">
      {/* Top Header & Context Control */}
      <div className="pt-2 pb-2 border-b border-slate-800/60 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Samlet Statistik</span>
                <Award className="w-5 h-5 text-amber-400" />
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                Live API
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>
                {scope === 'favorites'
                  ? activeTab === 'shorts'
                    ? sortBy === 'views'
                      ? 'Top 10 mest populære shorts fra dine favoritter'
                      : 'Top 10 seneste shorts fra dine favoritter'
                    : activeTab === 'long'
                    ? sortBy === 'views'
                      ? 'Top 10 mest populære videoer fra dine favoritter'
                      : 'Top 10 seneste videoer fra dine favoritter'
                    : sortBy === 'views'
                    ? 'Top 10 mest populære udgivelser (shorts & videoer) fra dine favoritter'
                    : 'Top 10 seneste udgivelser (shorts & videoer) fra dine favoritter'
                  : activeTab === 'shorts'
                  ? sortBy === 'views'
                    ? 'Top 10 mest populære danske shorts (seneste 7 dage)'
                    : 'Top 10 seneste danske shorts (seneste 7 dage)'
                  : activeTab === 'long'
                  ? sortBy === 'views'
                    ? 'Top 10 mest populære danske videoer (seneste 7 dage)'
                    : 'Top 10 seneste danske videoer (seneste 7 dage)'
                  : sortBy === 'views'
                  ? 'Top 10 mest populære danske udgivelser (shorts & videoer)'
                  : 'Top 10 seneste danske udgivelser (shorts & videoer)'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold flex items-center gap-1">
                {sortBy === 'views' ? (
                  <>
                    <Trophy className="w-3 h-3 text-amber-400" />
                    Rækkefølge fra mest populær
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3 text-emerald-400" />
                    Rækkefølge fra nyeste upload
                  </>
                )}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              id="refresh-stats-btn"
              onClick={() => loadRecentVideos(true)}
              disabled={isRefreshing || isLoading}
              title="Opdater data i realtid fra YouTube API"
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-medium disabled:opacity-50 cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 text-rose-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Opdater</span>
            </button>
          </div>
        </div>

        {/* Scope Selector: Dine Favoritter vs. Alle Danske Kanaler */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setScope('favorites')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                scope === 'favorites'
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-900/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${scope === 'favorites' ? 'fill-white' : ''}`} />
              <span>Dine favoritter ({favoriteIds.length})</span>
            </button>
            <button
              onClick={() => setScope('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                scope === 'all'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Alle danske kanaler</span>
            </button>
          </div>

          {videoData && (
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Opdateret: {new Date(videoData.fetchedAt).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* The 3 Primary Required Tabs: Shorts, Videoer, Alt (+ optional Kanaler) */}
        <div className="grid grid-cols-3 sm:grid-cols-4 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs">
          {/* Tab 1: Top 10 Shorts */}
          <button
            id="tab-top10-shorts"
            onClick={() => setActiveTab('shorts')}
            className={`py-2 px-2 sm:px-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 text-center ${
              activeTab === 'shorts'
                ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-md shadow-rose-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Top 10 Shorts</span>
          </button>

          {/* Tab 2: Top 10 Videoer (Langt format) */}
          <button
            id="tab-top10-videos"
            onClick={() => setActiveTab('long')}
            className={`py-2 px-2 sm:px-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 text-center ${
              activeTab === 'long'
                ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-md shadow-rose-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Top 10 Videoer</span>
          </button>

          {/* Tab 3: Top 10 Alt (Blandet) */}
          <button
            id="tab-top10-all"
            onClick={() => setActiveTab('all')}
            className={`py-2 px-2 sm:px-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 text-center ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-md shadow-rose-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Top 10 Alt</span>
          </button>

          {/* Tab 4: Kanaler Benchmark (Desktop/Tablet & Secondary) */}
          <button
            id="tab-benchmark-channels"
            onClick={() => setActiveTab('channels')}
            className={`hidden sm:flex py-2 px-2 sm:px-3 rounded-xl font-semibold transition-all items-center justify-center gap-1.5 text-center ${
              activeTab === 'channels'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Kanaler</span>
          </button>
        </div>
      </div>

      {/* Scope Warning if user selects 'favorites' with zero favorites saved */}
      {scope === 'favorites' && favoriteIds.length === 0 && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between gap-2">
          <span>Du har endnu ikke tilføjet nogen favoritter. Viser videoer fra Danmarks mest populære kanaler.</span>
          <button
            onClick={() => setScope('all')}
            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg text-xs font-semibold whitespace-nowrap"
          >
            Se alle kanaler
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3 pt-2">
          <div className="h-32 bg-slate-900/60 rounded-2xl animate-pulse border border-slate-800/60" />
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-20 bg-slate-900/40 rounded-xl animate-pulse border border-slate-800/40" />
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
          <p className="text-xs text-rose-300">{error}</p>
          <button
            onClick={() => loadRecentVideos(true)}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold"
          >
            Prøv igen
          </button>
        </div>
      )}

      {/* VIDEO CONTENT (Tabs: 'shorts', 'long', 'all') */}
      {!isLoading && activeTab !== 'channels' && (
        <div className="space-y-4">
          {/* Top Aggregate Summary Ribbon */}
          {videoSummary && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/30 border border-slate-800/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    {scope === 'favorites'
                      ? activeTab === 'shorts'
                        ? sortBy === 'views'
                          ? 'Top 10 Mest Populære Shorts • Dine Favoritter'
                          : 'Top 10 Seneste Shorts • Dine Favoritter'
                        : activeTab === 'long'
                        ? sortBy === 'views'
                          ? 'Top 10 Mest Populære Videoer • Dine Favoritter'
                          : 'Top 10 Seneste Videoer • Dine Favoritter'
                        : sortBy === 'views'
                        ? 'Top 10 Mest Populære Alt • Dine Favoritter'
                        : 'Top 10 Seneste Alt • Dine Favoritter'
                      : activeTab === 'shorts'
                      ? sortBy === 'views'
                        ? 'Top 10 Mest Populære Danske Shorts (seneste 7 dage)'
                        : 'Top 10 Seneste Danske Shorts (seneste 7 dage)'
                      : activeTab === 'long'
                      ? sortBy === 'views'
                        ? 'Top 10 Mest Populære Danske Videoer (seneste 7 dage)'
                        : 'Top 10 Seneste Danske Videoer (seneste 7 dage)'
                      : sortBy === 'views'
                      ? 'Top 10 Mest Populære Danske Alt (seneste 7 dage)'
                      : 'Top 10 Seneste Danske Alt (seneste 7 dage)'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  {sortBy === 'views' ? 'Rækkefølge fra mest populær' : 'Nyeste upload først'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">
                    Samlede Top 10 visninger
                  </span>
                  <p className="text-base font-bold text-rose-400 mt-0.5">
                    {formatCompact(videoSummary.totalViews)}
                  </p>
                  <span className="text-[10px] text-slate-500">
                    {formatNumberDK(videoSummary.totalViews)}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">
                    Gennemsnit pr. video
                  </span>
                  <p className="text-base font-bold text-white mt-0.5">
                    {formatCompact(videoSummary.avgViews)}
                  </p>
                  <span className="text-[10px] text-slate-500">
                    i top 10 listen
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">
                    Samlede likes
                  </span>
                  <p className="text-base font-bold text-white mt-0.5 flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3 text-emerald-400" />
                    {formatCompact(videoSummary.totalLikes)}
                  </p>
                  <span className="text-[10px] text-slate-500">
                    på tværs af top 10
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">
                    #1 Mest sete video
                  </span>
                  <p className="text-xs font-bold text-white truncate mt-1">
                    {videoSummary.topPerformer?.channelName}
                  </p>
                  <span className="text-[10px] text-emerald-400 font-medium">
                    {formatCompact(videoSummary.topPerformer?.views || 0)} visninger
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SPOTLIGHT: #1 Ranked Video Podium */}
          {videoSummary?.topPerformer && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-extrabold text-xs flex items-center justify-center">
                    #1
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    {sortBy === 'views' ? '#1 Mest populære i denne uge' : '#1 Nyeste udgivelse'}
                  </span>
                </div>

                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  {videoSummary.topPerformer.isShort ? 'Shorts' : `Video • ${videoSummary.topPerformer.duration}`}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mt-2">
                {/* Thumbnail Preview */}
                <div className="relative rounded-xl overflow-hidden shrink-0 group w-full sm:w-44 aspect-video sm:aspect-auto sm:h-24 bg-slate-950 border border-slate-800">
                  <img
                    src={videoSummary.topPerformer.thumbnail}
                    alt={videoSummary.topPerformer.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <a
                    href={videoSummary.topPerformer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Play className="w-8 h-8 text-white fill-white" />
                  </a>
                  <span className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.2 rounded text-[9px] font-mono text-white">
                    {videoSummary.topPerformer.duration}
                  </span>
                </div>

                {/* Title & Creator */}
                <div className="min-w-0 flex-1 space-y-1">
                  <a
                    href={videoSummary.topPerformer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-white hover:text-rose-400 transition-colors line-clamp-2"
                  >
                    {videoSummary.topPerformer.title}
                  </a>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <img
                      src={videoSummary.topPerformer.channelAvatar}
                      alt={videoSummary.topPerformer.channelName}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span className="font-medium text-slate-300">{videoSummary.topPerformer.channelName}</span>
                    <span>•</span>
                    <span>{videoSummary.topPerformer.relativeDate}</span>
                  </div>

                  <div className="flex items-center gap-3 pt-1 text-xs">
                    <span className="text-base font-extrabold text-amber-400">
                      {formatNumberDK(videoSummary.topPerformer.views)} <span className="text-[11px] font-normal text-slate-400">visninger</span>
                    </span>
                    <span className="text-slate-400 flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3 text-slate-500" />
                      {formatCompact(videoSummary.topPerformer.likes)}
                    </span>
                    <span className="text-slate-400 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-slate-500" />
                      {formatCompact(videoSummary.topPerformer.comments)}
                    </span>
                  </div>
                </div>

                {/* Watch Button */}
                <a
                  href={videoSummary.topPerformer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors self-stretch sm:self-auto justify-center"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Se på YouTube</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* THE TOP 10 RANKED LIST */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 px-1 pt-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  Top 10 {activeTab === 'shorts' ? 'Shorts' : activeTab === 'long' ? 'Videoer' : 'Alt'} ({currentVideoList.length} vist)
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">
                  {sortBy === 'views' ? 'Rangeret: Mest populære (#1 til #10)' : 'Rangeret: Seneste uploads (#1 til #10)'}
                </span>
              </div>

              {/* Sort buttons: Mest populære vs. Seneste upload */}
              <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-xs self-start sm:self-auto">
                <button
                  id="sort-btn-views"
                  onClick={() => setSortBy('views')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    sortBy === 'views'
                      ? 'bg-rose-600 text-white font-semibold shadow-sm shadow-rose-900/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Vis de 10 mest populære i denne uge"
                >
                  <Trophy className="w-3 h-3 text-amber-300" />
                  <span>Mest populære (10)</span>
                </button>
                <button
                  id="sort-btn-newest"
                  onClick={() => setSortBy('newest')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    sortBy === 'newest'
                      ? 'bg-rose-600 text-white font-semibold shadow-sm shadow-rose-900/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Vis de 10 seneste uploads i denne uge"
                >
                  <Clock className="w-3 h-3" />
                  <span>Seneste (10)</span>
                </button>
              </div>
            </div>

            {currentVideoList.map((video, idx) => {
              const rank = idx + 1;
              const viewShare = Math.round((video.views / maxViewsInList) * 100);

              // Distinct rank badges
              let rankBadgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
              if (rank === 1) rankBadgeClass = 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-extrabold border-amber-300 shadow-sm shadow-amber-500/20';
              else if (rank === 2) rankBadgeClass = 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 font-extrabold border-slate-100';
              else if (rank === 3) rankBadgeClass = 'bg-gradient-to-br from-amber-700 to-amber-800 text-white font-bold border-amber-600';

              return (
                <div
                  key={video.id}
                  id={`ranked-video-card-${video.id}`}
                  className="p-3 bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl transition-all duration-200 shadow-sm flex flex-col sm:flex-row gap-3 items-start sm:items-center relative group"
                >
                  {/* Left: Rank badge */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs border ${rankBadgeClass}`}
                    >
                      {rank === 1 ? '👑' : rank}
                    </div>

                    {/* Thumbnail preview */}
                    <div className="relative rounded-xl overflow-hidden shrink-0 w-24 sm:w-28 aspect-video bg-slate-950 border border-slate-800">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Play className="w-5 h-5 text-white fill-white" />
                      </a>
                      <span className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.2 rounded text-[8px] font-mono text-white">
                        {video.duration}
                      </span>
                      {video.isShort && (
                        <span className="absolute top-1 left-1 bg-rose-600 text-white font-bold px-1 py-0.2 rounded text-[8px] flex items-center gap-0.5">
                          Shorts
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle: Video Info & Channel */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400 font-medium">
                        {video.isShort ? 'Kort format' : 'Langt format'}
                      </span>
                      {video.isFavorite && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-semibold flex items-center gap-1">
                          <Heart className="w-2.5 h-2.5 fill-rose-400 text-rose-400" />
                          Favorit
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500">•</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {video.relativeDate}
                      </span>
                    </div>

                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs sm:text-sm font-bold text-white hover:text-rose-400 transition-colors line-clamp-1 block"
                      title={video.title}
                    >
                      {video.title}
                    </a>

                    {/* Creator avatar & name */}
                    <div
                      onClick={() => handleOpenChannelFromVideo(video)}
                      className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer hover:text-slate-200 transition-colors w-fit"
                    >
                      <img
                        src={video.channelAvatar}
                        alt={video.channelName}
                        referrerPolicy="no-referrer"
                        className="w-4 h-4 rounded-full object-cover"
                      />
                      <span className="font-medium text-slate-300 truncate max-w-[140px]">{video.channelName}</span>
                      {video.verified && <span className="text-[10px] text-rose-500">✓</span>}
                      <span className="text-slate-600">•</span>
                      <span className="text-[11px] text-slate-400">{formatCompact(video.subscribers)} subs</span>
                    </div>

                    {/* Relative volume progress bar */}
                    <div className="w-full bg-slate-800/80 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div
                        className="bg-rose-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, viewShare)}%` }}
                      />
                    </div>
                  </div>

                  {/* Right: Numbers & External Action */}
                  <div className="flex items-center justify-between sm:justify-end sm:flex-col sm:items-end gap-1.5 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                    <div className="text-left sm:text-right">
                      <div className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                        {formatNumberDK(video.views)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        visninger
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="flex items-center gap-0.5">
                        <ThumbsUp className="w-3 h-3 text-slate-500" />
                        {formatCompact(video.likes)}
                      </span>
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors"
                        title="Åbn video på YouTube"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}

            {currentVideoList.length === 0 && (
              <div className="text-center py-12 px-4 rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 space-y-3">
                <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
                  <Calendar className="w-5 h-5 text-rose-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">
                    Ingen {activeTab === 'shorts' ? 'shorts' : activeTab === 'long' ? 'videoer' : 'udgivelser'} inden for de seneste 7 dage
                  </p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {scope === 'favorites'
                      ? `Dine favoritter har ikke udgivet nye ${activeTab === 'shorts' ? 'shorts' : activeTab === 'long' ? 'videoer' : 'udgivelser'} inden for de seneste 7 dage.`
                      : 'Der er ikke fundet nye udgivelser inden for de seneste 7 dage i denne kategori blandt de scannede kanaler.'}
                  </p>
                  {scope === 'favorites' && (
                    <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                      {activeTab !== 'all' && (
                        <button
                          onClick={() => setActiveTab('all')}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Prøv Top 10 Alt
                        </button>
                      )}
                      <button
                        onClick={() => setScope('all')}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Se alle danske kanaler
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHANNEL BENCHMARK VIEW (Optional 4th Tab) */}
      {!isLoading && activeTab === 'channels' && (
        <div className="space-y-4">
          {/* Sorting metrics */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Sorter kanaler efter:</span>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setBenchmarkMetric('monthlyViews')}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                  benchmarkMetric === 'monthlyViews'
                    ? 'bg-rose-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Månedsvisninger
              </button>
              <button
                onClick={() => setBenchmarkMetric('subscribers')}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                  benchmarkMetric === 'subscribers'
                    ? 'bg-rose-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Abonnenter
              </button>
              <button
                onClick={() => setBenchmarkMetric('growth')}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                  benchmarkMetric === 'growth'
                    ? 'bg-rose-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Vækstrate
              </button>
            </div>
          </div>

          {/* Channels list */}
          <div className="space-y-2">
            {rankedBenchmarkList.map((yt, idx) => {
              const rank = idx + 1;
              let metricVal = yt.monthlyViews;
              let metricLabel = `${formatCompact(yt.monthlyViews)} visninger`;
              if (benchmarkMetric === 'subscribers') {
                metricVal = yt.subscribers;
                metricLabel = `${formatCompact(yt.subscribers)} subs`;
              } else if (benchmarkMetric === 'growth') {
                metricVal = yt.monthlyGrowthPct;
                metricLabel = `+${yt.monthlyGrowthPct}% vækst`;
              }

              const barPct = Math.round((metricVal / maxBenchmarkValue) * 100);

              return (
                <div
                  key={yt.id}
                  onClick={() => onSelectYouTuber(yt)}
                  className="p-3 bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-center text-xs font-bold text-slate-500">
                      #{rank}
                    </span>
                    <img
                      src={yt.avatarUrl}
                      alt={yt.channelName}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-800 group-hover:ring-rose-500/50"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white group-hover:text-rose-400 truncate">
                          {yt.channelName}
                        </span>
                        {yt.verified && <span className="text-xs text-rose-500">✓</span>}
                      </div>
                      <div className="w-28 sm:w-44 bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full"
                          style={{ width: `${Math.max(5, barPct)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-white">{metricLabel}</div>
                    <div className="text-[10px] text-slate-400">{yt.category}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
