import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Heart,
  Check,
  Clock,
  TrendingUp,
  Eye,
  Users,
  Video,
  Award,
  Calendar,
  Sparkles,
  Share2,
  ExternalLink,
  Flame,
  Info,
  Loader2,
  Radio,
} from 'lucide-react';
import { YouTuber } from '../types';
import { formatCompact, formatNumberDK, formatPercent } from '../utils/formatters';
import { getYouTubeChannelDetails } from '../services/youtubeApi';
import { GrowthIndicator } from './GrowthIndicator';
import { MilestoneWidget } from './MilestoneWidget';
import { DailyViewsChart } from './DailyViewsChart';
import { calculateSubscriberMilestone } from '../utils/milestones';

interface YouTuberDetailScreenProps {
  youtuber: YouTuber;
  isFavorite: boolean;
  onToggleFavorite: (youtuber: YouTuber, e: React.MouseEvent) => void;
  onBack: () => void;
}

export const YouTuberDetailScreen: React.FC<YouTuberDetailScreenProps> = ({
  youtuber,
  isFavorite,
  onToggleFavorite,
  onBack,
}) => {
  const [activeYt, setActiveYt] = useState<YouTuber>(youtuber);
  const [selectedDay, setSelectedDay] = useState<string>(
    youtuber.bestPostingTime.day.substring(0, 3)
  );
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLoadingLive, setIsLoadingLive] = useState(false);

  // If this channel has a YouTube Channel ID and lacks recent videos, fetch live details
  useEffect(() => {
    setActiveYt(youtuber);
    setSelectedDay(youtuber.bestPostingTime.day.substring(0, 3));

    if (youtuber.id.startsWith('UC') && youtuber.recentVideos.length === 0) {
      setIsLoadingLive(true);
      getYouTubeChannelDetails(youtuber.id)
        .then((fresh) => {
          if (fresh) {
            setActiveYt((prev) => ({
              ...prev,
              ...fresh,
              // Keep original rank if fresh doesn't have one
              rankPosition: prev.rankPosition || fresh.rankPosition,
            }));
            if (fresh.bestPostingTime?.day) {
              setSelectedDay(fresh.bestPostingTime.day.substring(0, 3));
            }
          }
        })
        .catch((err) => console.warn('Kunne ikke hente live kanal detaljer:', err))
        .finally(() => setIsLoadingLive(false));
    }
  }, [youtuber]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const youtubeUrl = activeYt.handle
    ? `https://www.youtube.com/${activeYt.handle.replace(/^@/, '@')}`
    : `https://www.youtube.com/channel/${activeYt.id}`;

  const currentDayMatrix =
    activeYt.weeklyHeatmap.find(
      (d) => d.day === selectedDay || d.fullDay === selectedDay
    ) || activeYt.weeklyHeatmap[0];

  const milestone = calculateSubscriberMilestone(
    activeYt.subscribers,
    activeYt.monthlySubGain,
    activeYt.monthlyGrowthPct
  );

  return (
    <div id="youtuber-detail-screen" className="space-y-5 pb-28">
      {/* Sticky Top Header */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-2.5 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 flex items-center justify-between">
        <button
          id="btn-detail-back"
          onClick={onBack}
          className="flex items-center gap-1.5 px-2.5 py-1.5 -ml-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 transition-colors text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tilbage</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs transition-colors cursor-pointer"
            title="Del profil"
          >
            {copiedLink ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
          </button>

          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs transition-colors flex items-center"
            title="Åbn på YouTube"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            id="btn-detail-toggle-favorite"
            onClick={(e) => onToggleFavorite(activeYt, e)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isFavorite
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-400' : ''}`} />
            <span>{isFavorite ? 'I Favoritter' : 'Tilføj til favoritter'}</span>
          </button>
        </div>
      </div>

      {/* Profile Banner & Info */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 relative overflow-hidden space-y-4">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <img
              src={activeYt.avatarUrl}
              alt={activeYt.channelName}
              referrerPolicy="no-referrer"
              className="w-18 h-18 rounded-2xl object-cover ring-2 ring-rose-500/40 shadow-lg bg-slate-800"
            />
            {activeYt.rankPosition > 0 && activeYt.rankPosition <= 5 && (
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-slate-950 text-[10px] font-bold text-amber-400 border border-amber-500/40 rounded-md">
                #{activeYt.rankPosition}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-bold text-white truncate">
                {activeYt.channelName}
              </h1>
              {activeYt.verified && (
                <Check className="w-4 h-4 text-rose-400 shrink-0" />
              )}
            </div>
            <p className="text-xs text-slate-400">{activeYt.handle}</p>

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-medium text-slate-300 border border-slate-700/60">
                {activeYt.category}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] text-slate-400">
                Aktiv siden {activeYt.joinedYear}
              </span>
              {activeYt.country && (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] text-rose-400 font-semibold border border-rose-500/20">
                  {activeYt.country}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bio / Description */}
        <p className="text-xs text-slate-300 leading-relaxed pt-1 border-t border-slate-800/80 line-clamp-3">
          {activeYt.bio || 'Ingen kanalbeskrivelse tilgængelig.'}
        </p>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span>
            Primær målgruppe:{' '}
            <strong className="text-slate-200">{activeYt.topAudienceAge}</strong>
          </span>
          <span className="truncate max-w-[180px]">
            Kanal ID:{' '}
            <strong className="text-slate-300 font-mono text-[10px]">
              {activeYt.id}
            </strong>
          </span>
        </div>
      </div>

      {/* Key Stats 2x3 Grid */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between">
          <span>Nøgletal & Kanalstatistik</span>
          {isLoadingLive && (
            <span className="text-[10px] text-rose-400 font-normal flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Opdaterer live data...
            </span>
          )}
        </h2>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Subscribers */}
          <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Abonnenter</span>
              <span className="text-base font-bold text-white">
                {formatCompact(activeYt.subscribers)}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {formatNumberDK(activeYt.subscribers)}
              </span>
            </div>
          </div>

          {/* Total Views */}
          <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Totale visninger</span>
              <span className="text-base font-bold text-white">
                {formatCompact(activeYt.totalViews)}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {formatNumberDK(activeYt.totalViews)}
              </span>
            </div>
          </div>

          {/* Monthly Views */}
          <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] text-slate-400 block">Månedlige visninger</span>
              <span className="text-base font-bold text-white">
                {formatCompact(activeYt.monthlyViews)}
              </span>
              <div className="mt-1">
                <GrowthIndicator
                  growthPct={activeYt.monthlyGrowthPct}
                  monthlyGain={activeYt.monthlySubGain}
                  size="sm"
                  showSubGain={false}
                />
              </div>
            </div>
          </div>

          {/* Video Count */}
          <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Udgivne videoer</span>
              <span className="text-base font-bold text-white">
                {activeYt.videoCount > 0 ? formatNumberDK(activeYt.videoCount) : '-'}
              </span>
              <span className="text-[10px] text-slate-500 block">
                ~{formatCompact(activeYt.avgViewsPerVideo)} pr. video
              </span>
            </div>
          </div>

          {/* Engagement Rate */}
          <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Engagement Rate</span>
              <span className="text-base font-bold text-white">
                {activeYt.engagementRate}%
              </span>
              <span className="text-[10px] text-slate-500 block">Like/view ratio</span>
            </div>
          </div>

          {/* Monthly Sub Gain */}
          <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Nye abonnenter / md</span>
              <span className="text-base font-bold text-emerald-400">
                +{formatCompact(activeYt.monthlySubGain)}
              </span>
              <span className="text-[10px] text-slate-500 block">Estimeret tilgang</span>
            </div>
          </div>
        </div>
      </div>

      {/* Round Subscriber Milestone Section */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Abonnent-milepæl & Mål</span>
          </span>
        </h2>
        <MilestoneWidget milestone={milestone} variant="detailed" />
      </div>

      {/* Daily Views Graph Section (30 days) */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
            <span>Daglige visningsgrafer (30 dage)</span>
          </span>
        </h2>
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm">
          <DailyViewsChart channel={activeYt} showTotalsOnRight timeRange="30" />
        </div>
      </div>

      {/* Highlight Card: Optimal Posting Time & Heatmap */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Bedste upload-tidspunkter (Statistik)</span>
          </h2>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">
                Optimalt upload-vindue
              </span>
              <p className="text-base font-bold text-white mt-0.5">
                {activeYt.bestPostingTime.day} kl. {activeYt.bestPostingTime.hours}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Effektivitetsscore</span>
              <span className="text-sm font-black text-amber-300">
                {activeYt.bestPostingTime.score} / 100
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            {activeYt.bestPostingTime.recommendation}
          </p>

          {/* Interactive Weekly Heatmap Matrix */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Seeraktivitet i løbet af ugen:</span>
              <span className="text-[10px] text-slate-500">Mørkere = Højere aktivitet</span>
            </div>

            {/* Day Selector Buttons */}
            <div className="grid grid-cols-7 gap-1">
              {activeYt.weeklyHeatmap.map((item) => {
                const isSelected = item.day === selectedDay;
                const isTopDay = item.fullDay === activeYt.bestPostingTime.day;
                return (
                  <button
                    key={item.day}
                    onClick={() => setSelectedDay(item.day)}
                    className={`py-1.5 rounded-lg text-center transition-all text-xs font-semibold cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 text-white shadow-sm'
                        : isTopDay
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    <div>{item.day}</div>
                    {isTopDay && (
                      <span className="w-1 h-1 bg-amber-400 rounded-full mx-auto mt-0.5 block" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Day Hourly Heatmap breakdown */}
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">
                  {currentDayMatrix.fullDay} – tidsintervaller
                </span>
                {currentDayMatrix.fullDay === activeYt.bestPostingTime.day && (
                  <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Anbefalet dag
                  </span>
                )}
              </div>

              <div className="grid grid-cols-6 gap-1.5 pt-1">
                {currentDayMatrix.slots.map((slot) => {
                  const isPeak = slot.score >= 85;
                  return (
                    <div
                      key={slot.time}
                      className={`p-2 rounded-lg text-center transition-all ${
                        isPeak
                          ? 'bg-rose-600/30 border border-rose-500/60 text-white font-bold'
                          : slot.score >= 50
                          ? 'bg-slate-800/80 border border-slate-700 text-slate-200'
                          : 'bg-slate-900/60 border border-slate-800/60 text-slate-400'
                      }`}
                    >
                      <span className="text-[10px] block opacity-80">{slot.time}</span>
                      <span className="text-xs font-bold block mt-0.5">
                        {slot.score}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top / Recent Videos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-rose-500" />
            <span>Top videoer & Seneste udgivelser</span>
          </h2>
          <span className="text-[10px] text-slate-500">
            {activeYt.recentVideos.length} fremhævede
          </span>
        </div>

        {isLoadingLive && activeYt.recentVideos.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-rose-500 mx-auto" />
            <p className="text-xs text-slate-400">
              Henter seneste videoer fra YouTube...
            </p>
          </div>
        ) : activeYt.recentVideos.length > 0 ? (
          <div className="space-y-2">
            {activeYt.recentVideos.map((video) => (
              <a
                key={video.id}
                href={`https://www.youtube.com/watch?v=${video.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-3 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-700 transition-colors block"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-semibold text-white leading-snug line-clamp-2 group-hover:text-rose-400 transition-colors">
                    {video.title}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-slate-300 font-medium">
                      <Eye className="w-3 h-3 text-slate-400" />
                      {formatNumberDK(video.views)} visninger
                    </span>
                    <span>•</span>
                    <span>{video.uploadDate}</span>
                    {video.likes > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-rose-400 font-medium">
                          {formatNumberDK(video.likes)} likes
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono text-slate-400 px-2 py-1 bg-slate-800 rounded-md">
                    {video.duration}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 transition-colors" />
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-400">
            Ingen nylige videoer kunne hentes direkte for denne kanal.
          </div>
        )}
      </div>
    </div>
  );
};
