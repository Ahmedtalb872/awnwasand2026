import { Play, Calendar, Clock } from 'lucide-react';
import { useState } from 'react';

interface VideoCardProps {
    title: string;
    date: string;
    duration: string;
    thumbnail: string;
    videoId: string;
}

export const VideoCard = ({ title, date, duration, thumbnail, videoId }: VideoCardProps) => {
    const [isPlaying, setIsPlaying] = useState(false);

    return (
        <div className="card group h-full flex flex-col">
            <div className="relative aspect-video overflow-hidden bg-slate-900">
                {!isPlaying ? (
                    <>
                        <img
                            src={thumbnail}
                            alt={title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                            <button
                                onClick={() => setIsPlaying(true)}
                                className="w-16 h-16 flex items-center justify-center rounded-full bg-primary/90 text-white shadow-lg transform group-hover:scale-110 transition-all duration-300 hover:bg-primary"
                            >
                                <Play className="w-8 h-8 fill-current ml-1" />
                            </button>
                        </div>
                        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 text-white text-xs rounded-md flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{duration}</span>
                        </div>
                    </>
                ) : (
                    <iframe
                        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                        title={title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                )}
            </div>

            <div className="p-5 flex flex-col flex-grow">
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-3">
                    <Calendar className="w-4 h-4" />
                    <span>{date}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-snug mb-2 group-hover:text-secondary-dark dark:group-hover:text-secondary transition-colors">
                    {title}
                </h3>
            </div>
        </div>
    );
};
