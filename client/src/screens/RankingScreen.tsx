import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { Trophy, Home, Timer, Star } from 'lucide-react';

interface Record {
  student_name: string;
  table_number: number;
  score: number;
  total_time_ms: number;
}

const dummyRanking: Record[] = [
  { student_name: '구구단박사', table_number: 9, score: 100, total_time_ms: 8500 },
  { student_name: '바나나친구', table_number: 2, score: 100, total_time_ms: 12000 },
  { student_name: '척척박사', table_number: 5, score: 88, total_time_ms: 15000 },
];

export default function RankingScreen() {
  const { setScreen } = useStore();
  const [ranking, setRanking] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'all' | number>('all');

  useEffect(() => {
    const fetchRanking = async () => {
      setLoading(true);
      const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const apiUrl = rawApiUrl.replace(/\/$/, '');
      try {
        const url = selectedTab === 'all' 
          ? `${apiUrl}/api/ranking` 
          : `${apiUrl}/api/ranking?table=${selectedTab}`;
        const res = await fetch(url);
        const data = await res.json();
        const filteredDummy = selectedTab === 'all' 
          ? dummyRanking 
          : dummyRanking.filter(r => r.table_number === selectedTab);

        if (data && data.length > 0) {
          setRanking(data);
        } else {
          setRanking(filteredDummy);
        }
      } catch (error) {
        console.error('Failed to fetch ranking:', error);
        const filteredDummy = selectedTab === 'all' 
          ? dummyRanking 
          : dummyRanking.filter(r => r.table_number === selectedTab);
        setRanking(filteredDummy);
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, [selectedTab]);

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-50 p-4">
      <div className="w-full max-w-2xl mt-8 bg-white p-8 rounded-3xl shadow-xl border-4 border-amber-100">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Trophy className="text-amber-500" size={40} />
            <h1 className="text-4xl font-black text-slate-800">명예의 전당</h1>
          </div>
          <button
            onClick={() => setScreen('home')}
            className="p-3 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
          >
            <Home size={24} />
          </button>
        </div>

        {/* 탭 메뉴 */}
        <div className="flex overflow-x-auto gap-2 mb-6 pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedTab('all')}
            className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-colors ${
              selectedTab === 'all' ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            전체 랭킹
          </button>
          {[2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => setSelectedTab(num)}
              className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-colors ${
                selectedTab === num ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {num}단
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 font-bold animate-pulse">
            랭킹을 불러오고 있어요...
          </div>
        ) : (
          <div className="space-y-4">
            {ranking.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-bold">
                아직 이 단의 랭킹 기록이 없습니다. 제일 먼저 도전해 보세요! 🏃
              </div>
            ) : (
              ranking.map((res, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all hover:scale-[1.01] ${
                    idx === 0 ? 'bg-amber-50 border-amber-200 shadow-md' : 'bg-white border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 flex items-center justify-center rounded-full font-black text-xl ${
                      idx === 0 ? 'bg-amber-400 text-white' : 
                      idx === 1 ? 'bg-slate-300 text-white' :
                      idx === 2 ? 'bg-orange-300 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        {res.student_name}
                        {idx === 0 && <Star size={16} fill="currentColor" className="text-amber-500" />}
                      </div>
                      <div className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-md">
                        {res.table_number}단
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-black text-blue-600">{res.score}점</div>
                    <div className="flex items-center justify-end gap-1 text-slate-400 text-sm font-mono">
                      <Timer size={14} />
                      {(res.total_time_ms / 1000).toFixed(2)}초
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        <p className="mt-8 text-center text-slate-400 text-sm font-medium">
          * 점수가 높고 시간이 짧은 순서대로 보여집니다!
        </p>
      </div>
    </div>
  );
}
