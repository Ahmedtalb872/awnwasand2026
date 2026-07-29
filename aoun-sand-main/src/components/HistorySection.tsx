import { Download, FileText } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const HistorySection = () => {
    const { language } = useLanguage();

    return (
        <section className="py-20 bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            <div className="container-custom">
                <div className="max-w-4xl mx-auto">
                    {/* Section Header */}
                    <div className="text-center mb-10 animate-fadeIn">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
                            {language === 'ar' ? 'السجل التاريخي لجمعية عون وسند الخيرية 2025' : 'Aoun & Sand Charity History Record 2025'}
                        </h2>
                        <div className="w-24 h-1 bg-gradient-to-r from-teal-500 to-cyan-500 mx-auto rounded-full"></div>
                    </div>

                    {/* PDF Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700 animate-slideUp">
                        {/* Toolbar */}
                        <div className="bg-slate-100 dark:bg-slate-700/50 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                                <span className="font-semibold text-sm sm:text-base">
                                    {language === 'ar' ? 'معاينة الملف' : 'File Preview'}
                                </span>
                            </div>
                            <a
                                href="https://drive.google.com/uc?export=download&id=1LhPblWphMzL7BRp2Gr4_RQEZ1FOHFzqn"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors shadow-md hover:shadow-lg"
                            >
                                <Download className="w-4 h-4" />
                                <span>{language === 'ar' ? 'تحميل' : 'Download'}</span>
                            </a>
                        </div>

                        {/* Iframe View */}
                        <div className="relative w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[16/10] bg-slate-200 dark:bg-slate-900">
                            <iframe
                                src="https://drive.google.com/file/d/1LhPblWphMzL7BRp2Gr4_RQEZ1FOHFzqn/preview"
                                className="absolute inset-0 w-full h-full border-0"
                                allow="autoplay"
                                title="History Record 2025"
                            />
                        </div>

                       
                    </div>
                </div>
            </div>
        </section>
    );
};
