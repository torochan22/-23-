
import React, { useState, useEffect, useCallback } from 'react';
import { fetchCityBudget } from './services/geminiService';
import { BudgetResponse, City } from './types';
import SankeyChart from './components/SankeyChart';
import { 
  ChartBarIcon, 
  ArrowPathIcon, 
  InformationCircleIcon,
  GlobeAltIcon,
  MapIcon,
  DocumentTextIcon,
  BuildingOffice2Icon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const App: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState<City>('世田谷区');
  const [cache, setCache] = useState<Partial<Record<City, BudgetResponse>>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const budgetInfo = cache[selectedCity] || null;

  const loadData = useCallback(async (city: City, force: boolean = false) => {
    if (!force && cache[city]) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchCityBudget(city);
      setCache(prev => ({ ...prev, [city]: result }));
    } catch (err) {
      console.error(err);
      setError(`${city}のデータ取得中にエラーが発生しました。時間を置いて再度お試しください。`);
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
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
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

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap bg-slate-800 p-1 rounded-xl border border-slate-700 shadow-inner max-w-full overflow-x-auto no-scrollbar scroll-smooth">
                {cities.map((city) => (
                  <button
                    key={city}
                    onClick={() => handleCityChange(city)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      selectedCity === city 
                        ? 'bg-emerald-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
              <button 
                onClick={handleRefresh}
                disabled={loading}
                className={`p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all border border-slate-700 flex items-center gap-2 px-3 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="最新のデータを取得"
              >
                <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-xs font-bold hidden sm:inline">更新</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 mt-8">
        {loading ? (
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
            <p className="text-slate-500 mb-8">{error}</p>
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
              <div className="flex items-center gap-4 ml-auto overflow-x-auto whitespace-nowrap scroll-smooth">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-300"></div> 財源層</span>
                <span className="text-slate-300">→</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-300"></div> 費目層</span>
                <span className="text-slate-300">→</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-300"></div> 事業層</span>
              </div>
            </div>

            <div className="bg-white p-2 sm:p-4 rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <ChartBarIcon className="w-6 h-6 text-emerald-600" />
                  <h2 className="text-lg font-bold text-slate-800">{selectedCity} 観光予算フロー</h2>
                </div>
                <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100 flex items-center gap-2">
                  <span>単位: 千円</span>
                  <div className="w-1 h-1 bg-emerald-300 rounded-full"></div>
                  <span className="text-[10px] opacity-70">最終更新: {new Date().toLocaleTimeString()}</span>
                </div>
              </div>
              
              <div className="relative overflow-x-auto pb-4">
                <SankeyChart 
                  data={budgetInfo.data} 
                  width={Math.max(window.innerWidth * 0.9, 1200)} 
                  height={850} 
                />
              </div>
              <div className="bg-slate-50 p-6 rounded-b-xl border-t border-slate-100">
                <p className="text-xs text-slate-400 italic leading-relaxed text-center">
                  ※この図は{selectedCity}の最新予算資料に基づき、AIが事業単位で細分化したものです。データはキャッシュされ、ブラウザを閉じるまで保持されます。
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
                          <div className="mt-1 text-[10px] text-slate-400 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                            {source.uri}
                          </div>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-[2rem] text-white shadow-xl">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span>💡</span> {selectedCity}の特色
                  </h3>
                  <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
                    {selectedCity === '千代田区' && <p><strong>都心の中の歴史:</strong> 皇居周辺、神田明神、秋葉原など、日本の象徴から最新文化まで幅広い観光資源を有し、歴史的建造物の活用に特色があります。</p>}
                    {selectedCity === '中央区' && <p><strong>伝統と最新の融合:</strong> 銀座、日本橋、築地といった世界的な観光地を抱え、ウォーターフロントの活性化や伝統文化の振興に力を入れています。</p>}
                    {selectedCity === '港区' && <p><strong>国際都市・アーバン観光:</strong> 東京タワー、お台場、六本木など主要スポットが多く、ナイトタイムエコノミー推進やMICE誘致が大きな柱です。</p>}
                    {selectedCity === '新宿区' && <p><strong>多文化・メガシティ:</strong> 歌舞伎町の安全性向上と観光化、新宿御苑との連携、多様な文化が共生する国際観光都市としての整備を進めています。</p>}
                    {selectedCity === '文京区' && <p><strong>文教・歴史庭園:</strong> 六義園や後楽園などの名園、文豪ゆかりの地を巡る文化観光、東京ドーム周辺の集客連携が中心です。</p>}
                    {selectedCity === '台東区' && <p><strong>国際観光の最前線:</strong> 浅草・上野という圧倒的な集客力を持ち、インバウンド環境整備や伝統工芸支援に非常に大きな予算を割いています。</p>}
                    {selectedCity === '墨田区' && <p><strong>新旧ランドマーク:</strong> 東京スカイツリーと北斎、江戸文化の融合。隅田川花火大会など伝統イベントへの支援も重要です。</p>}
                    {selectedCity === '江東区' && <p><strong>臨海部・深川文化:</strong> 豊洲・有明の最新スポットと深川の歴史文化が共存。現代美術館との連携や水辺観光も盛んです。</p>}
                    {selectedCity === '品川区' && <p><strong>水辺と歴史:</strong> 品川宿の歴史整備や天王洲・目黒川の水辺活用、しながわ水族館のリニューアルが主な施策です。</p>}
                    {selectedCity === '目黒区' && <p><strong>洗練された水辺:</strong> 目黒川の桜を中心とした観光や、自由が丘・中目黒エリアの街歩き、美術館連携を推進しています。</p>}
                    {selectedCity === '大田区' && <p><strong>玄関口と技術:</strong> 羽田空港を核とした国際交流や、町工場の技術を観光資源化するオープンファクトリーが独自の強みです。</p>}
                    {selectedCity === '世田谷区' && <p><strong>自然と文化の共生:</strong> 等々力渓谷や世田谷線周辺の観光、デジタルスタンプラリーなど、住みやすさと観光の調和を目指しています。</p>}
                    {selectedCity === '渋谷区' && <p><strong>カルチャー発信:</strong> ハチ公周辺やスクランブル交差点に加え、クリエイティブ産業やスタートアップと融合した次世代観光を模索しています。</p>}
                    {selectedCity === '中野区' && <p><strong>サブカルの聖地:</strong> 中野ブロードウェイを中心としたサブカルチャー観光や、哲学堂公園の整備、地域文化の振興に特色があります。</p>}
                    {selectedCity === '杉並区' && <p><strong>文化・芸術の街:</strong> 高円寺の阿波踊りやジャズ、アニメーション産業など、独自の文化資源を活かした観光振興が盛んです。</p>}
                    {selectedCity === '豊島区' && <p><strong>マンガと伝統:</strong> 池袋の国際アート・カルチャー都市構想や、巣鴨のとげぬき地蔵など、新旧の文化が共存する観光地です。</p>}
                    {selectedCity === '北区' && <p><strong>渋沢栄一とレトロ:</strong> 渋沢栄一ゆかりの飛鳥山、都電、赤羽のレトロな飲み屋街など、独特の歴史・レトロ資源を活用しています。</p>}
                    {selectedCity === '荒川区' && <p><strong>下町のぬくもり:</strong> 都電荒川線沿線の振興や、あらかわ遊園、伝統工芸の保存・観光化に注力しています。</p>}
                    {selectedCity === '板橋区' && <p><strong>地域の誇り:</strong> 加賀藩屋敷跡の歴史活用や、都内屈指の商店街活性化、舟渡エリアの水辺活用などを進めています。</p>}
                    {selectedCity === '練馬区' && <p><strong>アニメとみどり:</strong> アニメ発祥の地としての振興や、新施設「スタジオツアー東京」との連携、都内屈指の緑地を活かした観光が特徴です。</p>}
                    {selectedCity === '足立区' && <p><strong>歴史と自然の調和:</strong> 西新井大師や千住の歴史、広大な都立公園を活かした観光・スポーツ振興に取り組んでいます。</p>}
                    {selectedCity === '葛飾区' && <p><strong>寅さんと水辺:</strong> 柴又帝釈天の景観保存や、亀有・寅さん関連の聖地観光、水元公園の自然を活かした観光が柱です。</p>}
                    {selectedCity === '江戸川区' && <p><strong>親水とスポーツ:</strong> 葛西臨海公園の活性化、特産の金魚や花火大会、カヌーなどのスポーツツーリズムに力を入れています。</p>}
                  </div>
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
