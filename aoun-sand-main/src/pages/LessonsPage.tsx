import { useState } from 'react';
import { VideoCard } from '../components/VideoCard';
import { useLanguage } from '../contexts/LanguageContext';
import { Search, SortAsc, SortDesc, Filter } from 'lucide-react';

const LESSONS_DATA = [
    {
        id: '1',
        title: 'شرح الأخضري – باب العقيدة – الدرس الأول',
        date: '2024-01-01',
        duration: 'Lesson 1',
        thumbnail: 'https://img.youtube.com/vi/c5xNbaDpVgI/maxresdefault.jpg',
        videoId: 'c5xNbaDpVgI'
    },
    {
        id: '2',
        title: 'شرح الأربعون النووية – الدرس الأول',
        date: '2024-01-02',
        duration: 'Lesson 1',
        thumbnail: 'https://img.youtube.com/vi/ZViZByx12iY/maxresdefault.jpg',
        videoId: 'ZViZByx12iY'
    },
    {
        id: '3',
        title: 'شرح الأربعون النووية',
        date: '2024-01-03',
        duration: 'Lesson 2',
        thumbnail: 'https://img.youtube.com/vi/KznMI6sOWyE/maxresdefault.jpg', // Assuming high res might not exist for some, but typically works
        videoId: 'KznMI6sOWyE'
    },
    {
        id: '4',
        title: 'سلسلة التأملات المحجة البيضاء مع البدوي محمدو ديدي',
        date: '2024-01-04',
        duration: 'Special',
        thumbnail: 'https://img.youtube.com/vi/-9FMkS2vSsw/maxresdefault.jpg',
        videoId: '-9FMkS2vSsw'
    },
    {
        id: '5',
        title: 'مع القرأن القارئ محمد سالم ولد زين',
        date: '2024-01-05',
        duration: 'Special',
        thumbnail: 'https://img.youtube.com/vi/qpEf5QQZuXc/maxresdefault.jpg',
        videoId: 'qpEf5QQZuXc'
    },
    {
        id: '6',
        title: 'شرح الاخضري الدري الثالث',
        date: '2024-01-06',
        duration: 'Lesson 3',
        thumbnail: 'https://img.youtube.com/vi/srttIid_rpY/maxresdefault.jpg',
        videoId: 'srttIid_rpY'
    }
];

export const LessonsPage = () => {
    const { language } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

    const filteredVideos = LESSONS_DATA.filter(video =>
        video.title.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return (
        <div className="min-h-screen pt-24 pb-16 bg-slate-50 dark:bg-slate-900">
            <div className="container-custom">
                {/* Header Section */}
                <div className="text-center mb-12 animate-fadeIn">
                    <h1 className="section-title mb-4">
                        {language === 'ar' ? 'المحجة البيضاء' : 'Al-Mahajja Al-Baydaa'}
                    </h1>
                    <p className="section-subtitle">
                        {language === 'ar'
                            ? 'سلسلة دروس علمية وتربوية تهدف إلى نشر الوعي الديني وتزكية النفوس'
                            : 'A series of educational and spiritual lessons aimed at spreading religious awareness and self-purification'}
                    </p>
                </div>

                {/* Controls Section */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-center justify-between animate-slideUp">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder={language === 'ar' ? 'ابحث عن درس...' : 'Search for a lesson...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field pr-10"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
                            <Filter className="w-4 h-4" />
                            <span>{language === 'ar' ? 'ترتيب حسب:' : 'Sort by:'}</span>
                        </div>
                        <button
                            onClick={() => setSortOrder('newest')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${sortOrder === 'newest'
                                ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                }`}
                        >
                            <SortDesc className="w-4 h-4" />
                            {language === 'ar' ? 'الأحدث' : 'Newest'}
                        </button>
                        <button
                            onClick={() => setSortOrder('oldest')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${sortOrder === 'oldest'
                                ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                }`}
                        >
                            <SortAsc className="w-4 h-4" />
                            {language === 'ar' ? 'الأقدم' : 'Oldest'}
                        </button>
                    </div>
                </div>

                {/* Videos Grid */}
                {filteredVideos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slideUp animation-delay-200">
                        {filteredVideos.map((video) => (
                            <VideoCard
                                key={video.id}
                                {...video}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-slate-500 animate-fadeIn">
                        <p className="text-lg">
                            {language === 'ar' ? 'لا توجد دروس مطابقة للبحث' : 'No lessons found matching your search'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
