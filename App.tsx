
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchCityBudget } from './services/geminiService';
import { BudgetResponse, City } from './types';
import SankeyChart from './components/SankeyChart';
import BudgetComparisonChart from './components/BudgetComparisonChart';
import { 
  ChartBarIcon, 
  ArrowPathIcon, 
  InformationCircleIcon,
  GlobeAltIcon,
  MapIcon,
  DocumentTextIcon,
  BuildingOffice2Icon,
  ExclamationTriangleIcon,
  ClockIcon,
  BanknotesIcon,
  PresentationChartBarIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';

const CACHE_KEY = 'tokyo_23_budget_cache_v2';

// Utility to format "Thousand Yen" to natural Japanese units
export const formatJapaneseCurrency = (kYen: number) => {
  if (kYen >= 100000) {
    return `${(kYen / 100000).toFixed(2)} 億円`;
  }
  return `${(kYen / 10).toLocaleString()} 万円`;
};

const App: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState<City>('世田谷区');
  const [viewMode, setViewMode] = useState<'flow' | 'compare'>('flow');
  const [cache, setCache] = useState<Partial<Record<City, BudgetResponse & { timestamp: number }>>>(() => {
    try {
      const saved = localStorage.getItem(CACHE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<{message: string, isQuota: boolean} | null>(null);

  const budgetInfo = cache[selectedCity] || null;

  const totalBudget = useMemo(() => {
    if (!budgetInfo?.data.links) return 0;
    return budgetInfo.data.links
      .filter(link => link.source.startsWith('rev_'))
      .reduce((sum, link) => sum + link.value, 0);
  }, [budgetInfo]);

  useEffect(() => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  }, [cache]);

  const loadData = useCallback(async (city: City, force: boolean = false) => {
    if (!force && cache[city]) {
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchCityBudget(city);
      setCache(prev => ({ 
        ...prev, 
        [city]: { ...result, timestamp: Date.now() } 
      }));
    } catch (err: any) {
      console.error(err);
      const isQuota = err.message?.includes('429') || err.message?.includes('quota');
      setError({
        message: isQuota 
          ? "APIの利用制限に達しました。無料枠の上限を超えたため、数分待ってから再度お試しください。" 
          : `${city}のデータ取得中にエラーが発生しました。時間を置いて再度お試しください。`,
        isQuota
      });
    } finally {
      setLoading(false);
    }
  }, [cache]);

  useEffect(() => {
    loadData(selectedCity);
  }, [selectedCity, loadData]);

  const handleCityChange = (city: City) => {
    if (city !== selectedCity) {
      setSelectedCity(city);
      if (viewMode === 'compare') setViewMode('flow');
    }
  };

  const handleRefresh = () => {
    loadData(selectedCity, true);
  };

  const cities: City[] = [
    '千代田区', '中央区', '港区', '新宿区', '文京区', '台東区', '墨田区', '江東区', 
    '品川区', '目黒区', '大田区', '世田谷区', '渋谷区', '中野区', '杉並区', '豊島区', 
    '北区', '荒川区', '板橋区', '練馬区', '足立区', '葛飾区', '江戸川区'
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="bg-slate-900 text-white shadow-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-slate-800 rounded-lg">
                <MapIcon className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                  東京23区 観光予算 <span className="text-emerald-400">ビジュアライザー</span>
                </h1>
                <p className="text-slate-400 text-xs sm:text-sm font-medium opacity-90">自治体別・詳細事業フロー解析</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  onClick={() => setViewMode('flow')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'flow' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ArrowsRightLeftIcon className="w-4 h-4" />
                  予算フロー
                </button>
                <button
                  onClick={() => setViewMode('compare')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'compare' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <PresentationChartBarIcon className="w-4 h-4" />
                  23区比較
                </button>
              </div>

              <div className="h-8 w-px bg-slate-700 hidden sm:block"></div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap bg-slate-800 p-1 rounded-xl border border-slate-700 shadow-inner max-w-[300px] sm:max-w-md overflow-x-auto no-scrollbar scroll-smooth">
                  {cities.map((city) => (
                    <button
                      key={city}
                      disabled={loading}
                      onClick={() => handleCityChange(city)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                        selectedCity === city 
                          ? 'bg-slate-100 text-slate-900 shadow-md' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={handleRefresh}
                  disabled={loading}
                  className={`p-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 rounded-xl transition-all border border-emerald-500/30 flex items-center gap-2 px-3 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="text-xs font-bold hidden sm:inline">更新</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 mt-8">
        {error?.isQuota && (
          <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-sm animate-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800">APIアクセス制限（429 Quota Exceeded）</p>
                <p className="text-xs text-amber-700 mt-1">リクエストが集中したため一時的に制限されています。すでに取得済みの区（キャッシュ）は表示可能です。</p>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'compare' ? (
          <div className="space-y-8">
            <BudgetComparisonChart cache={cache} cities={cities} />
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center animate-in fade-in duration-500">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <BuildingOffice2Icon className="w-6 h-6 text-emerald-600/50 animate-bounce" />
              </div>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-700">{selectedCity}の最新予算を解析中</p>
              <p className="text-slate-500 mt-2">ウェブ上の公開資料から詳細な細目を抽出しています...</p>
            </div>
          </div>
        ) : error && !budgetInfo ? (
          <div className="max-w-2xl mx-auto bg-white border border-red-100 p-8 rounded-3xl text-center shadow-2xl animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <InformationCircleIcon className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">読み込みエラー</h2>
            <p className="text-slate-500 mb-8">{error.message}</p>
            <button 
              onClick={handleRefresh}
              className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transform transition hover:-translate-y-1 shadow-lg"
            >
              再試行
            </button>
          </div>
        ) : budgetInfo ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2">
                <BuildingOffice2Icon className="w-4 h-4" />
                <span>表示中: {selectedCity}</span>
              </div>
              <div className="px-3 py-1 bg-slate-50 text-slate-600 rounded-lg flex items-center gap-2 text-xs">
                <ClockIcon className="w-4 h-4 text-slate-400" />
                <span>最終更新: {new Date(budgetInfo.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-4 ml-auto overflow-x-auto whitespace-nowrap scroll-smooth">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-300"></div> 財源層</span>
                <span className="text-slate-300">→</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-300"></div> 費目層</span>
                <span className="text-slate-300">→</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-300"></div> 事業層</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 rounded-2xl">
                    <ChartBarIcon className="w-7 h-7 text-emerald-700" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 leading-tight">{selectedCity} 観光予算フロー</h2>
                    <p className="text-slate-500 text-sm font-medium">財源から各事業への資金配分</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="bg-white border border-slate-200 px-5 py-3 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="p-1.5 bg-emerald-50 rounded-lg">
                      <BanknotesIcon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">予算総額（抽出分）</p>
                      <p className="text-xl font-black text-slate-900 leading-none">
                        {formatJapaneseCurrency(totalBudget)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <SankeyChart 
                data={budgetInfo.data} 
                city={selectedCity}
                width={Math.max(window.innerWidth * 0.9, 1200)} 
                height={850} 
              />
              
              <div className="px-6 py-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-400 italic leading-relaxed text-center">
                  ※図の上にマウスを重ねると数値を保存するボタンが表示されます。
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-lg border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-50 rounded-xl">
                    <DocumentTextIcon className="w-7 h-7 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">AIによる{selectedCity}予算分析</h2>
                </div>
                <div className="prose prose-emerald max-w-none">
                  <div className="text-slate-600 whitespace-pre-line leading-loose text-lg font-medium">
                    {budgetInfo.explanation}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-200">
                  <div className="flex items-center gap-2 mb-4">
                    <GlobeAltIcon className="w-6 h-6 text-emerald-600" />
                    <h2 className="text-lg font-bold text-slate-800">参照資料</h2>
                  </div>
                  <ul className="space-y-3">
                    {budgetInfo.sources.map((source, idx) => (
                      <li key={idx}>
                        <a 
                          href={source.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="group block p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-100"
                        >
                          <p className="text-sm text-slate-700 font-bold group-hover:text-emerald-700 line-clamp-2 leading-snug">
                            {source.title || `${selectedCity} 予算資料`}
                          </p>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-xl mx-auto py-24 bg-white rounded-[3rem] border-4 border-dashed border-slate-200 text-center animate-pulse">
            <InformationCircleIcon className="w-16 h-16 text-slate-200 mx-auto mb-6" />
            <h3 className="text-xl font-bold text-slate-400">データを読み込んでいます...</h3>
          </div>
        )}
      </main>

      <footer className="mt-24 py-12 bg-white border-t border-slate-100">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MapIcon className="w-5 h-5 text-emerald-600" />
            <span className="font-black text-slate-800 tracking-tight uppercase tracking-widest">23-City Budget Explorer</span>
          </div>
          <p className="text-slate-500 text-sm">
            本システムはGoogle Gemini APIのグラウンディング機能を利用して各区の公開資料をリアルタイムで解析・生成しています。
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
