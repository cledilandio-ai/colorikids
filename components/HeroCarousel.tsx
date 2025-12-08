"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Instagram, PlayCircle } from "lucide-react";
import { Highlight } from "@/context/SettingsContext";

interface HeroCarouselProps {
    images: (string | Highlight)[];
}

export function HeroCarousel({ images }: HeroCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Normalize images to Highlight format
    const normalizedImages: Highlight[] = images.map(img => {
        if (typeof img === 'string') return { url: img };
        return img;
    });

    useEffect(() => {
        if (normalizedImages.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % normalizedImages.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [normalizedImages.length]);

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % normalizedImages.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + normalizedImages.length) % normalizedImages.length);
    };

    if (normalizedImages.length === 0) return null;

    const currentImage = normalizedImages[currentIndex];
    // Check if current image has an instagram link to decide whether to show overlay elements
    const hasLink = !!currentImage.instagramLink;

    return (
        <div className="relative w-full md:h-[500px] h-[300px] overflow-hidden group">
            {normalizedImages.map((item, index) => {
                const isActive = index === currentIndex;
                const showOverlay = item.instagramLink;

                const Content = () => (
                    <>
                        <img
                            src={item.url}
                            alt={`Slide ${index + 1}`}
                            className="h-full w-full object-cover"
                        />
                        {/* Overlay CTA for Instagram Link */}
                        {showOverlay && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors hover:bg-black/20">
                                <div className={`flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-lg backdrop-blur-sm transition-all transform ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                                    } duration-700 delay-300`}>
                                    <Instagram className="h-5 w-5 text-pink-600" />
                                    <span className="text-sm font-semibold text-gray-800">Veja no Instagram</span>
                                </div>
                            </div>
                        )}
                    </>
                );

                return (
                    <div
                        key={index}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isActive ? "opacity-100 z-10" : "opacity-0 z-0"
                            }`}
                    >
                        {item.instagramLink ? (
                            <a
                                href={item.instagramLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block h-full w-full cursor-pointer relative"
                            >
                                <Content />
                            </a>
                        ) : (
                            <div className="h-full w-full relative">
                                <Content />
                            </div>
                        )}
                    </div>
                );
            })}

            {normalizedImages.length > 1 && (
                <>
                    {/* Navigation Buttons - Z-index higher than slides */}
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            prevSlide();
                        }}
                        className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white opacity-0 transition-opacity hover:bg-black/50 group-hover:opacity-100"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            nextSlide();
                        }}
                        className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white opacity-0 transition-opacity hover:bg-black/50 group-hover:opacity-100"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>

                    <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
                        {normalizedImages.map((_, index) => (
                            <button
                                key={index}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setCurrentIndex(index);
                                }}
                                className={`h-2 w-2 rounded-full transition-all ${index === currentIndex ? "bg-white w-4" : "bg-white/50"
                                    }`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
